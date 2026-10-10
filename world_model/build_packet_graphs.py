from pathlib import Path
from collections import defaultdict

import pandas as pd
import torch

from scapy.all import PcapReader, IP, TCP, UDP


PROJECT_ROOT = Path(__file__).resolve().parents[1]

PCAP_PATH = (
    PROJECT_ROOT
    / "data"
    / "DAPT2020"
    / "archive"
    / "pcap-data"
    / "enp0s3-monday.pcap"
)

OUTPUT_PATH = (
    PROJECT_ROOT
    / "world_model"
    / "packet_graphs.pt"
)

WINDOW_SECONDS = 30


def get_protocol(packet):

    if TCP in packet:
        return "TCP"

    if UDP in packet:
        return "UDP"

    return "OTHER"


def process_packet(
    packet,
    window
):

    if IP not in packet:
        return

    ip = packet[IP]

    source = ip.src
    destination = ip.dst

    edge_key = (
        source,
        destination
    )

    window["nodes"].add(source)
    window["nodes"].add(destination)

    edge = window["edges"][edge_key]

    edge["packet_count"] += 1
    edge["bytes"] += len(packet)

    edge["protocols"].add(
        get_protocol(packet)
    )

    if TCP in packet:

        flags = int(
            packet[TCP].flags
        )

        if flags & 0x02:
            edge["syn"] += 1

        if flags & 0x10:
            edge["ack"] += 1

        if flags & 0x04:
            edge["rst"] += 1


def create_graph_snapshot(
    window
):

    nodes = sorted(
        window["nodes"]
    )

    node_index = {
        node: i
        for i, node in enumerate(nodes)
    }

    node_packet_count = defaultdict(int)
    node_bytes = defaultdict(int)

    for (
        source,
        destination
    ), edge in window["edges"].items():

        node_packet_count[
            source
        ] += edge["packet_count"]

        node_packet_count[
            destination
        ] += edge["packet_count"]

        node_bytes[
            source
        ] += edge["bytes"]

        node_bytes[
            destination
        ] += edge["bytes"]

    node_features = []

    for node in nodes:

        node_features.append([
            node_packet_count[node],
            node_bytes[node],
        ])

    edge_index = []
    edge_features = []

    for (
        source,
        destination
    ), edge in window["edges"].items():

        edge_index.append([
            node_index[source],
            node_index[destination],
        ])

        edge_features.append([
            edge["packet_count"],
            edge["bytes"],
            edge["syn"],
            edge["ack"],
            edge["rst"],
        ])

    if edge_index:

        edge_index = torch.tensor(
            edge_index,
            dtype=torch.long
        ).t().contiguous()

    else:

        edge_index = torch.empty(
            (2, 0),
            dtype=torch.long
        )

    node_features = torch.tensor(
        node_features,
        dtype=torch.float32
    )

    edge_features = torch.tensor(
        edge_features,
        dtype=torch.float32
    )

    return {
        "nodes": nodes,
        "node_features": node_features,
        "edge_index": edge_index,
        "edge_features": edge_features,
    }


def build_graphs():

    if not PCAP_PATH.exists():

        raise FileNotFoundError(
            f"PCAP not found:\n{PCAP_PATH}"
        )

    print("=" * 70)
    print("THREATCAST - DYNAMIC PCAP GRAPH GENERATION")
    print("=" * 70)

    windows = {}

    first_timestamp = None

    packet_count = 0

    print(
        f"PCAP: {PCAP_PATH}"
    )

    print()
    print("Reading PCAP...")

    with PcapReader(
        str(PCAP_PATH)
    ) as reader:

        for packet in reader:

            packet_count += 1

            try:

                timestamp = float(
                    packet.time
                )

            except Exception:

                continue

            if first_timestamp is None:

                first_timestamp = timestamp

            window_id = int(
                (
                    timestamp
                    - first_timestamp
                )
                // WINDOW_SECONDS
            )

            if window_id not in windows:

                windows[window_id] = {
                    "nodes": set(),
                    "edges": defaultdict(
                        lambda: {
                            "packet_count": 0,
                            "bytes": 0,
                            "syn": 0,
                            "ack": 0,
                            "rst": 0,
                            "protocols": set(),
                        }
                    ),
                }

            process_packet(
                packet,
                windows[window_id]
            )

            if packet_count % 100000 == 0:

                print(
                    f"Packets processed: "
                    f"{packet_count:,}"
                )

    print()
    print(
        f"Packets processed: "
        f"{packet_count:,}"
    )

    print(
        f"Graph windows: "
        f"{len(windows):,}"
    )

    graphs = []

    for window_id in sorted(
        windows
    ):

        graph = create_graph_snapshot(
            windows[window_id]
        )

        graph["window_id"] = window_id

        graphs.append(graph)

    torch.save(
        graphs,
        OUTPUT_PATH
    )

    print()
    print("=" * 70)
    print("GRAPH GENERATION COMPLETE")
    print("=" * 70)

    print(
        f"Graph snapshots: "
        f"{len(graphs):,}"
    )

    if graphs:

        node_counts = [
            len(graph["nodes"])
            for graph in graphs
        ]

        edge_counts = [
            graph["edge_index"].shape[1]
            for graph in graphs
        ]

        print(
            f"Average nodes/window: "
            f"{sum(node_counts) / len(node_counts):.2f}"
        )

        print(
            f"Average edges/window: "
            f"{sum(edge_counts) / len(edge_counts):.2f}"
        )

        print(
            f"First graph nodes: "
            f"{len(graphs[0]['nodes'])}"
        )

        print(
            f"First graph edges: "
            f"{graphs[0]['edge_index'].shape[1]}"
        )

    print()
    print("Output:")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    build_graphs()