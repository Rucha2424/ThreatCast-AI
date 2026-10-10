from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

import math

import pandas as pd


# ============================================================================
# PCAP PACKET / FLOW ATTRIBUTION
# ============================================================================
#
# This module provides deterministic packet/flow evidence.
#
# IMPORTANT:
# - This is NOT a trained ML model.
# - This is NOT SHAP.
# - This is NOT causal attribution.
# - evidence_score is NOT a maliciousness probability.
#
# The prediction-attribution helper at the bottom connects observable
# packet/flow evidence to the temporal input window used by the world model.
# It does NOT claim that an individual packet caused a prediction.
# ============================================================================


FLAG_THRESHOLD = 2.0


TCP_FLAG_NAMES = (
    "SYN",
    "ACK",
    "RST",
    "FIN",
    "PSH",
)


def _load_scapy():
    try:
        from scapy.all import (
            ICMP,
            IP,
            IPv6,
            PcapReader,
            TCP,
            UDP,
        )
    except ImportError as exc:
        raise RuntimeError(
            "Scapy is required for PCAP attribution. "
            "Install it with: pip install scapy"
        ) from exc

    return {
        "IP": IP,
        "IPv6": IPv6,
        "TCP": TCP,
        "UDP": UDP,
        "ICMP": ICMP,
        "PcapReader": PcapReader,
    }


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
        if math.isfinite(result):
            return result
    except (TypeError, ValueError):
        pass

    return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _timestamp(packet: Any) -> float:
    try:
        return float(packet.time)
    except (TypeError, ValueError, AttributeError):
        return 0.0


def _protocol_name(packet: Any, scapy: dict[str, Any]) -> tuple[str, int]:
    TCP = scapy["TCP"]
    UDP = scapy["UDP"]
    ICMP = scapy["ICMP"]

    if packet.haslayer(TCP):
        return "TCP", 6

    if packet.haslayer(UDP):
        return "UDP", 17

    if packet.haslayer(ICMP):
        return "ICMP", 1

    try:
        if packet.haslayer(scapy["IP"]):
            return "IP", _safe_int(packet[scapy["IP"]].proto)

        if packet.haslayer(scapy["IPv6"]):
            return "IPv6", _safe_int(packet[scapy["IPv6"]].nh)
    except Exception:
        pass

    return "OTHER", 0


def _extract_packet(
    packet: Any,
    scapy: dict[str, Any],
) -> dict[str, Any] | None:
    IP = scapy["IP"]
    IPv6 = scapy["IPv6"]
    TCP = scapy["TCP"]
    UDP = scapy["UDP"]

    if packet.haslayer(IP):
        ip_layer = packet[IP]

        src_ip = str(getattr(ip_layer, "src", ""))
        dst_ip = str(getattr(ip_layer, "dst", ""))
        ttl = _safe_float(getattr(ip_layer, "ttl", 0.0))

    elif packet.haslayer(IPv6):
        ip_layer = packet[IPv6]

        src_ip = str(getattr(ip_layer, "src", ""))
        dst_ip = str(getattr(ip_layer, "dst", ""))
        ttl = _safe_float(getattr(ip_layer, "hlim", 0.0))

    else:
        return None

    if not src_ip or not dst_ip:
        return None

    protocol, protocol_number = _protocol_name(
        packet,
        scapy,
    )

    src_port = 0
    dst_port = 0
    tcp_window = 0.0

    syn = False
    ack = False
    rst = False
    fin = False
    psh = False

    if packet.haslayer(TCP):
        tcp = packet[TCP]

        src_port = _safe_int(
            getattr(tcp, "sport", 0)
        )

        dst_port = _safe_int(
            getattr(tcp, "dport", 0)
        )

        tcp_window = _safe_float(
            getattr(tcp, "window", 0.0)
        )

        flags = str(
            getattr(tcp, "flags", "")
        )

        syn = "S" in flags
        ack = "A" in flags
        rst = "R" in flags
        fin = "F" in flags
        psh = "P" in flags

    elif packet.haslayer(UDP):
        udp = packet[UDP]

        src_port = _safe_int(
            getattr(udp, "sport", 0)
        )

        dst_port = _safe_int(
            getattr(udp, "dport", 0)
        )

    try:
        packet_size = int(len(packet))
    except Exception:
        packet_size = 0

    return {
        "timestamp": _timestamp(packet),
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "protocol": protocol,
        "protocol_number": protocol_number,
        "packet_size": packet_size,
        "ttl": ttl,
        "tcp_window": tcp_window,
        "syn": syn,
        "ack": ack,
        "rst": rst,
        "fin": fin,
        "psh": psh,
    }


