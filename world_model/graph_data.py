from pathlib import Path

import pandas as pd
import torch


PROJECT_ROOT = Path(__file__).resolve().parents[1]

PACKET_FEATURE_PATH = (
    PROJECT_ROOT
    / "packet_features"
    / "packet_features_30s.csv"
)


PACKET_FEATURES = [
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


def load_packet_states():

    if not PACKET_FEATURE_PATH.exists():
        raise FileNotFoundError(
            f"Packet feature dataset not found: "
            f"{PACKET_FEATURE_PATH}"
        )

    df = pd.read_csv(
        PACKET_FEATURE_PATH
    )

    missing = [
        feature
        for feature in PACKET_FEATURES
        if feature not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing packet features: {missing}"
        )

    return df


def build_state_tensor(df):

    values = df[
        PACKET_FEATURES
    ].astype("float32").values

    return torch.tensor(
        values,
        dtype=torch.float32
    )


def build_window_graph(
    state_features
):
    feature_count = state_features.shape[0]

    node_features = state_features.unsqueeze(0)

    adjacency = torch.ones(
        1,
        1,
        dtype=torch.float32
    )

    return node_features, adjacency


if __name__ == "__main__":

    df = load_packet_states()

    states = build_state_tensor(df)

    print("=" * 70)
    print("THREATCAST - WORLD MODEL DATA VALIDATION")
    print("=" * 70)
    print(f"Packet states: {len(df):,}")
    print(f"Packet features: {len(PACKET_FEATURES)}")
    print(f"State tensor: {tuple(states.shape)}")

    node_features, adjacency = (
        build_window_graph(states[0])
    )

    print(
        f"Node tensor: {tuple(node_features.shape)}"
    )

    print(
        f"Adjacency tensor: {tuple(adjacency.shape)}"
    )

    print("World-model data loader: OK")