from __future__ import annotations

"""
Model-sensitivity attribution for uploaded PCAPs.

This module performs leave-one-flow-out sensitivity analysis against the
frozen CTU13 temporal risk world model.

For each selected directional flow:

1. Remove all packets belonging to that exact directional flow.
2. Rebuild the PCAP on the ORIGINAL temporal grid.
3. Preserve empty 30-second states created by the removal.
4. Rebuild the same 12 model features.
5. Re-run the frozen world model.
6. Compare the latest raw T+1/T+2/T+3 logits and probabilities.

IMPORTANT:
This is model perturbation sensitivity.

It is NOT:
- causal attribution
- SHAP
- a maliciousness probability
- a trained packet-level classifier

The model weights and training artifacts are never modified.
"""

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import numpy as np

from backend.ml.pcap_adapter import prepare_uploaded_pcap
from backend.ml.inference import FEATURE_NAMES, SEQUENCE_LENGTH
from world_model.ctu13_risk_inference import predict_world_model_batch


METHOD = "leave_one_flow_out_model_sensitivity"
WINDOW_SECONDS = 30.0
HORIZONS = ("T+1", "T+2", "T+3")


def _safe_float(
    value: Any,
    default: float = 0.0,
) -> float:
    """
    Convert a value to a finite float safely.
    """
    try:
        converted = float(value)

        if np.isfinite(converted):
            return converted

    except (TypeError, ValueError):
        pass

    return default


def _load_scapy() -> dict[str, Any]:
    """
    Load the Scapy objects used by the attribution pipeline.
    """
    try:
        from scapy.all import (
            IP,
            IPv6,
            TCP,
            UDP,
            PcapReader,
            PcapWriter,
        )

    except ImportError as exc:
        raise RuntimeError(
            "PCAP model-sensitivity attribution requires Scapy. "
            "Install it with: pip install scapy"
        ) from exc

    return {
        "IP": IP,
        "IPv6": IPv6,
        "TCP": TCP,
        "UDP": UDP,
        "PcapReader": PcapReader,
        "PcapWriter": PcapWriter,
    }


def _packet_flow_key(
    packet: Any,
    scapy: dict[str, Any],
):
    """
    Build the same directional flow identity used by packet attribution.

    Flow identity:

        source IP
        destination IP
        source port
        destination port
        protocol
    """

    IP = scapy["IP"]
    IPv6 = scapy["IPv6"]
    TCP = scapy["TCP"]
    UDP = scapy["UDP"]

    # ---------------------------------------------------------------
    # IP layer
    # ---------------------------------------------------------------

    if packet.haslayer(IP):

        layer = packet[IP]

        src_ip = str(
            getattr(
                layer,
                "src",
                "",
            )
        )

        dst_ip = str(
            getattr(
                layer,
                "dst",
                "",
            )
        )

        if packet.haslayer(TCP):
            protocol = "TCP"
        elif packet.haslayer(UDP):
            protocol = "UDP"
        else:
            protocol = "IP"

    elif packet.haslayer(IPv6):

        layer = packet[IPv6]

        src_ip = str(
            getattr(
                layer,
                "src",
                "",
            )
        )

        dst_ip = str(
            getattr(
                layer,
                "dst",
                "",
            )
        )

        if packet.haslayer(TCP):
            protocol = "TCP"
        elif packet.haslayer(UDP):
            protocol = "UDP"
        else:
            protocol = "IPv6"

    else:
        return None

    # ---------------------------------------------------------------
    # Transport layer
    # ---------------------------------------------------------------

    src_port = 0
    dst_port = 0

    if packet.haslayer(TCP):

        tcp = packet[TCP]

        src_port = int(
            getattr(
                tcp,
                "sport",
                0,
            )
            or 0
        )

        dst_port = int(
            getattr(
                tcp,
                "dport",
                0,
            )
            or 0
        )

    elif packet.haslayer(UDP):

        udp = packet[UDP]

        src_port = int(
            getattr(
                udp,
                "sport",
                0,
            )
            or 0
        )

        dst_port = int(
            getattr(
                udp,
                "dport",
                0,
            )
            or 0
        )

    return (
        src_ip,
        dst_ip,
        src_port,
        dst_port,
        protocol,
    )


def _flow_key(
    flow: dict[str, Any],
):
    """
    Convert an attribution flow record into the directional packet key.
    """

    return (
        str(
            flow.get(
                "src_ip",
                "",
            )
        ),
        str(
            flow.get(
                "dst_ip",
                "",
            )
        ),
        int(
            _safe_float(
                flow.get(
                    "src_port",
                    0,
                )
            )
        ),
        int(
            _safe_float(
                flow.get(
                    "dst_port",
                    0,
                )
            )
        ),
        str(
            flow.get(
                "protocol",
                "",
            )
        ),
    )


