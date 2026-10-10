from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

import math

import numpy as np
import pandas as pd

from backend.ml.input_pipeline import (
    dataframe_to_sequence,
)

from backend.ml.inference import (
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
)


# ---------------------------------------------------------------------
# Packet-level evidence fields
# ---------------------------------------------------------------------

PACKET_EVIDENCE_FIELDS = [
    "Packet_Count",
    "Avg_Packet_Size",
    "Packet_Size_Variance",
    "TTL_Mean",
    "TTL_Variance",
    "TCP_Window_Mean",
    "TCP_Window_Variance",
    "TCP_SYN_Count",
    "TCP_ACK_Count",
    "TCP_RST_Count",
    "TCP_FIN_Count",
    "TCP_PSH_Count",
    "Fragmented_Packet_Count",
    "Unique_Source_IPs",
    "Unique_Destination_IPs",
    "Unique_Destination_Ports",
    "Max_Unique_Ports_Per_Source",
    "Port_Scan_Signature",
    "Scan_Entropy",
    "Window_Duration",
]


# ---------------------------------------------------------------------
# Scapy loader
# ---------------------------------------------------------------------

def _load_scapy():
    """
    Import Scapy lazily.

    This keeps CSV-only inference usable even if Scapy is not installed,
    while PCAP inference gives a clear dependency error.
    """

    try:
        from scapy.all import (
            IP,
            IPv6,
            TCP,
            UDP,
            ICMP,
            PcapReader,
        )

        return {
            "IP": IP,
            "IPv6": IPv6,
            "TCP": TCP,
            "UDP": UDP,
            "ICMP": ICMP,
            "PcapReader": PcapReader,
        }

    except ImportError as exc:
        raise RuntimeError(
            "PCAP support requires Scapy. "
            "Install it with: pip install scapy"
        ) from exc


# ---------------------------------------------------------------------
# Numeric helpers
# ---------------------------------------------------------------------

def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        value = float(value)

        if not np.isfinite(value):
            return default

        return value

    except (TypeError, ValueError):
        return default


def _variance(values: list[float]) -> float:
    if not values:
        return 0.0

    if len(values) == 1:
        return 0.0

    return float(np.var(values))


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0

    return float(np.mean(values))


def _shannon_entropy(values: list[Any]) -> float:
    """
    Shannon entropy over a discrete sequence.

    Used here for destination-port diversity.
    """

    if not values:
        return 0.0

    counts: dict[Any, int] = defaultdict(int)

    for value in values:
        counts[value] += 1

    total = float(len(values))
    entropy = 0.0

    for count in counts.values():
        probability = count / total

        if probability > 0.0:
            entropy -= probability * math.log2(probability)

    return float(entropy)


# ---------------------------------------------------------------------
# TCP flag helpers
# ---------------------------------------------------------------------

def _tcp_flag_present(flags: Any, flag: str) -> bool:
    """
    Safely inspect a Scapy TCP flags object.
    """

    if flags is None:
        return False

    try:
        return flag in flags
    except TypeError:
        return False


# ---------------------------------------------------------------------
# Packet extraction
# ---------------------------------------------------------------------

