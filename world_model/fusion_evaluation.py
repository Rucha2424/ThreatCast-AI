import sys
from pathlib import Path

import numpy as np
import torch

PROJECT_ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(PROJECT_ROOT))

from backend.ml.inference import predict_early_warning
from fusion import ThreatFusion
from graph_encoder import GraphSAGEEncoder, graph_mean_pool
from temporal_model import TemporalStateEncoder
from train_world_model import normalize_features


GRAPH_FILE = PROJECT_ROOT / "world_model" / "packet_graphs.pt"
MODEL_DIR = PROJECT_ROOT / "world_model" / "checkpoints"

SEQUENCE_LENGTH = 5
LATENT_DIM = 64


def build_embeddings(graphs, encoder):

    embeddings = []

    encoder.eval()

    with torch.no_grad():

        for graph in graphs:

            x = graph["node_features"].float()
            edge_index = graph["edge_index"].long()

            node_count = x.shape[0]

            adjacency = torch.zeros(
                node_count,
                node_count
            )

            if edge_index.numel() > 0:

                src = edge_index[0]
                dst = edge_index[1]

                adjacency[src, dst] = 1.0

            adjacency.fill_diagonal_(1.0)

            node_embeddings = encoder(
                x,
                adjacency
            )

            graph_embedding = graph_mean_pool(
                node_embeddings
            ).squeeze(0)

            embeddings.append(
                graph_embedding
            )

    return torch.stack(embeddings)


def get_flow_probability():

    sequence = np.array(
        [
            [
                10, 100, 5000, 2500,
                1.0, 10.0, 500.0,
                0.0, 0.0, 0.0, 0.0, 0.0
            ],
            [
                12, 120, 6000, 3000,
                1.1, 10.0, 500.0,
                2.0, 20.0, 1000.0, 500.0, 0.1
            ],
            [
                15, 150, 7500, 3750,
                1.2, 10.0, 500.0,
                3.0, 30.0, 1500.0, 750.0, 0.1
            ],
            [
                18, 180, 9000, 4500,
                1.3, 10.0, 500.0,
                3.0, 30.0, 1500.0, 750.0, 0.1
            ],
            [
                20, 200, 10000, 5000,
                1.4, 10.0, 500.0,
                2.0, 20.0, 1000.0, 500.0, 0.1
            ],
        ],
        dtype=np.float32
    )

    result = predict_early_warning(
        sequence.tolist()
    )

    return result["probability"]


def main():

    print("=" * 70)
    print("THREATCAST - FUSION EVALUATION")
    print("=" * 70)

    # --------------------------------------------------
    # FLOW STREAM
    # --------------------------------------------------

    flow_probability = get_flow_probability()

    print()
    print("FLOW STREAM")
    print("-" * 70)
    print(
        f"CTU13 LSTM probability: "
        f"{flow_probability:.6f}"
    )

    # --------------------------------------------------
    # PACKET STREAM
    # --------------------------------------------------

    print()
    print("PACKET STREAM")
    print("-" * 70)

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    graphs, _, _ = normalize_features(
        graphs
    )

    encoder = GraphSAGEEncoder(
        node_features=2,
        hidden_dim=64,
        output_dim=64
    )

    encoder.load_state_dict(
        torch.load(
            MODEL_DIR / "graph_encoder.pt",
            map_location="cpu",
            weights_only=True
        )
    )

    embeddings = build_embeddings(
        graphs,
        encoder
    )

    temporal_encoder = TemporalStateEncoder(
        input_dim=64,
        hidden_dim=64
    )

    temporal_encoder.load_state_dict(
        torch.load(
            MODEL_DIR / "temporal_encoder.pt",
            map_location="cpu",
            weights_only=True
        )
    )

    temporal_encoder.eval()

    history = embeddings[
        :SEQUENCE_LENGTH
    ].unsqueeze(0)

    with torch.no_grad():

        packet_state = temporal_encoder(
            history
        )

    packet_norm = torch.norm(
        packet_state
    ).item()

    print(
        f"Packet latent norm: "
        f"{packet_norm:.6f}"
    )

    # --------------------------------------------------
    # NORMALIZED PACKET SIGNAL
    # --------------------------------------------------

    packet_signal = torch.sigmoid(
        torch.tensor(
            packet_norm
        )
    ).item()

    flow_signal = float(
        flow_probability
    )

    print(
        f"Flow signal: "
        f"{flow_signal:.6f}"
    )

    print(
        f"Packet signal: "
        f"{packet_signal:.6f}"
    )

    # --------------------------------------------------
    # TRANSPARENT FUSION
    # --------------------------------------------------

    fused_signal = (
        0.5 * flow_signal
        +
        0.5 * packet_signal
    )

    print()
    print("=" * 70)
    print("FUSION")
    print("=" * 70)

    print(
        "Fusion rule: "
        "0.5 × flow + 0.5 × packet"
    )

    print(
        f"Fused threat signal: "
        f"{fused_signal:.6f}"
    )

    print(
        f"Fused threat signal (%): "
        f"{fused_signal * 100:.2f}%"
    )

    print()
    print("=" * 70)
    print("IMPORTANT")
    print("=" * 70)

    print(
        "This is an integration/calibration experiment."
    )

    print(
        "The fused signal is NOT an independently "
        "trained attack probability."
    )

    print(
        "CTU13 and DAPT2020 are not temporally aligned."
    )

    print(
        "No attack labels were fabricated."
    )

    print()
    print("Flow + Packet fusion evaluation: OK")


if __name__ == "__main__":
    main()