def _build_sequences(
    dataframe,
) -> list[list[list[float]]]:
    """
    Convert temporal model states into chronological 5-state sequences.

    The model always consumes the existing 12 trained features.
    """

    if len(dataframe) < SEQUENCE_LENGTH:
        return []

    values = (
        dataframe[
            FEATURE_NAMES
        ]
        .astype(float)
        .replace(
            [
                np.inf,
                -np.inf,
            ],
            np.nan,
        )
        .fillna(0.0)
        .to_numpy(
            dtype=np.float32
        )
    )

    sequences: list[list[list[float]]] = []

    for end_index in range(
        SEQUENCE_LENGTH,
        len(values) + 1,
    ):

        start_index = (
            end_index
            - SEQUENCE_LENGTH
        )

        sequence = values[
            start_index:end_index
        ].tolist()

        sequences.append(
            sequence
        )

    return sequences


def _extract_temporal_bounds(
    dataframe,
) -> tuple[float, float]:
    """
    Extract the baseline temporal grid boundaries.

    The dataframe Timestamp represents the beginning of each temporal state.
    Therefore the timeline end is the start of the final state plus the
    configured 30-second window.

    These boundaries are reused for EVERY leave-one-flow-out experiment.
    """

    if dataframe.empty:
        raise ValueError(
            "Unable to determine temporal bounds from an empty PCAP."
        )

    if "Timestamp" not in dataframe.columns:
        raise ValueError(
            "PCAP temporal dataframe does not contain Timestamp."
        )

    timestamps = (
        dataframe[
            "Timestamp"
        ]
        .sort_values()
    )

    first_timestamp = (
        timestamps.iloc[0]
    )

    last_timestamp = (
        timestamps.iloc[-1]
    )

    try:

        first_seconds = float(
            first_timestamp.timestamp()
        )

        last_seconds = float(
            last_timestamp.timestamp()
        )

    except AttributeError as exc:

        raise ValueError(
            "PCAP temporal timestamps are not valid datetime values."
        ) from exc

    timeline_end = (
        last_seconds
        + WINDOW_SECONDS
    )

    return (
        first_seconds,
        timeline_end,
    )


def _latest_raw_outputs(
    pcap_path: Path,
    timeline_start: float | None = None,
    timeline_end: float | None = None,
) -> dict[str, Any]:
    """
    Prepare a PCAP and return the latest raw world-model output.

    When timeline_start/timeline_end are supplied, the PCAP adapter is forced
    to use the original baseline temporal grid. This is the key requirement
    for leave-one-flow-out sensitivity.
    """

    prepared = prepare_uploaded_pcap(
        pcap_path,
        timeline_start=timeline_start,
        timeline_end=timeline_end,
    )

    dataframe = prepared[
        "dataframe"
    ]

    sequences = _build_sequences(
        dataframe
    )

    if not sequences:

        raise ValueError(
            f"PCAP produced fewer than "
            f"{SEQUENCE_LENGTH} usable temporal states."
        )

    result = predict_world_model_batch(
        sequences
    )

    raw_logits = result.get(
        "raw_latest_logits"
    )

    if raw_logits is None:

        raise RuntimeError(
            "World-model inference did not return raw_latest_logits; "
            "model-sensitivity attribution requires raw logits."
        )

    logits = np.asarray(
        raw_logits,
        dtype=float,
    ).reshape(-1)

    if logits.size != 3:

        raise RuntimeError(
            "Expected exactly 3 latest raw logits "
            f"for T+1/T+2/T+3, received shape {logits.shape}."
        )

    probabilities = (
        1.0
        / (
            1.0
            + np.exp(
                -np.clip(
                    logits,
                    -50.0,
                    50.0,
                )
            )
        )
    )

    return {
        "result": result,
        "dataframe": dataframe,
        "raw_logits": logits,
        "raw_probabilities": probabilities,
    }


def _remove_flow(
    input_path: Path,
    output_path: Path,
    target_key,
) -> tuple[int, int]:
    """
    Remove every packet belonging to one exact directional flow.

    Returns:

        (remaining_packet_count, removed_packet_count)
    """

    scapy = _load_scapy()

    PcapReader = scapy[
        "PcapReader"
    ]

    PcapWriter = scapy[
        "PcapWriter"
    ]

    remaining_packets = 0
    removed_packets = 0

    with (
        PcapReader(
            str(input_path)
        ) as reader,
        PcapWriter(
            str(output_path),
            sync=True,
        ) as writer,
    ):

        for packet in reader:

            packet_key = _packet_flow_key(
                packet,
                scapy,
            )

            if packet_key == target_key:

                removed_packets += 1
                continue

            writer.write(
                packet
            )

            remaining_packets += 1

    return (
        remaining_packets,
        removed_packets,
    )


