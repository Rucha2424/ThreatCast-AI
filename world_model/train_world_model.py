import os
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from world_model.graph_encoder import GraphSAGEEncoder, graph_mean_pool
from world_model.temporal_model import TemporalStateEncoder
from world_model.rollout import LatentStatePredictor


# ============================================================
# REPRODUCIBILITY CONFIGURATION
# ============================================================

SEED = 42

GRAPH_FILE = "world_model/packet_graphs.pt"
MODEL_DIR = "world_model/checkpoints"

SEQUENCE_LENGTH = 5
LATENT_DIM = 64

EPOCHS = 30
BATCH_SIZE = 32
LEARNING_RATE = 0.001

GRADIENT_CLIP_NORM = 1.0

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

    try:
        torch.use_deterministic_algorithms(True)
    except RuntimeError:
        pass


set_seed(SEED)


# ============================================================
# TEMPORAL DATASET
# ============================================================

class TemporalDataset(Dataset):

    def __init__(
        self,
        embeddings,
        sequence_length,
        start,
        end
    ):
        self.x = []
        self.y = []

        for i in range(
            start,
            end - sequence_length
        ):
            self.x.append(
                embeddings[
                    i:i + sequence_length
                ]
            )

            self.y.append(
                embeddings[
                    i + sequence_length
                ]
            )

        self.x = torch.stack(self.x)
        self.y = torch.stack(self.y)

    def __len__(self):
        return len(self.x)

    def __getitem__(self, index):
        return (
            self.x[index],
            self.y[index]
        )


# ============================================================
# GRAPH EMBEDDING GENERATION
# ============================================================

def build_graph_embeddings(
    graphs,
    encoder
):

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
                (
                    node_count,
                    node_count
                ),
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


# ============================================================
# GRAPH FEATURE NORMALIZATION
# ============================================================

def normalize_features(graphs):

    values = []

    for graph in graphs:

        x = (
            graph["node_features"]
            .float()
        )

        if x.numel() > 0:
            values.append(x)

    if not values:
        raise ValueError(
            "No graph node features were found."
        )

    all_values = torch.cat(
        values,
        dim=0
    )

    feature_mean = all_values.mean(
        dim=0
    )

    feature_std = all_values.std(
        dim=0
    )

    feature_std = torch.where(
        feature_std < 1e-6,
        torch.ones_like(feature_std),
        feature_std
    )

    normalized_graphs = []

    for graph in graphs:

        new_graph = dict(graph)

        new_graph["node_features"] = (
            graph["node_features"]
            .float()
            - feature_mean
        ) / feature_std

        normalized_graphs.append(
            new_graph
        )

    return (
        normalized_graphs,
        feature_mean,
        feature_std
    )


# ============================================================
# VALIDATION
# ============================================================

def evaluate(
    temporal_encoder,
    predictor,
    loader
):

    temporal_encoder.eval()
    predictor.eval()

    loss_function = nn.MSELoss()

    total_loss = 0.0
    batch_count = 0

    with torch.no_grad():

        for history, target in loader:

            history = history.to(DEVICE)
            target = target.to(DEVICE)

            current_state = (
                temporal_encoder(history)
            )

            predicted_state = (
                predictor(current_state)
            )

            loss = loss_function(
                predicted_state,
                target
            )

            total_loss += loss.item()
            batch_count += 1

    if batch_count == 0:
        raise ValueError(
            "Validation dataset is empty."
        )

    return total_loss / batch_count


# ============================================================
# SAVE REPRODUCIBILITY METADATA
# ============================================================