def _initial_flow(
    record: dict[str, Any],
) -> dict[str, Any]:
    return {
        "src_ip": record["src_ip"],
        "src_port": record["src_port"],
        "dst_ip": record["dst_ip"],
        "dst_port": record["dst_port"],
        "protocol": record["protocol"],
        "protocol_number": record["protocol_number"],
        "first_seen": record["timestamp"],
        "last_seen": record["timestamp"],
        "packet_count": 0,
        "byte_count": 0,
        "tcp_flags": {
            "SYN": 0,
            "ACK": 0,
            "RST": 0,
            "FIN": 0,
            "PSH": 0,
        },
    }


def _update_flow(
    flow: dict[str, Any],
    record: dict[str, Any],
) -> None:
    flow["last_seen"] = record["timestamp"]

    flow["packet_count"] += 1
    flow["byte_count"] += record["packet_size"]

    if record["syn"]:
        flow["tcp_flags"]["SYN"] += 1

    if record["ack"]:
        flow["tcp_flags"]["ACK"] += 1

    if record["rst"]:
        flow["tcp_flags"]["RST"] += 1

    if record["fin"]:
        flow["tcp_flags"]["FIN"] += 1

    if record["psh"]:
        flow["tcp_flags"]["PSH"] += 1


def _score_flows(
    flows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    # ------------------------------------------------------------------------
    # Build source-level port / destination statistics.
    # ------------------------------------------------------------------------

    ports_per_source: dict[str, set[int]] = defaultdict(set)
    destinations_per_source: dict[str, set[str]] = defaultdict(set)

    for flow in flows:
        source = str(flow["src_ip"])

        if flow["dst_port"] is not None:
            ports_per_source[source].add(
                _safe_int(flow["dst_port"])
            )

        if flow["dst_ip"]:
            destinations_per_source[source].add(
                str(flow["dst_ip"])
            )

    scored = []

    for flow in flows:
        score = 0.0
        reasons: list[str] = []

        flags = flow["tcp_flags"]

        syn_count = _safe_int(
            flags.get("SYN", 0)
        )

        ack_count = _safe_int(
            flags.get("ACK", 0)
        )

        rst_count = _safe_int(
            flags.get("RST", 0)
        )

        packet_count = max(
            _safe_int(flow["packet_count"]),
            1,
        )

        # --------------------------------------------------------------------
        # Rule 1: SYN without ACK.
        # --------------------------------------------------------------------

        syn_without_ack = (
            syn_count > 0
            and ack_count == 0
        )

        if syn_without_ack:
            score += 3.0
            reasons.append(
                "SYN packets without ACK responses"
            )

        # --------------------------------------------------------------------
        # Rule 2: destination-port diversity.
        # --------------------------------------------------------------------

        source_port_count = len(
            ports_per_source[
                str(flow["src_ip"])
            ]
        )

        if source_port_count >= 3:
            score += 1.0

            additional_ports = max(
                source_port_count - 3,
                0,
            )

            score += min(
                additional_ports * 0.5,
                3.0,
            )

            reasons.append(
                "source contacted "
                f"{source_port_count} distinct destination ports"
            )

        # --------------------------------------------------------------------
        # Rule 3: destination-IP diversity.
        # --------------------------------------------------------------------

        destination_count = len(
            destinations_per_source[
                str(flow["src_ip"])
            ]
        )

        if destination_count >= 3:
            score += 0.5

            additional_destinations = max(
                destination_count - 3,
                0,
            )

            score += min(
                additional_destinations * 0.25,
                1.5,
            )

            reasons.append(
                "source contacted "
                f"{destination_count} distinct destination IPs"
            )

        # --------------------------------------------------------------------
        # Rule 4: RST.
        # --------------------------------------------------------------------

        if rst_count > 0:
            score += 1.0
            reasons.append(
                "TCP reset packets observed"
            )

        # --------------------------------------------------------------------
        # Rule 5: repeated SYN.
        # --------------------------------------------------------------------

        if syn_count >= 3:
            score += 1.0
            reasons.append(
                "repeated SYN packets observed"
            )

        # --------------------------------------------------------------------
        # Rule 6: high SYN ratio.
        # --------------------------------------------------------------------

        syn_ratio = (
            syn_count / packet_count
            if packet_count > 0
            else 0.0
        )

        if syn_ratio >= 0.5 and syn_count >= 2:
            score += 1.0
            reasons.append(
                "high SYN-to-packet ratio"
            )

        duration = max(
            _safe_float(flow["last_seen"])
            - _safe_float(flow["first_seen"]),
            0.0,
        )

        enriched = {
            **flow,
            "duration_seconds": duration,
            "syn_without_ack": syn_without_ack,
            "syn_ratio": syn_ratio,
            "evidence_score": float(score),
            "flagged": bool(score >= FLAG_THRESHOLD),
            "evidence_reasons": reasons,
        }

        scored.append(enriched)

    return scored


def analyze_pcap_attribution(
    path: str | Path,
    limit: int = 20,
) -> dict[str, Any]:
    """
    Analyze a PCAP and return deterministic packet/flow evidence.

    This function is deliberately independent from the trained world model.
    It provides observable packet-level evidence that can subsequently be
    associated with the temporal input window used for model inference.
    """

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"PCAP file not found: {path}"
        )

    if path.suffix.lower() not in {
        ".pcap",
        ".pcapng",
        ".cap",
    }:
        raise ValueError(
            "PCAP attribution requires "
            ".pcap, .pcapng, or .cap input."
        )

    if limit < 1:
        raise ValueError(
            "limit must be at least 1."
        )

    scapy = _load_scapy()
    PcapReader = scapy["PcapReader"]

    flows: dict[
        tuple[Any, ...],
        dict[str, Any],
    ] = {}

    packet_count = 0
    first_timestamp = None
    last_timestamp = None

    try:
        with PcapReader(str(path)) as reader:
            for packet in reader:
                record = _extract_packet(
                    packet,
                    scapy,
                )

                if record is None:
                    continue

                packet_count += 1

                timestamp = record["timestamp"]

                if first_timestamp is None:
                    first_timestamp = timestamp

                last_timestamp = timestamp

                key = (
                    record["src_ip"],
                    record["dst_ip"],
                    record["src_port"],
                    record["dst_port"],
                    record["protocol"],
                )

                if key not in flows:
                    flows[key] = _initial_flow(
                        record
                    )

                _update_flow(
                    flows[key],
                    record,
                )

    except Exception as exc:
        raise RuntimeError(
            f"Unable to read PCAP file '{path}': {exc}"
        ) from exc

    if packet_count == 0:
        return {
            "available": False,
            "source": "PCAP packet/flow attribution",
            "method": "Deterministic packet/flow evidence attribution",
            "model_attribution": False,
            "packet_count": 0,
            "flow_count": 0,
            "flagged_flow_count": 0,
            "capture_duration_seconds": 0.0,
            "first_packet_timestamp": None,
            "last_packet_timestamp": None,
            "top_flows": [],
            "all_flows": [],
            "flagged_flows": [],
            "flag_threshold": FLAG_THRESHOLD,
            "scoring": {
                "syn_without_ack": 3.0,
                "distinct_destination_ports": (
                    "1.0 + 0.5 per additional port, capped at 4.0"
                ),
                "distinct_destination_ips": (
                    "0.5 + 0.25 per additional IP, capped at 2.0"
                ),
                "rst": 1.0,
                "repeated_syn": 1.0,
                "high_syn_ratio": 1.0,
            },
            "limitations": [
                "This is deterministic packet/flow evidence, not ML.",
                "This is not SHAP or causal attribution.",
                "Evidence score is not a maliciousness probability.",
                "World-model inference still uses only the existing 12 aggregated features.",
            ],
        }

    scored = _score_flows(
        list(flows.values())
    )

    scored.sort(
        key=lambda item: (
            -_safe_float(item.get("evidence_score")),
            -_safe_int(item.get("packet_count")),
            -_safe_int(item.get("byte_count")),
            str(item.get("src_ip")),
            str(item.get("dst_ip")),
            _safe_int(item.get("dst_port")),
        )
    )

    flagged = [
        flow
        for flow in scored
        if flow["flagged"]
    ]

    duration = max(
        _safe_float(last_timestamp)
        - _safe_float(first_timestamp),
        0.0,
    )

    return {
        "available": True,
        "source": "PCAP packet/flow attribution",
        "method": "Deterministic packet/flow evidence attribution",
        "model_attribution": False,
        "packet_count": int(packet_count),
        "flow_count": int(len(scored)),
        "flagged_flow_count": int(len(flagged)),
        "capture_duration_seconds": float(duration),
        "first_packet_timestamp": first_timestamp,
        "last_packet_timestamp": last_timestamp,
        "top_flows": scored[:limit],
        "all_flows": scored,
        "flagged_flows": flagged[:limit],
        "flag_threshold": FLAG_THRESHOLD,
        "scoring": {
            "syn_without_ack": 3.0,
            "distinct_destination_ports": (
                "1.0 + 0.5 per additional port, capped at 4.0"
            ),
            "distinct_destination_ips": (
                "0.5 + 0.25 per additional IP, capped at 2.0"
            ),
            "rst": 1.0,
            "repeated_syn": 1.0,
            "high_syn_ratio": 1.0,
        },
        "limitations": [
            "This is deterministic packet/flow evidence, not ML.",
            "This is not SHAP or causal attribution.",
            "Evidence score is not a maliciousness probability.",
            "World-model inference still uses only the existing 12 aggregated features.",
        ],
    }


