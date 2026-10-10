import torch
import torch.nn as nn

from graph_encoder import GraphSAGEEncoder, graph_mean_pool
from temporal_model import TemporalStateEncoder
from rollout import LatentStatePredictor
from train_world_model import normalize_features


GRAPH_FILE = "world_model/packet_graphs.pt"
MODEL_DIR = "world_model/checkpoints"

SEQUENCE_LENGTH = 5
LATENT_DIM = 64
EVALUATION_START = 744

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


def build_graph_embeddings(graphs, encoder):

    embeddings = []

    encoder.eval()

    with torch.no_grad():

        for graph in graphs:

            node_features = (
                graph["node_features"]
                .float()
                .to(DEVICE)
            )

            edge_index = (
                graph["edge_index"]
                .long()
                .to(DEVICE)
            )

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

            embeddings.append(
                graph_embedding.cpu()
            )

    return torch.stack(embeddings)


def mse(a, b):
    return torch.mean(
        (a - b) ** 2
    ).item()


def main():

    print("=" * 70)
    print("THREATCAST - K-STEP WORLD MODEL EVALUATION")
    print("=" * 70)

    print(f"Device: {DEVICE}")

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    print(
        f"Graph snapshots: {len(graphs)}"
    )

    graphs, _, _ = normalize_features(
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
        f"Embedding sequence: "
        f"{tuple(embeddings.shape)}"
    )

    temporal_encoder.eval()
    predictor.eval()

    errors = {
        1: [],
        2: [],
        3: []
    }

    baseline_errors = {
        1: [],
        2: [],
        3: []
    }

    with torch.no_grad():

        for target_index in range(
            EVALUATION_START,
            len(embeddings) - 3
        ):

            history_start = (
                target_index - SEQUENCE_LENGTH
            )

            history = embeddings[
                history_start:target_index
            ].unsqueeze(0).to(DEVICE)

            current_state = temporal_encoder(
                history
            )

            predictions = []

            state = current_state

            for step in range(1, 4):

                state = predictor(state)

                predictions.append(
                    state.squeeze(0).cpu()
                )

            last_observed = (
                embeddings[target_index - 1]
            )

            for step in range(1, 4):

                actual = embeddings[
                    target_index + step - 1
                ]

                predicted = predictions[
                    step - 1
                ]

                errors[step].append(
                    mse(predicted, actual)
                )

                baseline_errors[step].append(
                    mse(last_observed, actual)
                )

    print()
    print("=" * 70)
    print("K-STEP RESULTS")
    print("=" * 70)

    for step in range(1, 4):

        model_error = (
            sum(errors[step])
            / len(errors[step])
        )

        baseline_error = (
            sum(baseline_errors[step])
            / len(baseline_errors[step])
        )

        improvement = (
            (baseline_error - model_error)
            / baseline_error
        ) * 100

        print()
        print(
            f"T+{step}"
        )

        print(
            f"World model MSE: "
            f"{model_error:.6f}"
        )

        print(
            f"Persistence MSE: "
            f"{baseline_error:.6f}"
        )

        print(
            f"Improvement: "
            f"{improvement:.2f}%"
        )

        if model_error < baseline_error:
            print(
                f"T+{step}: BEATS BASELINE"
            )
        else:
            print(
                f"T+{step}: DOES NOT BEAT BASELINE"
            )

    print()
    print("=" * 70)
    print("K-STEP EVALUATION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()