def save_training_metadata(
    feature_mean,
    feature_std,
    split_index,
    graph_count,
    train_samples,
    validation_samples,
    best_val_loss
):

    metadata = {
        "seed": SEED,
        "device": str(DEVICE),

        "dataset": {
            "graph_file": GRAPH_FILE,
            "graph_snapshots": graph_count
        },

        "graph_features": {
            "node_features": 2
        },

        "architecture": {
            "graph_encoder": "GraphSAGEEncoder",
            "graph_encoder_hidden_dim": 64,
            "graph_encoder_output_dim": LATENT_DIM,
            "temporal_encoder": "TemporalStateEncoder",
            "temporal_encoder_input_dim": LATENT_DIM,
            "temporal_encoder_hidden_dim": LATENT_DIM,
            "latent_predictor": "LatentStatePredictor",
            "latent_dimension": LATENT_DIM
        },

        "training": {
            "sequence_length": SEQUENCE_LENGTH,
            "epochs": EPOCHS,
            "batch_size": BATCH_SIZE,
            "learning_rate": LEARNING_RATE,
            "optimizer": "Adam",
            "loss": "MSELoss",
            "gradient_clip_norm": GRADIENT_CLIP_NORM,
            "shuffle_training_data": True
        },

        "split": {
            "method": "chronological 80/20 split",
            "train_start": 0,
            "train_end": split_index,
            "validation_start": split_index,
            "validation_end": graph_count,
            "train_samples": train_samples,
            "validation_samples": validation_samples
        },

        "normalization": {
            "method": "global node-feature standardization",
            "stored_in": "feature_scaler.pt"
        },

        "result": {
            "best_validation_loss": best_val_loss
        },

        "checkpoints": {
            "graph_encoder": (
                f"{MODEL_DIR}/graph_encoder.pt"
            ),
            "temporal_encoder": (
                f"{MODEL_DIR}/temporal_encoder.pt"
            ),
            "latent_predictor": (
                f"{MODEL_DIR}/latent_predictor.pt"
            ),
            "feature_scaler": (
                f"{MODEL_DIR}/feature_scaler.pt"
            )
        },

        "reproduction_command": (
            "python world_model\\train_world_model.py"
        )
    }

    metadata_path = os.path.join(
        MODEL_DIR,
        "training_metadata.pt"
    )

    torch.save(
        metadata,
        metadata_path
    )

    print(
        f"Saved: {metadata_path}"
    )


# ============================================================
# MAIN TRAINING
# ============================================================

