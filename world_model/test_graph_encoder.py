from pathlib import Path

import torch

from graph_encoder import GraphSAGEEncoder


PROJECT_ROOT = Path(__file__).resolve().parents[1]

GRAPH_PATH = (
    PROJECT_ROOT
    / "world_model"
    / "packet_graphs.pt"
)


def main():

    print("=" * 70)
    print("THREATCAST - GRAPHSAGE VALIDATION")
    print("=" * 70)

    graphs = torch.load(
        GRAPH_PATH,
        weights_only=False
    )

    print(
        f"Graph snapshots: {len(graphs)}"
    )

    graph = graphs[0]

    node_features = graph[
        "node_features"
    ]

    edge_index = graph[
        "edge_index"
    ]

    node_count = node_features.shape[0]

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

    encoder = GraphSAGEEncoder(
        node_features=node_features.shape[1],
        hidden_dim=64,
        output_dim=64
    )

    embeddings = encoder(
        node_features,
        adjacency
    )

    print(
        f"Nodes: {node_count}"
    )

    print(
        f"Input features: "
        f"{node_features.shape[1]}"
    )

    print(
        f"Node embeddings: "
        f"{tuple(embeddings.shape)}"
    )

    print(
        "GraphSAGE encoder: OK"
    )


if __name__ == "__main__":
    main()