from __future__ import annotations

"""
Model-sensitivity attribution for uploaded PCAPs.

This module performs leave-one-flow-out sensitivity analysis against the
frozen CTU13 temporal risk world model.

It is intentionally NOT described as causal attribution, SHAP, or a
maliciousness probability. For each selected directional flow, all packets
belonging to that exact flow are removed, the same PCAP -> 30-second temporal
aggregation -> 5-state world-model pipeline is rerun, and the change in the
latest raw risk probability/logit is reported.
"""

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import numpy as np

from backend.ml.pcap_adapter import prepare_uploaded_pcap
from backend.ml.inference import FEATURE_NAMES, SEQUENCE_LENGTH
from world_model.ctu13_risk_inference import predict_world_model_batch


METHOD = "leave_one_flow_out_model_sensitivity"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        value = float(value)
        if np.isfinite(value):
            return value
    except (TypeError, ValueError):
        pass
    return default


def _load_scapy():
    try:
        from scapy.all import IP, IPv6, TCP, UDP, PcapReader, PcapWriter
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


def _packet_flow_key(packet: Any, scapy: dict[str, Any]):
    IP = scapy["IP"]
    IPv6 = scapy["IPv6"]
    TCP = scapy["TCP"]
    UDP = scapy["UDP"]

    if packet.haslayer(IP):
        layer = packet[IP]
        src_ip = str(getattr(layer, "src", ""))
        dst_ip = str(getattr(layer, "dst", ""))
        protocol = "TCP" if packet.haslayer(TCP) else "UDP" if packet.haslayer(UDP) else "IP"
    elif packet.haslayer(IPv6):
        layer = packet[IPv6]
        src_ip = str(getattr(layer, "src", ""))
        dst_ip = str(getattr(layer, "dst", ""))
        protocol = "TCP" if packet.haslayer(TCP) else "UDP" if packet.haslayer(UDP) else "IPv6"
    else:
        return None

    src_port = 0
    dst_port = 0
    if packet.haslayer(TCP):
        tcp = packet[TCP]
        src_port = int(getattr(tcp, "sport", 0) or 0)
        dst_port = int(getattr(tcp, "dport", 0) or 0)
    elif packet.haslayer(UDP):
        udp = packet[UDP]
        src_port = int(getattr(udp, "sport", 0) or 0)
        dst_port = int(getattr(udp, "dport", 0) or 0)

    return (src_ip, dst_ip, src_port, dst_port, protocol)


def _flow_key(flow: dict[str, Any]):
    return (
        str(flow.get("src_ip", "")),
        str(flow.get("dst_ip", "")),
        int(_safe_float(flow.get("src_port", 0))),
        int(_safe_float(flow.get("dst_port", 0))),
        str(flow.get("protocol", "")),
    )


def _build_sequences(dataframe) -> list[list[list[float]]]:
    if len(dataframe) < SEQUENCE_LENGTH:
        return []

    values = (
        dataframe[FEATURE_NAMES]
        .astype(float)
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0.0)
        .to_numpy(dtype=np.float32)
    )

    sequences = []
    for end_index in range(SEQUENCE_LENGTH, len(values) + 1):
        start_index = end_index - SEQUENCE_LENGTH
        sequences.append(values[start_index:end_index].tolist())

    return sequences


def _latest_raw_outputs(pcap_path: Path) -> dict[str, Any]:
    prepared = prepare_uploaded_pcap(pcap_path)
    dataframe = prepared["dataframe"]
    sequences = _build_sequences(dataframe)

    if not sequences:
        raise ValueError(
            f"PCAP produced fewer than {SEQUENCE_LENGTH} usable temporal states."
        )

    result = predict_world_model_batch(sequences)
    raw_logits = result.get("raw_latest_logits")

    if raw_logits is None:
        raise RuntimeError(
            "World-model inference did not return raw_latest_logits; "
            "model-sensitivity attribution requires raw logits."
        )

    logits = np.asarray(raw_logits, dtype=float).reshape(-1)
    if logits.size != 3:
        raise RuntimeError(
            f"Expected 3 latest raw logits, received shape {logits.shape}."
        )

    probabilities = 1.0 / (1.0 + np.exp(-np.clip(logits, -50.0, 50.0)))

    return {
        "result": result,
        "dataframe": dataframe,
        "raw_logits": logits,
        "raw_probabilities": probabilities,
    }


def _remove_flow(input_path: Path, output_path: Path, target_key) -> int:
    scapy = _load_scapy()
    PcapReader = scapy["PcapReader"]
    PcapWriter = scapy["PcapWriter"]

    kept = 0
    with PcapReader(str(input_path)) as reader, PcapWriter(str(output_path), sync=True) as writer:
        for packet in reader:
            if _packet_flow_key(packet, scapy) == target_key:
                continue
            writer.write(packet)
            kept += 1

    return kept