def main():

    print("=" * 70)
    print("THREATCAST - WORLD MODEL TRAINING")
    print("=" * 70)

    print()
    print("Reproducibility Configuration")
    print("-" * 70)
    print(f"Seed:              {SEED}")
    print(f"Device:            {DEVICE}")
    print(f"Sequence length:   {SEQUENCE_LENGTH}")
    print(f"Latent dimension:  {LATENT_DIM}")
    print(f"Epochs:             {EPOCHS}")
    print(f"Batch size:         {BATCH_SIZE}")
    print(f"Learning rate:      {LEARNING_RATE}")
    print(f"Gradient clipping:  {GRADIENT_CLIP_NORM}")
    print()

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    # --------------------------------------------------------
    # LOAD GRAPH DATA
    # --------------------------------------------------------

    if not os.path.exists(GRAPH_FILE):
        raise FileNotFoundError(
            f"Graph dataset not found: {GRAPH_FILE}"
        )

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    graph_count = len(graphs)

    if graph_count <= SEQUENCE_LENGTH:
        raise ValueError(
            "Not enough graph snapshots for "
            "temporal training."
        )

    print(
        f"Graph snapshots: {graph_count}"
    )

    # --------------------------------------------------------
    # NORMALIZE FEATURES
    # --------------------------------------------------------

    print(
        "Normalizing graph node features..."
    )

    (
        graphs,
        feature_mean,
        feature_std
    ) = normalize_features(graphs)

    print(
        "Feature normalization: OK"
    )

    # --------------------------------------------------------
    # GRAPH ENCODER
    # --------------------------------------------------------

    graph_encoder = GraphSAGEEncoder(
        node_features=2,
        hidden_dim=64,
        output_dim=LATENT_DIM
    ).to(DEVICE)

    # --------------------------------------------------------
    # TEMPORAL ENCODER
    # --------------------------------------------------------

    temporal_encoder = TemporalStateEncoder(
        input_dim=LATENT_DIM,
        hidden_dim=LATENT_DIM
    ).to(DEVICE)

    # --------------------------------------------------------
    # LATENT STATE PREDICTOR
    # --------------------------------------------------------

    predictor = LatentStatePredictor(
        latent_dim=LATENT_DIM
    ).to(DEVICE)

    # --------------------------------------------------------
    # BUILD GRAPH EMBEDDINGS
    # --------------------------------------------------------

    print(
        "Building graph embeddings..."
    )

    embeddings = build_graph_embeddings(
        graphs,
        graph_encoder
    )

    print(
        "Graph embedding sequence: "
        f"{tuple(embeddings.shape)}"
    )

    print(
        f"Embedding mean: "
        f"{embeddings.mean().item():.6f}"
    )

    print(
        f"Embedding std: "
        f"{embeddings.std().item():.6f}"
    )

    # --------------------------------------------------------
    # CHRONOLOGICAL TRAIN / VALIDATION SPLIT
    # --------------------------------------------------------

    split_index = int(
        len(embeddings) * 0.8
    )

    print(
        f"Training split: "
        f"0:{split_index}"
    )

    print(
        f"Validation split: "
        f"{split_index}:{len(embeddings)}"
    )

    train_dataset = TemporalDataset(
        embeddings,
        SEQUENCE_LENGTH,
        0,
        split_index
    )

    val_dataset = TemporalDataset(
        embeddings,
        SEQUENCE_LENGTH,
        split_index - SEQUENCE_LENGTH,
        len(embeddings)
    )

    if len(train_dataset) == 0:
        raise ValueError(
            "Training dataset is empty."
        )

    if len(val_dataset) == 0:
        raise ValueError(
            "Validation dataset is empty."
        )

    # --------------------------------------------------------
    # DATA LOADERS
    # --------------------------------------------------------

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False
    )

    print(
        f"Training samples: "
        f"{len(train_dataset)}"
    )

    print(
        f"Validation samples: "
        f"{len(val_dataset)}"
    )

    # --------------------------------------------------------
    # OPTIMIZER
    # --------------------------------------------------------

    optimizer = torch.optim.Adam(
        list(
            temporal_encoder.parameters()
        )
        +
        list(
            predictor.parameters()
        ),
        lr=LEARNING_RATE
    )

    loss_function = nn.MSELoss()

    best_val_loss = float("inf")

    # --------------------------------------------------------
    # TRAINING LOOP
    # --------------------------------------------------------

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        temporal_encoder.train()
        predictor.train()

        total_loss = 0.0
        batch_count = 0

        for history, target in train_loader:

            history = history.to(DEVICE)
            target = target.to(DEVICE)

            current_state = (
                temporal_encoder(history)
            )

            predicted_state = (
                predictor(current_state)
            )

            loss = loss_function(
                predicted_state,
                target
            )

            optimizer.zero_grad()

            loss.backward()

            torch.nn.utils.clip_grad_norm_(
                list(
                    temporal_encoder.parameters()
                )
                +
                list(
                    predictor.parameters()
                ),
                max_norm=GRADIENT_CLIP_NORM
            )

            optimizer.step()

            total_loss += loss.item()
            batch_count += 1

        train_loss = (
            total_loss / batch_count
        )

        val_loss = evaluate(
            temporal_encoder,
            predictor,
            val_loader
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS} "
            f"- Train Loss: {train_loss:.6f} "
            f"- Val Loss: {val_loss:.6f}"
        )

        # ----------------------------------------------------
        # BEST CHECKPOINT
        # ----------------------------------------------------

        if val_loss < best_val_loss:

            best_val_loss = val_loss

            torch.save(
                temporal_encoder.state_dict(),
                f"{MODEL_DIR}/temporal_encoder.pt"
            )

            torch.save(
                predictor.state_dict(),
                f"{MODEL_DIR}/latent_predictor.pt"
            )

            torch.save(
                {
                    "mean": feature_mean,
                    "std": feature_std
                },
                f"{MODEL_DIR}/feature_scaler.pt"
            )

    # --------------------------------------------------------
    # SAVE GRAPH ENCODER
    # --------------------------------------------------------

    torch.save(
        graph_encoder.state_dict(),
        f"{MODEL_DIR}/graph_encoder.pt"
    )

    # --------------------------------------------------------
    # SAVE TRAINING METADATA
    # --------------------------------------------------------

    save_training_metadata(
        feature_mean=feature_mean,
        feature_std=feature_std,
        split_index=split_index,
        graph_count=graph_count,
        train_samples=len(train_dataset),
        validation_samples=len(val_dataset),
        best_val_loss=best_val_loss
    )

    # --------------------------------------------------------
    # COMPLETE
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("WORLD MODEL TRAINING COMPLETE")
    print("=" * 70)

    print(
        f"Best validation loss: "
        f"{best_val_loss:.6f}"
    )

    print()
    print("Saved checkpoints:")

    print(
        f"  {MODEL_DIR}/graph_encoder.pt"
    )

    print(
        f"  {MODEL_DIR}/temporal_encoder.pt"
    )

    print(
        f"  {MODEL_DIR}/latent_predictor.pt"
    )

    print(
        f"  {MODEL_DIR}/feature_scaler.pt"
    )

    print(
        f"  {MODEL_DIR}/training_metadata.pt"
    )


if __name__ == "__main__":
    main()