from pathlib import Path

import torch

from graph_encoder import GraphSAGEEncoder, graph_mean_pool
from temporal_model import TemporalStateEncoder


PROJECT_ROOT = Path(__file__).resolve().parents[1]

GRAPH_PATH = (
    PROJECT_ROOT
    / "world_model"
    / "packet_graphs.pt"
)


def build_adjacency(edge_index, node_count):

    adjacency = torch.zeros(
        node_count,
        node_count,
        dtype=torch.float32
    )

    for i in range(edge_index.shape[1]):

        source = int(edge_index[0, i])
        destination = int(edge_index[1, i])

        adjacency[source, destination] = 1.0

    for i in range(node_count):
        adjacency[i, i] = 1.0

    return adjacency


def encode_graphs(graphs, encoder):

    graph_embeddings = []

    encoder.eval()

    with torch.no_grad():

        for graph in graphs:

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

            graph_embedding = graph_mean_pool(
                node_embeddings
            )

            graph_embeddings.append(
                graph_embedding.squeeze(0)
            )

    return torch.stack(
        graph_embeddings
    )


def main():

    print("=" * 70)
    print("THREATCAST - GRAPH → TEMPORAL PIPELINE")
    print("=" * 70)

    graphs = torch.load(
        GRAPH_PATH,
        weights_only=False
    )

    print(
        f"Graph snapshots: {len(graphs)}"
    )

    input_dim = graphs[0][
        "node_features"
    ].shape[1]

    graph_encoder = GraphSAGEEncoder(
        node_features=input_dim,
        hidden_dim=64,
        output_dim=64
    )

    graph_embeddings = encode_graphs(
        graphs,
        graph_encoder
    )

    print(
        f"Graph embeddings: "
        f"{tuple(graph_embeddings.shape)}"
    )

    sequence_length = 5

    if len(graph_embeddings) < sequence_length:
        raise RuntimeError(
            "Not enough graph snapshots."
        )

    sequence = graph_embeddings[
        :sequence_length
    ].unsqueeze(0)

    temporal_encoder = TemporalStateEncoder(
        input_dim=64,
        hidden_dim=64
    )

    temporal_state = temporal_encoder(
        sequence
    )

    print(
        f"Temporal input: "
        f"{tuple(sequence.shape)}"
    )

    print(
        f"Latent temporal state: "
        f"{tuple(temporal_state.shape)}"
    )

    print()
    print(
        "Graph → Temporal pipeline: OK"
    )


if __name__ == "__main__":
    main()