def _extract_packet(packet, scapy: dict) -> dict[str, Any] | None:
    """
    Convert one Scapy packet into a normalized record.

    Only IP/IPv6 traffic is used by the world-model feature builder.
    """

    IP = scapy["IP"]
    IPv6 = scapy["IPv6"]
    TCP = scapy["TCP"]
    UDP = scapy["UDP"]
    ICMP = scapy["ICMP"]

    # ---------------------------------------------------------------
    # Timestamp
    # ---------------------------------------------------------------

    timestamp = _safe_float(
        getattr(packet, "time", None),
        default=float("nan"),
    )

    if not np.isfinite(timestamp):
        return None

    # ---------------------------------------------------------------
    # Network layer
    # ---------------------------------------------------------------

    if packet.haslayer(IP):
        ip_layer = packet[IP]

        src_ip = str(ip_layer.src)
        dst_ip = str(ip_layer.dst)

        ttl = _safe_float(
            getattr(ip_layer, "ttl", 0.0)
        )

        protocol = int(
            getattr(ip_layer, "proto", 0)
        )

        try:
            fragmented = bool(
                int(getattr(ip_layer, "frag", 0)) > 0
                or "MF" in getattr(ip_layer, "flags", "")
            )
        except (TypeError, ValueError):
            fragmented = False

    elif packet.haslayer(IPv6):
        ip_layer = packet[IPv6]

        src_ip = str(ip_layer.src)
        dst_ip = str(ip_layer.dst)

        ttl = _safe_float(
            getattr(ip_layer, "hlim", 0.0)
        )

        protocol = int(
            getattr(ip_layer, "nh", 0)
        )

        fragmented = False

    else:
        return None

    # ---------------------------------------------------------------
    # Packet size
    # ---------------------------------------------------------------

    try:
        packet_size = int(len(packet))
    except Exception:
        packet_size = 0

    # ---------------------------------------------------------------
    # Transport layer
    # ---------------------------------------------------------------

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

        src_port = int(
            getattr(tcp, "sport", 0)
        )

        dst_port = int(
            getattr(tcp, "dport", 0)
        )

        tcp_window = _safe_float(
            getattr(tcp, "window", 0.0)
        )

        flags = getattr(tcp, "flags", None)

        syn = _tcp_flag_present(flags, "S")
        ack = _tcp_flag_present(flags, "A")
        rst = _tcp_flag_present(flags, "R")
        fin = _tcp_flag_present(flags, "F")
        psh = _tcp_flag_present(flags, "P")

    elif packet.haslayer(UDP):

        udp = packet[UDP]

        src_port = int(
            getattr(udp, "sport", 0)
        )

        dst_port = int(
            getattr(udp, "dport", 0)
        )

    elif packet.haslayer(ICMP):
        # No ports for ICMP.
        src_port = 0
        dst_port = 0

    # ---------------------------------------------------------------
    # Protocol normalization
    # ---------------------------------------------------------------

    if packet.haslayer(TCP):
        protocol_name = "TCP"

    elif packet.haslayer(UDP):
        protocol_name = "UDP"

    elif packet.haslayer(ICMP):
        protocol_name = "ICMP"

    else:
        protocol_name = str(protocol)

    return {
        "timestamp": timestamp,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "protocol": protocol_name,
        "protocol_number": protocol,
        "packet_size": packet_size,
        "ttl": ttl,
        "tcp_window": tcp_window,
        "syn": syn,
        "ack": ack,
        "rst": rst,
        "fin": fin,
        "psh": psh,
        "fragmented": fragmented,
    }


# ---------------------------------------------------------------------
# Temporal aggregation
# ---------------------------------------------------------------------