# ============================================================================
# WORLD-MODEL PREDICTION ATTRIBUTION
# ============================================================================

def _to_timestamp(value: Any) -> float | None:
    """
    Convert common timestamp representations into Unix seconds.
    """

    if value is None:
        return None

    if isinstance(value, (int, float)):
        result = float(value)

        if math.isfinite(result):
            return result

        return None

    try:
        import pandas as pd

        timestamp = pd.Timestamp(value)

        if timestamp.tzinfo is not None:
            timestamp = timestamp.tz_convert("UTC")

        return float(timestamp.timestamp())

    except Exception:
        return None


def _flow_overlaps_window(
    flow: dict[str, Any],
    window_start: float,
    window_end: float,
) -> bool:
    first_seen = _to_timestamp(
        flow.get("first_seen")
    )

    last_seen = _to_timestamp(
        flow.get("last_seen")
    )

    if first_seen is None and last_seen is None:
        return False

    if first_seen is None:
        first_seen = last_seen

    if last_seen is None:
        last_seen = first_seen

    return (
        first_seen <= window_end
        and last_seen >= window_start
    )


def _flow_feature_evidence(
    flows: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Summarize observable flow evidence corresponding to the model's
    aggregated input features.

    These are correspondence indicators, not learned feature contributions.
    """

    if not flows:
        return {
            "flow_count": 0,
            "packet_count": 0,
            "byte_count": 0,
            "unique_source_ips": 0,
            "unique_destination_ips": 0,
            "unique_destination_ports": 0,
            "max_unique_ports_per_source": 0,
            "tcp_syn_packets": 0,
            "tcp_ack_packets": 0,
            "tcp_rst_packets": 0,
            "flagged_flow_count": 0,
        }

    source_ips = {
        str(flow.get("src_ip"))
        for flow in flows
        if flow.get("src_ip")
    }

    destination_ips = {
        str(flow.get("dst_ip"))
        for flow in flows
        if flow.get("dst_ip")
    }

    destination_ports = {
        _safe_int(flow.get("dst_port"))
        for flow in flows
        if flow.get("dst_port") not in {
            None,
            "",
        }
    }

    ports_per_source: dict[str, set[int]] = defaultdict(set)

    packet_count = 0
    byte_count = 0
    syn_count = 0
    ack_count = 0
    rst_count = 0
    flagged_count = 0

    for flow in flows:
        source = str(
            flow.get("src_ip", "")
        )

        destination_port = _safe_int(
            flow.get("dst_port")
        )

        ports_per_source[
            source
        ].add(destination_port)

        packet_count += _safe_int(
            flow.get("packet_count")
        )

        byte_count += _safe_int(
            flow.get("byte_count")
        )

        flags = flow.get(
            "tcp_flags",
            {},
        )

        syn_count += _safe_int(
            flags.get("SYN", 0)
        )

        ack_count += _safe_int(
            flags.get("ACK", 0)
        )

        rst_count += _safe_int(
            flags.get("RST", 0)
        )

        if bool(flow.get("flagged")):
            flagged_count += 1

    max_ports_per_source = max(
        (
            len(ports)
            for ports in ports_per_source.values()
        ),
        default=0,
    )

    return {
        "flow_count": int(len(flows)),
        "packet_count": int(packet_count),
        "byte_count": int(byte_count),
        "unique_source_ips": int(len(source_ips)),
        "unique_destination_ips": int(len(destination_ips)),
        "unique_destination_ports": int(
            len(destination_ports)
        ),
        "max_unique_ports_per_source": int(
            max_ports_per_source
        ),
        "tcp_syn_packets": int(syn_count),
        "tcp_ack_packets": int(ack_count),
        "tcp_rst_packets": int(rst_count),
        "flagged_flow_count": int(flagged_count),
    }


def build_prediction_attribution(
    attribution: dict[str, Any] | None,
    dataframe: Any,
    sequence_length: int = 5,
    window_seconds: float = 30.0,
    limit: int = 20,
) -> dict[str, Any]:
    """
    Associate PCAP flow/port/flag evidence with the exact temporal input
    window used by the latest world-model prediction.

    The latest prediction is based on the last `sequence_length` temporal
    states. Therefore the attribution window is:

        latest_state_start - (sequence_length - 1) * window_seconds
        through
        latest_state_start + window_seconds

    The function matches deterministic PCAP flows whose observed timestamps
    overlap this window.

    IMPORTANT:
    This does NOT claim causal packet-level influence.
    It establishes temporal/input-window correspondence only.
    """

    if not attribution or not attribution.get("available"):
        return {
            "available": False,
            "method": (
                "Temporal PCAP evidence-to-prediction "
                "window correspondence"
            ),
            "model_attribution": False,
            "causal_attribution": False,
            "reason": "PCAP flow attribution is unavailable.",
        }

    if dataframe is None:
        return {
            "available": False,
            "method": (
                "Temporal PCAP evidence-to-prediction "
                "window correspondence"
            ),
            "model_attribution": False,
            "causal_attribution": False,
            "reason": "Temporal dataframe is unavailable.",
        }

    try:
        if len(dataframe) < sequence_length:
            return {
                "available": False,
                "method": (
                    "Temporal PCAP evidence-to-prediction "
                    "window correspondence"
                ),
                "model_attribution": False,
                "causal_attribution": False,
                "reason": (
                    f"At least {sequence_length} states are required "
                    "to construct the prediction input window."
                ),
            }

        latest_states = dataframe.tail(
            sequence_length
        )

        if "Timestamp" not in latest_states.columns:
            return {
                "available": False,
                "method": (
                    "Temporal PCAP evidence-to-prediction "
                    "window correspondence"
                ),
                "model_attribution": False,
                "causal_attribution": False,
                "reason": (
                    "Temporal dataframe has no Timestamp column."
                ),
            }

        timestamps = [
            _to_timestamp(value)
            for value in latest_states[
                "Timestamp"
            ].tolist()
        ]

        timestamps = [
            value
            for value in timestamps
            if value is not None
        ]

        if len(timestamps) != sequence_length:
            return {
                "available": False,
                "method": (
                    "Temporal PCAP evidence-to-prediction "
                    "window correspondence"
                ),
                "model_attribution": False,
                "causal_attribution": False,
                "reason": (
                    "Unable to convert prediction-window timestamps."
                ),
            }

        window_start = timestamps[0]
        window_end = timestamps[-1] + float(
            window_seconds
        )

        all_flows = attribution.get(
            "all_flows",
            attribution.get("top_flows", []),
        )

        if not isinstance(all_flows, list):
            all_flows = []

        matching_flows = [
            flow
            for flow in all_flows
            if _flow_overlaps_window(
                flow,
                window_start,
                window_end,
            )
        ]

        matching_flows.sort(
            key=lambda item: (
                -_safe_float(
                    item.get("evidence_score")
                ),
                -_safe_int(
                    item.get("packet_count")
                ),
                -_safe_int(
                    item.get("byte_count")
                ),
            )
        )

        flagged_matching = [
            flow
            for flow in matching_flows
            if bool(flow.get("flagged"))
        ]

        feature_evidence = _flow_feature_evidence(
            matching_flows
        )

        window_timestamp_strings = [
            str(value)
            for value in latest_states[
                "Timestamp"
            ].tolist()
        ]

        return {
            "available": True,
            "method": (
                "Temporal PCAP evidence-to-prediction "
                "window correspondence"
            ),
            "model_attribution": True,
            "causal_attribution": False,
            "attribution_type": (
                "input-window correspondence"
            ),
            "sequence_length": int(
                sequence_length
            ),
            "window_seconds": float(
                window_seconds
            ),
            "prediction_input_window": {
                "start_timestamp": window_start,
                "end_timestamp": window_end,
                "start_iso": (
                    latest_states["Timestamp"].iloc[0].isoformat()
                    if hasattr(
                        latest_states["Timestamp"].iloc[0],
                        "isoformat",
                    )
                    else window_timestamp_strings[0]
                ),
                "end_iso": (
                    pd.Timestamp(window_end, unit="s").isoformat()
                ),
                "state_timestamps": (
                    window_timestamp_strings
                ),
                "state_count": int(
                    sequence_length
                ),
            },
            "matched_flow_count": int(
                len(matching_flows)
            ),
            "matched_flagged_flow_count": int(
                len(flagged_matching)
            ),
            "matched_packet_count": int(
                feature_evidence["packet_count"]
            ),
            "matched_byte_count": int(
                feature_evidence["byte_count"]
            ),
            "feature_correspondence": feature_evidence,
            "flagged_flows": (
                flagged_matching[:limit]
            ),
            "top_matching_flows": (
                matching_flows[:limit]
            ),
            "note": (
                "Matched flows are temporally associated with the "
                "five-state input history used for the latest "
                "world-model prediction. This is input-window "
                "evidence correspondence, not causal attribution "
                "and not packet-level SHAP."
            ),
        }

    except Exception as exc:
        return {
            "available": False,
            "method": (
                "Temporal PCAP evidence-to-prediction "
                "window correspondence"
            ),
            "model_attribution": False,
            "causal_attribution": False,
            "reason": (
                "Unable to construct temporal attribution: "
                f"{exc}"
            ),
        }
