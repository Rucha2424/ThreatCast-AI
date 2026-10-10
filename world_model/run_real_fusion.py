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


def build_packet_embeddings(graphs, encoder):

    embeddings = []

    encoder.eval()

    with torch.no_grad():

        for graph in graphs:

            node_features = (
                graph["node_features"]
                .float()
            )

            edge_index = (
                graph["edge_index"]
                .long()
            )

            node_count = node_features.shape[0]

            adjacency = torch.zeros(
                (node_count, node_count),
                dtype=torch.float32
            )

            if edge_index.numel() > 0:

                src = edge_index[0]
                dst = edge_index[1]

                adjacency[src, dst] = 1.0

            adjacency.fill_diagonal_(1.0)

            node_embeddings = encoder(
                node_features,
                adjacency
            )

            graph_embedding = graph_mean_pool(
                node_embeddings
            ).squeeze(0)

            embeddings.append(
                graph_embedding
            )

    return torch.stack(embeddings)


def main():

    print("=" * 70)
    print("THREATCAST - REAL FLOW + PACKET FUSION")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. Get a real CTU13 LSTM prediction
    # ---------------------------------------------------------

    print()
    print("Loading CTU13 LSTM...")

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

    flow_result = predict_early_warning(
        sequence.tolist()
    )

    flow_probability = flow_result[
        "probability"
    ]

    print(
        f"CTU13 LSTM probability: "
        f"{flow_probability:.6f}"
    )

    print(
        f"CTU13 warning: "
        f"{flow_result['warning']}"
    )

    # ---------------------------------------------------------
    # 2. Load real packet graphs
    # ---------------------------------------------------------

    print()
    print("Loading packet world model...")

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    graphs, _, _ = normalize_features(
        graphs
    )

    print(
        f"Packet graph snapshots: "
        f"{len(graphs)}"
    )

    # ---------------------------------------------------------
    # 3. Load trained graph encoder
    # ---------------------------------------------------------

    graph_encoder = GraphSAGEEncoder(
        node_features=2,
        hidden_dim=64,
        output_dim=LATENT_DIM
    )

    graph_encoder.load_state_dict(
        torch.load(
            MODEL_DIR / "graph_encoder.pt",
            map_location="cpu",
            weights_only=True
        )
    )

    packet_embeddings = build_packet_embeddings(
        graphs,
        graph_encoder
    )

    # ---------------------------------------------------------
    # 4. Get real temporal packet representation
    # ---------------------------------------------------------

    temporal_encoder = TemporalStateEncoder(
        input_dim=LATENT_DIM,
        hidden_dim=LATENT_DIM
    )

    temporal_encoder.load_state_dict(
        torch.load(
            MODEL_DIR / "temporal_encoder.pt",
            map_location="cpu",
            weights_only=True
        )
    )

    temporal_encoder.eval()

    history = packet_embeddings[
        :SEQUENCE_LENGTH
    ].unsqueeze(0)

    with torch.no_grad():

        packet_state = temporal_encoder(
            history
        )

    print(
        f"Packet representation: "
        f"{tuple(packet_state.shape)}"
    )

    # ---------------------------------------------------------
    # 5. Convert CTU13 probability into 64-D flow signal
    # ---------------------------------------------------------

    flow_signal = torch.full(
        (1, LATENT_DIM),
        float(flow_probability)
    )

    print(
        f"Flow representation: "
        f"{tuple(flow_signal.shape)}"
    )

    # ---------------------------------------------------------
    # 6. Real fusion
    # ---------------------------------------------------------

    fusion_model = ThreatFusion(
        flow_dim=LATENT_DIM,
        packet_dim=LATENT_DIM,
        hidden_dim=LATENT_DIM
    )

    fusion_model.eval()

    with torch.no_grad():

        fused, risk_logit, risk_probability = (
            fusion_model(
                flow_signal,
                packet_state
            )
        )

    print()
    print("=" * 70)
    print("FUSION RESULT")
    print("=" * 70)

    print(
        f"Flow signal: "
        f"{flow_probability:.6f}"
    )

    print(
        f"Packet latent norm: "
        f"{torch.norm(packet_state).item():.6f}"
    )

    print(
        f"Fused representation: "
        f"{tuple(fused.shape)}"
    )

    print(
        f"Fused risk probability: "
        f"{risk_probability.item():.6f}"
    )

    print()
    print("Real flow + packet fusion: OK")


if __name__ == "__main__":
    main()