def _build_horizon_effects(
    baseline_logits: np.ndarray,
    baseline_probabilities: np.ndarray,
    ablated_logits: np.ndarray,
    ablated_probabilities: np.ndarray,
) -> tuple[dict[str, Any], list[tuple[float, str, float]]]:
    """
    Calculate probability and logit changes for all three horizons.
    """

    effects: dict[str, Any] = {}
    absolute_effects: list[
        tuple[float, str, float]
    ] = []

    for horizon_index, horizon in enumerate(
        HORIZONS
    ):

        baseline_probability = float(
            baseline_probabilities[
                horizon_index
            ]
        )

        without_flow_probability = float(
            ablated_probabilities[
                horizon_index
            ]
        )

        baseline_logit = float(
            baseline_logits[
                horizon_index
            ]
        )

        without_flow_logit = float(
            ablated_logits[
                horizon_index
            ]
        )

        probability_delta = (
            without_flow_probability
            - baseline_probability
        )

        logit_delta = (
            without_flow_logit
            - baseline_logit
        )

        effects[horizon] = {
            "baseline_raw_logit": baseline_logit,
            "without_flow_raw_logit": without_flow_logit,
            "baseline_raw_probability": baseline_probability,
            "without_flow_raw_probability": without_flow_probability,
            "probability_delta": float(
                probability_delta
            ),
            "probability_drop_when_flow_removed": float(
                -probability_delta
            ),
            "logit_delta": float(
                logit_delta
            ),
        }

        absolute_effects.append(
            (
                abs(
                    probability_delta
                ),
                horizon,
                float(
                    probability_delta
                ),
            )
        )

    absolute_effects.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    return (
        effects,
        absolute_effects,
    )