def build_model_sensitivity_attribution(
    pcap_path: str | Path,
    packet_attribution: dict[str, Any] | None,
    limit: int = 10,
) -> dict[str, Any]:
    """
    Run leave-one-flow-out sensitivity for the highest-ranked flows.

    The baseline and every ablation use the same frozen trained model and the
    same PCAP adapter. No model weights, scaler, calibration parameters,
    thresholds, or training data are changed.
    """

    if limit < 1:
        raise ValueError("limit must be at least 1.")

    path = Path(pcap_path)
    if not path.exists():
        raise FileNotFoundError(f"PCAP file not found: {path}")

    if not packet_attribution or not packet_attribution.get("available"):
        return {
            "available": False,
            "method": METHOD,
            "model_attribution": False,
            "learned_packet_attribution": False,
            "causal_attribution": False,
            "reason": "Packet/flow attribution is unavailable.",
        }

    candidates = packet_attribution.get("top_flows", [])
    if not isinstance(candidates, list):
        candidates = []

    try:
        baseline = _latest_raw_outputs(path)
        baseline_logits = baseline["raw_logits"]
        baseline_probabilities = baseline["raw_probabilities"]

        horizons = ["T+1", "T+2", "T+3"]
        analyses = []

        with TemporaryDirectory(prefix="threatcast_sensitivity_") as temp_dir:
            temp_dir_path = Path(temp_dir)

            for index, flow in enumerate(candidates[:limit], start=1):
                target_key = _flow_key(flow)
                filtered_path = temp_dir_path / f"without_flow_{index}.pcap"
                kept_packets = _remove_flow(path, filtered_path, target_key)

                try:
                    ablated = _latest_raw_outputs(filtered_path)
                except Exception as exc:
                    analyses.append({
                        "rank": index,
                        "flow": flow,
                        "available": False,
                        "reason": f"Ablation could not be evaluated: {exc}",
                    })
                    continue

                ablated_logits = ablated["raw_logits"]
                ablated_probabilities = ablated["raw_probabilities"]

                horizon_effects = {}
                absolute_effects = []

                for horizon_index, horizon in enumerate(horizons):
                    delta = float(
                        ablated_probabilities[horizon_index]
                        - baseline_probabilities[horizon_index]
                    )
                    logit_delta = float(
                        ablated_logits[horizon_index]
                        - baseline_logits[horizon_index]
                    )
                    probability_drop = float(-delta)

                    horizon_effects[horizon] = {
                        "baseline_raw_logit": float(baseline_logits[horizon_index]),
                        "without_flow_raw_logit": float(ablated_logits[horizon_index]),
                        "baseline_raw_probability": float(baseline_probabilities[horizon_index]),
                        "without_flow_raw_probability": float(ablated_probabilities[horizon_index]),
                        "probability_delta": delta,
                        "probability_drop_when_flow_removed": probability_drop,
                        "logit_delta": logit_delta,
                    }
                    absolute_effects.append((abs(delta), horizon, delta))

                absolute_effects.sort(reverse=True)
                strongest = absolute_effects[0] if absolute_effects else (0.0, None, 0.0)

                analyses.append({
                    "rank": index,
                    "available": True,
                    "flow": flow,
                    "removed_packet_count": int(max(0, packet_attribution.get("packet_count", 0) - kept_packets)) if packet_attribution.get("packet_count") is not None else None,
                    "remaining_packet_count": int(kept_packets),
                    "effects": horizon_effects,
                    "strongest_effect": {
                        "horizon": strongest[1],
                        "probability_delta": float(strongest[2]),
                        "absolute_probability_effect": float(strongest[0]),
                    },
                })

        return {
            "available": True,
            "method": METHOD,
            "source": "Uploaded PCAP",
            "model_attribution": True,
            "learned_packet_attribution": False,
            "causal_attribution": False,
            "baseline": {
                "raw_logits": [float(x) for x in baseline_logits],
                "raw_probabilities": [float(x) for x in baseline_probabilities],
                "horizons": horizons,
            },
            "flow_count_analyzed": int(len(analyses)),
            "limit": int(limit),
            "flows": analyses,
            "interpretation": (
                "Each result measures prediction sensitivity to removing one "
                "directional flow and rerunning the frozen world-model pipeline. "
                "A positive probability_delta means the prediction increased "
                "after that flow was removed; a negative value means it decreased."
            ),
            "limitations": [
                "Leave-one-flow-out sensitivity is a model perturbation analysis, not causal attribution.",
                "It is not packet-level SHAP and does not estimate maliciousness probability.",
                "The trained world model still consumes only the original 12 aggregated temporal features.",
                "Only the highest-ranked deterministic attribution flows up to the requested limit are analyzed.",
            ],
        }

    except Exception as exc:
        return {
            "available": False,
            "method": METHOD,
            "model_attribution": False,
            "learned_packet_attribution": False,
            "causal_attribution": False,
            "reason": f"Unable to compute model sensitivity: {exc}",
        }
