from pathlib import Path

import torch

from graph_encoder import (
    GraphSAGEEncoder,
    graph_mean_pool
)

from temporal_model import (
    TemporalStateEncoder
)

from rollout import (
    LatentStatePredictor,
    autoregressive_rollout
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

GRAPH_PATH = (
    PROJECT_ROOT
    / "world_model"
    / "packet_graphs.pt"
)


SEQUENCE_LENGTH = 5
LATENT_DIM = 64
FORECAST_STEPS = 3


def build_adjacency(
    edge_index,
    node_count
):

    adjacency = torch.zeros(
        node_count,
        node_count,
        dtype=torch.float32
    )

    for i in range(
        edge_index.shape[1]
    ):

        source = int(
            edge_index[0, i]
        )

        destination = int(
            edge_index[1, i]
        )

        adjacency[
            source,
            destination
        ] = 1.0

    for i in range(node_count):
        adjacency[i, i] = 1.0

    return adjacency


def encode_graph(
    graph,
    encoder
):

    node_features = graph[
        "node_features"
    ]

    edge_index = graph[
        "edge_index"
    ]

    adjacency = build_adjacency(
        edge_index,
        node_features.shape[0]
    )

    node_embeddings = encoder(
        node_features,
        adjacency
    )

    return graph_mean_pool(
        node_embeddings
    ).squeeze(0)


def main():

    print("=" * 70)
    print("THREATCAST - K-STEP WORLD MODEL FORECAST")
    print("=" * 70)

    graphs = torch.load(
        GRAPH_PATH,
        weights_only=False
    )

    print(
        f"Graph snapshots: {len(graphs)}"
    )

    graph_encoder = GraphSAGEEncoder(
        node_features=graphs[0][
            "node_features"
        ].shape[1],
        hidden_dim=LATENT_DIM,
        output_dim=LATENT_DIM
    )

    graph_encoder.eval()

    embeddings = []

    with torch.no_grad():

        for graph in graphs:

            embedding = encode_graph(
                graph,
                graph_encoder
            )

            embeddings.append(
                embedding
            )

    embeddings = torch.stack(
        embeddings
    )

    print(
        f"Graph embedding sequence: "
        f"{tuple(embeddings.shape)}"
    )

    temporal_encoder = TemporalStateEncoder(
        input_dim=LATENT_DIM,
        hidden_dim=LATENT_DIM
    )

    temporal_encoder.eval()

    history = embeddings[
        :SEQUENCE_LENGTH
    ].unsqueeze(0)

    with torch.no_grad():

        latent_state = temporal_encoder(
            history
        )

    print(
        f"Temporal history: "
        f"{tuple(history.shape)}"
    )

    print(
        f"Current latent state: "
        f"{tuple(latent_state.shape)}"
    )

    predictor = LatentStatePredictor(
        latent_dim=LATENT_DIM,
        hidden_dim=LATENT_DIM
    )

    rollout = autoregressive_rollout(
        predictor,
        latent_state,
        steps=FORECAST_STEPS
    )

    print(
        f"K-step forecast: "
        f"{tuple(rollout.shape)}"
    )

    for step in range(
        FORECAST_STEPS
    ):

        future_state = rollout[
            0,
            step
        ]

        magnitude = torch.norm(
            future_state
        ).item()

        print(
            f"T+{step + 1}: "
            f"latent norm = {magnitude:.4f}"
        )

    print()
    print("=" * 70)
    print("K-STEP WORLD MODEL FORECAST: OK")
    print("=" * 70)


if __name__ == "__main__":
    main()