def _build_state(
    packets: list[dict[str, Any]],
    window_start: float,
    window_end: float,
) -> dict[str, float]:
    """
    Convert packets inside one temporal window into:

    - the 12 world-model features
    - packet-level evidence features

    The world-model features remain exactly the existing 12 features.
    """

    if not packets:
        return {
            feature: 0.0
            for feature in FEATURE_NAMES
        } | {
            field: 0.0
            for field in PACKET_EVIDENCE_FIELDS
        }

    # ---------------------------------------------------------------
    # Flow aggregation
    # ---------------------------------------------------------------

    flows: dict[
        tuple[Any, ...],
        dict[str, Any],
    ] = {}

    source_bytes: dict[str, int] = defaultdict(int)

    for packet in packets:

        flow_key = (
            packet["src_ip"],
            packet["dst_ip"],
            packet["src_port"],
            packet["dst_port"],
            packet["protocol"],
        )

        timestamp = packet["timestamp"]
        packet_size = packet["packet_size"]

        if flow_key not in flows:

            flows[flow_key] = {
                "first_seen": timestamp,
                "last_seen": timestamp,
                "packets": 0,
                "bytes": 0,
                "src_bytes": 0,
            }

        flow = flows[flow_key]

        flow["first_seen"] = min(
            flow["first_seen"],
            timestamp,
        )

        flow["last_seen"] = max(
            flow["last_seen"],
            timestamp,
        )

        flow["packets"] += 1
        flow["bytes"] += packet_size
        flow["src_bytes"] += packet_size

        source_bytes[packet["src_ip"]] += packet_size

    flow_count = len(flows)

    total_packets = len(packets)

    total_bytes = sum(
        flow["bytes"]
        for flow in flows.values()
    )

    total_source_bytes = sum(
        flow["src_bytes"]
        for flow in flows.values()
    )

    durations = [
        max(
            0.0,
            float(flow["last_seen"] - flow["first_seen"]),
        )
        for flow in flows.values()
    ]

    avg_duration = _mean(durations)

    avg_packets_per_flow = (
        total_packets / flow_count
        if flow_count > 0
        else 0.0
    )

    avg_bytes_per_flow = (
        total_bytes / flow_count
        if flow_count > 0
        else 0.0
    )

    # ---------------------------------------------------------------
    # Packet evidence
    # ---------------------------------------------------------------

    packet_sizes = [
        float(packet["packet_size"])
        for packet in packets
    ]

    ttls = [
        float(packet["ttl"])
        for packet in packets
        if packet["ttl"] > 0
    ]

    tcp_windows = [
        float(packet["tcp_window"])
        for packet in packets
        if packet["tcp_window"] >= 0
    ]

    source_ips = {
        packet["src_ip"]
        for packet in packets
    }

    destination_ips = {
        packet["dst_ip"]
        for packet in packets
    }

    destination_ports = {
        int(packet["dst_port"])
        for packet in packets
        if int(packet["dst_port"]) > 0
    }

    ports_per_source: dict[str, set[int]] = defaultdict(set)

    for packet in packets:

        destination_port = int(
            packet["dst_port"]
        )

        if destination_port > 0:
            ports_per_source[
                packet["src_ip"]
            ].add(destination_port)

    max_unique_ports_per_source = max(
        (
            len(ports)
            for ports in ports_per_source.values()
        ),
        default=0,
    )

    destination_port_sequence = [
        int(packet["dst_port"])
        for packet in packets
        if int(packet["dst_port"]) > 0
    ]

    unique_port_count = len(
        destination_ports
    )

    port_scan_signature = (
        float(max_unique_ports_per_source)
        / max(
            1.0,
            float(len(source_ips)),
        )
    )

    window_duration = max(
        0.0,
        float(window_end - window_start),
    )

    # ---------------------------------------------------------------
    # Existing 12 world-model features
    # ---------------------------------------------------------------

    state = {
        "Flow_Count": float(flow_count),

        "Total_Packets": float(
            total_packets
        ),

        "Total_Bytes": float(
            total_bytes
        ),

        "Total_Source_Bytes": float(
            total_source_bytes
        ),

        "Avg_Duration": float(
            avg_duration
        ),

        "Avg_Packets_Per_Flow": float(
            avg_packets_per_flow
        ),

        "Avg_Bytes_Per_Flow": float(
            avg_bytes_per_flow
        ),

        # Change features are added after all temporal
        # states have been constructed.
        "Flow_Count_Change": 0.0,
        "Total_Packets_Change": 0.0,
        "Total_Bytes_Change": 0.0,
        "Total_Source_Bytes_Change": 0.0,
        "Avg_Duration_Change": 0.0,
    }

    # ---------------------------------------------------------------
    # Packet evidence
    # ---------------------------------------------------------------

    state.update(
        {
            "Packet_Count": float(
                total_packets
            ),

            "Avg_Packet_Size": _mean(
                packet_sizes
            ),

            "Packet_Size_Variance": _variance(
                packet_sizes
            ),

            "TTL_Mean": _mean(
                ttls
            ),

            "TTL_Variance": _variance(
                ttls
            ),

            "TCP_Window_Mean": _mean(
                tcp_windows
            ),

            "TCP_Window_Variance": _variance(
                tcp_windows
            ),

            "TCP_SYN_Count": float(
                sum(
                    packet["syn"]
                    for packet in packets
                )
            ),

            "TCP_ACK_Count": float(
                sum(
                    packet["ack"]
                    for packet in packets
                )
            ),

            "TCP_RST_Count": float(
                sum(
                    packet["rst"]
                    for packet in packets
                )
            ),

            "TCP_FIN_Count": float(
                sum(
                    packet["fin"]
                    for packet in packets
                )
            ),

            "TCP_PSH_Count": float(
                sum(
                    packet["psh"]
                    for packet in packets
                )
            ),

            "Fragmented_Packet_Count": float(
                sum(
                    packet["fragmented"]
                    for packet in packets
                )
            ),

            "Unique_Source_IPs": float(
                len(source_ips)
            ),

            "Unique_Destination_IPs": float(
                len(destination_ips)
            ),

            "Unique_Destination_Ports": float(
                unique_port_count
            ),

            "Max_Unique_Ports_Per_Source": float(
                max_unique_ports_per_source
            ),

            "Port_Scan_Signature": float(
                port_scan_signature
            ),

            "Scan_Entropy": _shannon_entropy(
                destination_port_sequence
            ),

            "Window_Duration": float(
                window_duration
            ),
        }
    )

    return state


# ---------------------------------------------------------------------
# Change features
# ---------------------------------------------------------------------

