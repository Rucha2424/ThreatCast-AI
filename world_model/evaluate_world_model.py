import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from graph_encoder import GraphSAGEEncoder, graph_mean_pool
from temporal_model import TemporalStateEncoder
from rollout import LatentStatePredictor
from train_world_model import normalize_features, TemporalDataset

GRAPH_FILE = "world_model/packet_graphs.pt"
MODEL_DIR = "world_model/checkpoints"

SEQUENCE_LENGTH = 5
LATENT_DIM = 64
BATCH_SIZE = 32

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_graph_embeddings(graphs, encoder):
    embeddings = []

    encoder.eval()

    with torch.no_grad():
        for graph in graphs:
            node_features = graph["node_features"].float().to(DEVICE)
            edge_index = graph["edge_index"].long().to(DEVICE)

            node_count = node_features.shape[0]

            adjacency = torch.zeros(
                (node_count, node_count),
                dtype=torch.float32,
                device=DEVICE
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

            embeddings.append(graph_embedding.cpu())

    return torch.stack(embeddings)


def main():

    print("=" * 70)
    print("THREATCAST - WORLD MODEL EVALUATION")
    print("=" * 70)

    print(f"Device: {DEVICE}")

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    print(f"Graph snapshots: {len(graphs)}")

    graphs, feature_mean, feature_std = normalize_features(
        graphs
    )

    graph_encoder = GraphSAGEEncoder(
        node_features=2,
        hidden_dim=64,
        output_dim=LATENT_DIM
    ).to(DEVICE)

    temporal_encoder = TemporalStateEncoder(
        input_dim=LATENT_DIM,
        hidden_dim=LATENT_DIM
    ).to(DEVICE)

    predictor = LatentStatePredictor(
        latent_dim=LATENT_DIM
    ).to(DEVICE)

    graph_encoder.load_state_dict(
        torch.load(
            f"{MODEL_DIR}/graph_encoder.pt",
            map_location=DEVICE,
            weights_only=True
        )
    )

    temporal_encoder.load_state_dict(
        torch.load(
            f"{MODEL_DIR}/temporal_encoder.pt",
            map_location=DEVICE,
            weights_only=True
        )
    )

    predictor.load_state_dict(
        torch.load(
            f"{MODEL_DIR}/latent_predictor.pt",
            map_location=DEVICE,
            weights_only=True
        )
    )

    print("Model checkpoints loaded: OK")

    embeddings = build_graph_embeddings(
        graphs,
        graph_encoder
    )

    print(
        f"Embedding sequence: {tuple(embeddings.shape)}"
    )

    split_index = int(len(embeddings) * 0.8)

    validation_dataset = TemporalDataset(
        embeddings,
        SEQUENCE_LENGTH,
        split_index - SEQUENCE_LENGTH,
        len(embeddings)
    )

    loader = DataLoader(
        validation_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False
    )

    mse = nn.MSELoss()

    world_model_errors = []
    persistence_errors = []

    temporal_encoder.eval()
    predictor.eval()

    with torch.no_grad():

        for history, target in loader:

            history = history.to(DEVICE)
            target = target.to(DEVICE)

            current_state = temporal_encoder(
                history
            )

            predicted_state = predictor(
                current_state
            )

            persistence_state = history[:, -1, :]

            world_error = mse(
                predicted_state,
                target
            ).item()

            persistence_error = mse(
                persistence_state,
                target
            ).item()

            world_model_errors.append(world_error)
            persistence_errors.append(persistence_error)

    world_model_mse = sum(world_model_errors) / len(
        world_model_errors
    )

    persistence_mse = sum(persistence_errors) / len(
        persistence_errors
    )

    improvement = (
        (persistence_mse - world_model_mse)
        / persistence_mse
    ) * 100

    print()
    print("=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)

    print(
        f"Persistence baseline MSE: "
        f"{persistence_mse:.6f}"
    )

    print(
        f"World model MSE:          "
        f"{world_model_mse:.6f}"
    )

    print(
        f"Improvement over baseline: "
        f"{improvement:.2f}%"
    )

    print()

    if world_model_mse < persistence_mse:
        print("WORLD MODEL BEATS BASELINE: YES")
    else:
        print("WORLD MODEL BEATS BASELINE: NO")

    print("=" * 70)


if __name__ == "__main__":
    main()