from pathlib import Path
from collections import defaultdict
import math
import numpy as np
import pandas as pd

try:
    from scapy.all import PcapReader, IP, TCP, UDP
except ImportError:
    raise SystemExit(
        "Scapy is not installed. Run: pip install scapy"
    )

PROJECT_ROOT = Path(__file__).resolve().parents[1]

PCAP_PATH = (
    PROJECT_ROOT
    / "data"
    / "DAPT2020"
    / "archive"
    / "pcap-data"
    / "enp0s3-monday.pcap"
)

OUTPUT_DIR = PROJECT_ROOT / "packet_features"
OUTPUT_PATH = OUTPUT_DIR / "packet_features_30s.csv"

WINDOW_SECONDS = 30


def safe_mean(values):
    return float(np.mean(values)) if values else 0.0


def safe_variance(values):
    return float(np.var(values)) if values else 0.0


def entropy(values):
    if not values:
        return 0.0

    counts = pd.Series(values).value_counts().values.astype(float)
    probabilities = counts / counts.sum()

    return float(
        -np.sum(
            probabilities * np.log2(probabilities + 1e-12)
        )
    )


def packet_features(window_packets):
    packet_sizes = []
    ttl_values = []
    tcp_window_values = []

    tcp_syn = 0
    tcp_ack = 0
    tcp_rst = 0
    tcp_fin = 0
    tcp_psh = 0

    fragmented_packets = 0

    source_ips = set()
    destination_ips = set()
    destination_ports = set()

    source_port_activity = defaultdict(set)

    first_timestamp = None
    last_timestamp = None

    for packet in window_packets:

        try:
            timestamp = float(packet.time)

            if first_timestamp is None:
                first_timestamp = timestamp

            last_timestamp = timestamp

            packet_sizes.append(len(packet))

            if IP in packet:
                ip = packet[IP]

                ttl_values.append(int(ip.ttl))

                source_ips.add(ip.src)
                destination_ips.add(ip.dst)

                if getattr(ip, "flags", 0) & 1:
                    fragmented_packets += 1

            if TCP in packet:

                tcp = packet[TCP]

                tcp_window_values.append(
                    int(tcp.window)
                )

                flags = int(tcp.flags)

                if flags & 0x02:
                    tcp_syn += 1

                if flags & 0x10:
                    tcp_ack += 1

                if flags & 0x04:
                    tcp_rst += 1

                if flags & 0x01:
                    tcp_fin += 1

                if flags & 0x08:
                    tcp_psh += 1

                destination_ports.add(
                    int(tcp.dport)
                )

                source_port_activity[
                    packet[IP].src
                ].add(int(tcp.dport))

            elif UDP in packet:

                udp = packet[UDP]

                destination_ports.add(
                    int(udp.dport)
                )

                if IP in packet:
                    source_port_activity[
                        packet[IP].src
                    ].add(int(udp.dport))

        except Exception:
            continue

    unique_ports_per_source = [
        len(ports)
        for ports in source_port_activity.values()
    ]

    scan_entropy = entropy(
        list(destination_ports)
    )

    duration = 0.0

    if (
        first_timestamp is not None
        and last_timestamp is not None
    ):
        duration = max(
            0.0,
            last_timestamp - first_timestamp
        )

    return {
        "Packet_Count": len(window_packets),

        "Avg_Packet_Size": safe_mean(
            packet_sizes
        ),

        "Packet_Size_Variance": safe_variance(
            packet_sizes
        ),

        "TTL_Mean": safe_mean(
            ttl_values
        ),

        "TTL_Variance": safe_variance(
            ttl_values
        ),

        "TCP_Window_Mean": safe_mean(
            tcp_window_values
        ),

        "TCP_Window_Variance": safe_variance(
            tcp_window_values
        ),

        "TCP_SYN_Count": tcp_syn,
        "TCP_ACK_Count": tcp_ack,
        "TCP_RST_Count": tcp_rst,
        "TCP_FIN_Count": tcp_fin,
        "TCP_PSH_Count": tcp_psh,

        "Fragmented_Packet_Count": fragmented_packets,

        "Unique_Source_IPs": len(source_ips),
        "Unique_Destination_IPs": len(
            destination_ips
        ),

        "Unique_Destination_Ports": len(
            destination_ports
        ),

        "Max_Unique_Ports_Per_Source": (
            max(unique_ports_per_source)
            if unique_ports_per_source
            else 0
        ),

        "Port_Scan_Signature": int(
            any(
                count >= 10
                for count in unique_ports_per_source
            )
        ),

        "Scan_Entropy": scan_entropy,

        "Window_Duration": duration,
    }


def extract():

    if not PCAP_PATH.exists():
        raise FileNotFoundError(
            f"PCAP not found:\n{PCAP_PATH}"
        )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("=" * 78)
    print("THREATCAST - PACKET LEVEL PCAP FEATURE EXTRACTION")
    print("=" * 78)
    print(f"PCAP: {PCAP_PATH}")
    print(f"Window size: {WINDOW_SECONDS} seconds")
    print()

    windows = defaultdict(list)

    packet_count = 0
    first_timestamp = None
    last_timestamp = None

    print("Reading PCAP...")

    with PcapReader(str(PCAP_PATH)) as reader:

        for packet in reader:

            packet_count += 1

            try:
                timestamp = float(packet.time)
            except Exception:
                continue

            if first_timestamp is None:
                first_timestamp = timestamp

            last_timestamp = timestamp

            window_id = int(
                (timestamp - first_timestamp)
                // WINDOW_SECONDS
            )

            windows[window_id].append(
                packet
            )

            if packet_count % 100000 == 0:
                print(
                    f"Packets processed: "
                    f"{packet_count:,}"
                )

    print()
    print(
        f"Total packets processed: "
        f"{packet_count:,}"
    )

    print(
        f"30-second windows: "
        f"{len(windows):,}"
    )

    rows = []

    for window_id in sorted(windows):

        packets = windows[window_id]

        features = packet_features(
            packets
        )

        start_time = (
            first_timestamp
            + window_id * WINDOW_SECONDS
        )

        row = {
            "Window_ID": window_id,
            "Timestamp": pd.to_datetime(
                start_time,
                unit="s"
            ),
        }

        row.update(features)

        rows.append(row)

    df = pd.DataFrame(rows)

    if df.empty:
        raise RuntimeError(
            "No packet-level windows were generated."
        )

    df.to_csv(
        OUTPUT_PATH,
        index=False
    )

    print()
    print("=" * 78)
    print("EXTRACTION COMPLETE")
    print("=" * 78)
    print(f"Rows: {len(df):,}")
    print(f"Features: {len(df.columns):,}")
    print()
    print("Output:")
    print(OUTPUT_PATH)
    print()
    print("Columns:")
    for column in df.columns:
        print(f"  - {column}")


if __name__ == "__main__":
    extract()