def _add_change_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:

    dataframe = dataframe.copy()

    for source, target in [
        ("Flow_Count", "Flow_Count_Change"),
        ("Total_Packets", "Total_Packets_Change"),
        ("Total_Bytes", "Total_Bytes_Change"),
        (
            "Total_Source_Bytes",
            "Total_Source_Bytes_Change",
        ),
        ("Avg_Duration", "Avg_Duration_Change"),
    ]:

        dataframe[target] = (
            dataframe[source]
            .diff()
            .fillna(0.0)
        )

    return dataframe


# ---------------------------------------------------------------------
# PCAP -> temporal dataframe
# ---------------------------------------------------------------------

def load_pcap_features(
    path: str | Path,
    window_seconds: float = 30.0,
    timeline_start: float | None = None,
    timeline_end: float | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:

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
            "PCAP input must use .pcap, .pcapng, or .cap."
        )

    if window_seconds <= 0:
        raise ValueError(
            "window_seconds must be greater than zero."
        )

    scapy = _load_scapy()

    PcapReader = scapy["PcapReader"]

    packets_by_window: dict[
        int,
        list[dict[str, Any]],
    ] = defaultdict(list)

    packet_count = 0
    ignored_packet_count = 0

    first_timestamp = None
    last_timestamp = None

    # ---------------------------------------------------------------
    # Read packets
    # ---------------------------------------------------------------

    try:

        with PcapReader(str(path)) as reader:

            for packet in reader:

                record = _extract_packet(
                    packet,
                    scapy,
                )

                if record is None:

                    ignored_packet_count += 1
                    continue

                timestamp = record["timestamp"]

                if first_timestamp is None:
                    first_timestamp = timestamp

                last_timestamp = timestamp

                relative_time = (
                    timestamp - first_timestamp
                )

                window_index = int(
                    relative_time
                    // window_seconds
                )

                packets_by_window[
                    window_index
                ].append(record)

                packet_count += 1

    except Exception as exc:

        raise RuntimeError(
            f"Unable to read PCAP file '{path}': "
            f"{exc}"
        ) from exc

    if not packets_by_window:

        raise ValueError(
            "No usable IP/IPv6 packets were found "
            "in the supplied PCAP."
        )

    # ---------------------------------------------------------------
    # Build chronological temporal states
    #
    # Keep empty temporal windows as explicit zero states so the
    # world model receives a continuous temporal history.
    # ---------------------------------------------------------------

    min_window_index = min(packets_by_window)
    max_window_index = max(packets_by_window)

    states = []

    for window_index in range(
        min_window_index,
        max_window_index + 1,
    ):

        window_start = (
            first_timestamp
            + window_index * window_seconds
        )

        window_end = (
            window_start
            + window_seconds
        )

        state = _build_state(
            packets_by_window.get(
                window_index,
                [],
            ),
            window_start,
            window_end,
        )

        state["Timestamp"] = pd.to_datetime(
            window_start,
            unit="s",
        )

        states.append(state)

    dataframe = pd.DataFrame(states)

    dataframe = dataframe.sort_values(
        "Timestamp"
    ).reset_index(
        drop=True
    )

    empty_window_count = int(
        len(dataframe) - len(packets_by_window)
    )

    dataframe = _add_change_features(
        dataframe
    )

    # ---------------------------------------------------------------
    # Validate model features
    # ---------------------------------------------------------------

    missing = [
        feature
        for feature in FEATURE_NAMES
        if feature not in dataframe.columns
    ]

    if missing:

        raise ValueError(
            "PCAP conversion failed to produce "
            "required world-model features: "
            + ", ".join(missing)
        )

    values = (
        dataframe[
            FEATURE_NAMES
        ]
        .astype(float)
        .to_numpy()
    )

    if not np.isfinite(values).all():

        raise ValueError(
            "PCAP conversion produced NaN or "
            "infinite world-model features."
        )

    metadata = {
        "source_type": "pcap",
        "filename": path.name,
        "window_seconds": float(
            window_seconds
        ),
        "packet_count": int(
            packet_count
        ),
        "ignored_packet_count": int(
            ignored_packet_count
        ),
        "state_count": int(
            len(dataframe)
        ),
        "non_empty_state_count": int(
            len(packets_by_window)
        ),
        "empty_state_count": int(
            empty_window_count
        ),
        "first_packet_timestamp": (
            pd.to_datetime(
                first_timestamp,
                unit="s",
            ).isoformat()
            if first_timestamp is not None
            else None
        ),
        "last_packet_timestamp": (
            pd.to_datetime(
                last_timestamp,
                unit="s",
            ).isoformat()
            if last_timestamp is not None
            else None
        ),
        "feature_names": FEATURE_NAMES,
        "sequence_length": SEQUENCE_LENGTH,
        "packet_evidence_fields": (
            PACKET_EVIDENCE_FIELDS
        ),
    }

    return dataframe, metadata