def build_model_sensitivity_attribution(
    pcap_path: str | Path,
    packet_attribution: dict[str, Any] | None,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Run leave-one-flow-out sensitivity for the highest-ranked flows.

    Temporal methodology:

    1. Run baseline inference.
    2. Capture the original temporal grid boundaries.
    3. Remove one directional flow.
    4. Rebuild the filtered PCAP using the ORIGINAL boundaries.
    5. Preserve empty temporal states.
    6. Re-run the frozen world model.
    7. Compare the latest raw outputs.

    This prevents a flow removal from changing the temporal coordinate
    system merely because packets at the end of the capture disappeared.
    """

    if limit < 1:
        raise ValueError(
            "limit must be at least 1."
        )

    path = Path(
        pcap_path
    )

    if not path.exists():

        raise FileNotFoundError(
            f"PCAP file not found: {path}"
        )

    if (
        not packet_attribution
        or not packet_attribution.get(
            "available"
        )
    ):

        return {
            "available": False,
            "method": METHOD,
            "model_attribution": False,
            "learned_packet_attribution": False,
            "causal_attribution": False,
            "reason": (
                "Packet/flow attribution is unavailable."
            ),
        }

    candidates = packet_attribution.get(
        "top_flows",
        [],
    )

    if not isinstance(
        candidates,
        list,
    ):

        candidates = []

    try:

        # ===========================================================
        # BASELINE
        # ===========================================================

        baseline = _latest_raw_outputs(
            path
        )

        baseline_dataframe = baseline[
            "dataframe"
        ]

        baseline_logits = baseline[
            "raw_logits"
        ]

        baseline_probabilities = baseline[
            "raw_probabilities"
        ]

        (
            timeline_start,
            timeline_end,
        ) = _extract_temporal_bounds(
            baseline_dataframe
        )

        baseline_state_count = int(
            len(
                baseline_dataframe
            )
        )

        baseline_packet_count = (
            packet_attribution.get(
                "packet_count"
            )
        )

        if baseline_packet_count is not None:

            baseline_packet_count = int(
                _safe_float(
                    baseline_packet_count
                )
            )

        analyses: list[
            dict[str, Any]
        ] = []

        # ===========================================================
        # LEAVE-ONE-FLOW-OUT
        # ===========================================================

        with TemporaryDirectory(
            prefix="threatcast_sensitivity_"
        ) as temp_dir:

            temp_dir_path = Path(
                temp_dir
            )

            for index, flow in enumerate(
                candidates[:limit],
                start=1,
            ):

                target_key = _flow_key(
                    flow
                )

                filtered_path = (
                    temp_dir_path
                    / f"without_flow_{index}.pcap"
                )

                (
                    remaining_packets,
                    removed_packets,
                ) = _remove_flow(
                    path,
                    filtered_path,
                    target_key,
                )

                try:

                    ablated = _latest_raw_outputs(
                        filtered_path,
                        timeline_start=timeline_start,
                        timeline_end=timeline_end,
                    )

                except Exception as exc:

                    analyses.append(
                        {
                            "rank": index,
                            "flow": flow,
                            "available": False,
                            "removed_packet_count": int(
                                removed_packets
                            ),
                            "remaining_packet_count": int(
                                remaining_packets
                            ),
                            "baseline_state_count": int(
                                baseline_state_count
                            ),
                            "ablated_state_count": None,
                            "temporal_grid_preserved": False,
                            "reason": (
                                "Ablation could not be evaluated: "
                                f"{exc}"
                            ),
                        }
                    )

                    continue

                ablated_dataframe = (
                    ablated[
                        "dataframe"
                    ]
                )

                ablated_logits = (
                    ablated[
                        "raw_logits"
                    ]
                )

                ablated_probabilities = (
                    ablated[
                        "raw_probabilities"
                    ]
                )

                ablated_state_count = int(
                    len(
                        ablated_dataframe
                    )
                )

                (
                    horizon_effects,
                    absolute_effects,
                ) = _build_horizon_effects(
                    baseline_logits,
                    baseline_probabilities,
                    ablated_logits,
                    ablated_probabilities,
                )

                if absolute_effects:

                    strongest = (
                        absolute_effects[0]
                    )

                    strongest_effect = {
                        "horizon": strongest[1],
                        "probability_delta": float(
                            strongest[2]
                        ),
                        "absolute_probability_effect": float(
                            strongest[0]
                        ),
                    }

                else:

                    strongest_effect = {
                        "horizon": None,
                        "probability_delta": 0.0,
                        "absolute_probability_effect": 0.0,
                    }

                analyses.append(
                    {
                        "rank": index,
                        "available": True,
                        "flow": flow,
                        "removed_packet_count": int(
                            removed_packets
                        ),
                        "remaining_packet_count": int(
                            remaining_packets
                        ),
                        "baseline_state_count": int(
                            baseline_state_count
                        ),
                        "ablated_state_count": int(
                            ablated_state_count
                        ),
                        "temporal_grid_preserved": (
                            ablated_state_count
                            == baseline_state_count
                        ),
                        "effects": horizon_effects,
                        "strongest_effect": (
                            strongest_effect
                        ),
                    }
                )

        successful_count = sum(
            1
            for item in analyses
            if item.get(
                "available"
            )
        )

        preserved_count = sum(
            1
            for item in analyses
            if item.get(
                "temporal_grid_preserved"
            )
        )

        # ===========================================================
        # FINAL RESPONSE
        # ===========================================================

        return {
            "available": True,
            "method": METHOD,
            "source": "Uploaded PCAP",
            "model_attribution": True,
            "learned_packet_attribution": False,
            "causal_attribution": False,

            "window_seconds": WINDOW_SECONDS,

            "baseline": {
                "raw_logits": [
                    float(value)
                    for value in baseline_logits
                ],
                "raw_probabilities": [
                    float(value)
                    for value in baseline_probabilities
                ],
                "horizons": list(
                    HORIZONS
                ),
                "packet_count": (
                    baseline_packet_count
                ),
                "state_count": int(
                    baseline_state_count
                ),
                "timeline_start": float(
                    timeline_start
                ),
                "timeline_end": float(
                    timeline_end
                ),
            },

            "flow_count_analyzed": int(
                len(
                    analyses
                )
            ),

            "flow_count_successfully_analyzed": int(
                successful_count
            ),

            "flow_count_temporal_grid_preserved": int(
                preserved_count
            ),

            "limit": int(
                limit
            ),

            "flows": analyses,

            "interpretation": (
                "Each result measures the sensitivity of the "
                "frozen world-model prediction to removing one "
                "directional flow. The filtered PCAP is rebuilt "
                "using the same original temporal grid as the "
                "baseline, including empty 30-second states."
            ),

            "probability_delta_definition": (
                "without_flow_probability - "
                "baseline_probability"
            ),

            "limitations": [
                (
                    "Leave-one-flow-out sensitivity is a model "
                    "perturbation analysis, not causal attribution."
                ),
                (
                    "It is not packet-level SHAP and does not "
                    "estimate maliciousness probability."
                ),
                (
                    "The trained world model still consumes only "
                    "the original 12 aggregated temporal features."
                ),
                (
                    "Only the highest-ranked deterministic "
                    "attribution flows up to the requested limit "
                    "are analyzed."
                ),
                (
                    "Removing a flow changes the temporal feature "
                    "values by design; the resulting delta measures "
                    "model sensitivity to that perturbation."
                ),
                (
                    "The baseline temporal grid is intentionally "
                    "held fixed across all successful ablations."
                ),
            ],
        }

    except Exception as exc:

        return {
            "available": False,
            "method": METHOD,
            "model_attribution": False,
            "learned_packet_attribution": False,
            "causal_attribution": False,
            "reason": (
                "Unable to compute model sensitivity: "
                f"{exc}"
            ),
        }