# ---------------------------------------------------------------------
# Packet-level evidence
# ---------------------------------------------------------------------

def summarize_packet_evidence(
    dataframe: pd.DataFrame,
) -> dict[str, Any]:

    if dataframe.empty:

        return {
            "available": False,
            "reason": "No packet evidence available.",
        }

    latest = dataframe.iloc[-1]

    evidence = {
        "available": True,
        "source": "PCAP packet-level telemetry",
        "packet_count": float(
            latest.get(
                "Packet_Count",
                0.0,
            )
        ),
        "avg_packet_size": float(
            latest.get(
                "Avg_Packet_Size",
                0.0,
            )
        ),
        "packet_size_variance": float(
            latest.get(
                "Packet_Size_Variance",
                0.0,
            )
        ),
        "ttl_mean": float(
            latest.get(
                "TTL_Mean",
                0.0,
            )
        ),
        "tcp_window_mean": float(
            latest.get(
                "TCP_Window_Mean",
                0.0,
            )
        ),
        "syn_count": float(
            latest.get(
                "TCP_SYN_Count",
                0.0,
            )
        ),
        "ack_count": float(
            latest.get(
                "TCP_ACK_Count",
                0.0,
            )
        ),
        "rst_count": float(
            latest.get(
                "TCP_RST_Count",
                0.0,
            )
        ),
        "fin_count": float(
            latest.get(
                "TCP_FIN_Count",
                0.0,
            )
        ),
        "psh_count": float(
            latest.get(
                "TCP_PSH_Count",
                0.0,
            )
        ),
        "fragmented_packet_count": float(
            latest.get(
                "Fragmented_Packet_Count",
                0.0,
            )
        ),
        "unique_source_ips": float(
            latest.get(
                "Unique_Source_IPs",
                0.0,
            )
        ),
        "unique_destination_ips": float(
            latest.get(
                "Unique_Destination_IPs",
                0.0,
            )
        ),
        "unique_destination_ports": float(
            latest.get(
                "Unique_Destination_Ports",
                0.0,
            )
        ),
        "max_unique_ports_per_source": float(
            latest.get(
                "Max_Unique_Ports_Per_Source",
                0.0,
            )
        ),
        "port_scan_signature": float(
            latest.get(
                "Port_Scan_Signature",
                0.0,
            )
        ),
        "scan_entropy": float(
            latest.get(
                "Scan_Entropy",
                0.0,
            )
        ),
        "window_duration": float(
            latest.get(
                "Window_Duration",
                0.0,
            )
        ),
    }

    return evidence


# ---------------------------------------------------------------------
# PCAP inference payload
# ---------------------------------------------------------------------

def prepare_uploaded_pcap(
    path: str | Path,
    timeline_start: float | None = None,
    timeline_end: float | None = None,
) -> dict[str, Any]:

    dataframe, metadata = load_pcap_features(
        path,
        window_seconds=30.0,
        timeline_start=timeline_start,
        timeline_end=timeline_end,
    )

    original_state_count = len(dataframe)

    if original_state_count == 0:
        raise ValueError(
            "PCAP produced no temporal states. "
            "Ensure the capture contains decodable network packets."
        )

    if original_state_count < SEQUENCE_LENGTH:
        padding_count = SEQUENCE_LENGTH - original_state_count
        first_state = dataframe.iloc[[0]].copy()
        padding = pd.concat(
            [first_state] * padding_count,
            ignore_index=True,
        )
        dataframe = pd.concat(
            [padding, dataframe],
            ignore_index=True,
        )

    sequence = dataframe_to_sequence(
        dataframe
    )

    timestamps = []

    if "Timestamp" in dataframe.columns:

        timestamps = [
            pd.Timestamp(value).isoformat()
            for value in dataframe.tail(
                SEQUENCE_LENGTH
            )["Timestamp"].tolist()
        ]

    packet_evidence = summarize_packet_evidence(
        dataframe
    )

    return {
        "dataframe": dataframe,

        "payload": {
            "feature_names": FEATURE_NAMES,
            "sequence_length": SEQUENCE_LENGTH,
            "timestamps": timestamps,
            "sequence": sequence,
            "state_count": len(dataframe),
            "original_state_count": original_state_count,
        },

        "packet_evidence": packet_evidence,

        "pcap_metadata": metadata,
    }
