from pathlib import Path
import json
import random

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from world_model.temporal_model import TemporalStateEncoder
from world_model.rollout import LatentStatePredictor


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv"

CHECKPOINT_DIR = (
    PROJECT_ROOT
    / "world_model"
    / "checkpoints"
    / "ctu13_risk"
)

CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# REPRODUCIBILITY
# ============================================================

SEED = 42

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

torch.use_deterministic_algorithms(True)


# ============================================================
# CONFIGURATION
# ============================================================

SEQUENCE_LENGTH = 5
FORECAST_HORIZON = 3

INPUT_DIM = 12
LATENT_DIM = 64

EPOCHS = 60
BATCH_SIZE = 32
LEARNING_RATE = 0.0005

LATENT_LOSS_WEIGHT = 0.50
RISK_LOSS_WEIGHT = 1.00

GRADIENT_CLIP_NORM = 1.0

EARLY_STOPPING_PATIENCE = 12

# Keep Scenario 13 completely held out.
TRAIN_SCENARIOS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]
VALIDATION_SCENARIOS = [12]
TEST_SCENARIOS = [13]


# ============================================================
# PRODUCTION FEATURE SET
# ============================================================

FEATURE_NAMES = [
    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow",
    "Flow_Count_Change",
    "Total_Packets_Change",
    "Total_Bytes_Change",
    "Total_Source_Bytes_Change",
    "Avg_Duration_Change",
]


# ============================================================
# DATASET
# ============================================================

class CTU13RiskDataset(Dataset):

    def __init__(
        self,
        dataframe,
        scenarios,
        mean,
        std,
    ):
        self.samples = []

        for scenario in scenarios:

            scenario_df = (
                dataframe[dataframe["Scenario"] == scenario]
                .sort_values("Timestamp")
                .reset_index(drop=True)
            )

            if len(scenario_df) < SEQUENCE_LENGTH + FORECAST_HORIZON:
                continue

            features = (
                scenario_df[FEATURE_NAMES]
                .replace([np.inf, -np.inf], np.nan)
                .fillna(0.0)
                .to_numpy(dtype=np.float32)
            )

            attack_state = (
                scenario_df["Attack_State"]
                .astype(int)
                .to_numpy()
            )

            scaled = (features - mean) / std

            max_start = (
                len(scenario_df)
                - SEQUENCE_LENGTH
                - FORECAST_HORIZON
                + 1
            )

            for start in range(max_start):

                history_end = start + SEQUENCE_LENGTH

                future_end = (
                    history_end + FORECAST_HORIZON
                )

                history = scaled[
                    start:history_end
                ]

                future_features = scaled[
                    history_end:future_end
                ]

                future_attack = attack_state[
                    history_end:future_end
                ]

                self.samples.append(
                    {
                        "history": history.astype(
                            np.float32
                        ),
                        "future_features": future_features.astype(
                            np.float32
                        ),
                        "future_attack": future_attack.astype(
                            np.float32
                        ),
                        "scenario": int(scenario),
                    }
                )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):

        sample = self.samples[index]

        return (
            torch.tensor(
                sample["history"],
                dtype=torch.float32,
            ),
            torch.tensor(
                sample["future_features"],
                dtype=torch.float32,
            ),
            torch.tensor(
                sample["future_attack"],
                dtype=torch.float32,
            ),
            sample["scenario"],
        )


# ============================================================
# MODEL COMPONENTS
# ============================================================

class CTU13FeatureProjection(nn.Module):

    def __init__(
        self,
        input_dim=INPUT_DIM,
        latent_dim=LATENT_DIM,
    ):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(input_dim, latent_dim),
            nn.LayerNorm(latent_dim),
            nn.GELU(),
        )

    def forward(self, x):
        return self.network(x)


class InfiltrationRiskHead(nn.Module):

    def __init__(self, latent_dim=LATENT_DIM):

        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.LayerNorm(32),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(32, 1),
        )

    def forward(self, x):

        return self.network(x).squeeze(-1)


# ============================================================
# WORLD MODEL
# ============================================================

class CTU13RiskWorldModel(nn.Module):

    def __init__(self):

        super().__init__()

        self.feature_projection = (
            CTU13FeatureProjection()
        )

        self.temporal_encoder = (
            TemporalStateEncoder(
                input_dim=LATENT_DIM,
                hidden_dim=LATENT_DIM,
            )
        )

        self.latent_predictor = (
            LatentStatePredictor(
                latent_dim=LATENT_DIM,
                hidden_dim=LATENT_DIM,
            )
        )

        self.risk_head = (
            InfiltrationRiskHead(
                latent_dim=LATENT_DIM
            )
        )

    def encode_current_state(self, history):

        # ----------------------------------------------------
        # Project observed feature states
        # ----------------------------------------------------

        projected_history = (
            self.feature_projection(history)
        )

        # ----------------------------------------------------
        # Encode temporal context
        # ----------------------------------------------------

        current_latent = (
            self.temporal_encoder(
                projected_history
            )
        )

        return current_latent

    def rollout_latent(
        self,
        current_latent,
        forecast_horizon=FORECAST_HORIZON,
    ):

        # ----------------------------------------------------
        # Autoregressive rollout
        # ----------------------------------------------------

        latent_predictions = []

        latent_state = current_latent

        for _ in range(FORECAST_HORIZON):

            latent_state = (
                self.latent_predictor(
                    latent_state
                )
            )

            latent_predictions.append(
                latent_state
            )

        latent_predictions = torch.stack(
            latent_predictions,
            dim=1,
        )

        return latent_predictions

    def forward(self, history):

        current_latent = self.encode_current_state(
            history
        )

        latent_predictions = self.rollout_latent(
            current_latent,
            forecast_horizon=FORECAST_HORIZON,
        )

        # ----------------------------------------------------
        # Risk prediction at each horizon
        # ----------------------------------------------------

        risk_logits = self.risk_head(
            latent_predictions
        )

        return (
            latent_predictions,
            risk_logits,
        )


# ============================================================
# DATA LOADING
# ============================================================

def load_dataframe():

    if not DATA_PATH.exists():

        raise FileNotFoundError(
            f"CTU13 dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH)

    required_columns = (
        ["Scenario", "Timestamp", "Attack_State"]
        + FEATURE_NAMES
    )

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:

        raise ValueError(
            f"Missing CTU13 columns: {missing}"
        )

    return df


# ============================================================
# TRAINING NORMALIZATION
# ============================================================

def fit_scaler(df):

    train_df = df[
        df["Scenario"].isin(
            TRAIN_SCENARIOS
        )
    ]

    values = (
        train_df[FEATURE_NAMES]
        .replace(
            [np.inf, -np.inf],
            np.nan,
        )
        .fillna(0.0)
        .to_numpy(
            dtype=np.float32
        )
    )

    mean = values.mean(axis=0)

    std = values.std(axis=0)

    std[std < 1e-8] = 1.0

    return mean.astype(np.float32), std.astype(np.float32)


# ============================================================
# SCENARIO-BALANCED SAMPLING
# ============================================================

def create_balanced_sampler(dataset):

    scenario_counts = {}

    for sample in dataset.samples:

        scenario = sample["scenario"]

        scenario_counts[scenario] = (
            scenario_counts.get(
                scenario,
                0,
            )
            + 1
        )

    weights = []

    for sample in dataset.samples:

        scenario = sample["scenario"]

        weight = (
            1.0
            / scenario_counts[scenario]
        )

        weights.append(weight)

    weights = torch.tensor(
        weights,
        dtype=torch.double,
    )

    return WeightedRandomSampler(
        weights=weights,
        num_samples=len(weights),
        replacement=True,
        generator=torch.Generator().manual_seed(SEED),
    )


# ============================================================
# RISK CLASS WEIGHT
# ============================================================

def calculate_positive_weight(dataset):

    labels = []

    for sample in dataset.samples:

        labels.extend(
            sample["future_attack"].tolist()
        )

    labels = np.asarray(
        labels,
        dtype=np.float32,
    )

    positive = float(
        np.sum(labels == 1)
    )

    negative = float(
        np.sum(labels == 0)
    )

    if positive == 0:

        return 1.0

    weight = negative / positive

    # Keep weighting bounded so that
    # the risk head does not become unstable.

    weight = float(
        np.clip(
            weight,
            0.5,
            5.0,
        )
    )

    return weight


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# VALIDATION
# ============================================================

def evaluate_loss(
    model,
    loader,
    positive_weight,
):

    model.eval()

    total_loss = 0.0
    total_samples = 0

    latent_criterion = nn.MSELoss()

    risk_criterion = nn.BCEWithLogitsLoss(
        pos_weight=torch.tensor(
            positive_weight,
            device=DEVICE,
        )
    )

    with torch.no_grad():

        for (
            history,
            future_features,
            future_attack,
            _,
        ) in loader:

            history = history.to(DEVICE)
            future_features = (
                future_features.to(DEVICE)
            )
            future_attack = (
                future_attack.to(DEVICE)
            )

            latent_predictions, risk_logits = (
                model(history)
            )

            target_latent = (
                model.feature_projection(
                    future_features
                )
            )

            latent_loss = latent_criterion(
                latent_predictions,
                target_latent,
            )

            risk_loss = risk_criterion(
                risk_logits,
                future_attack,
            )

            loss = (
                LATENT_LOSS_WEIGHT
                * latent_loss
                + RISK_LOSS_WEIGHT
                * risk_loss
            )

            batch_size = history.size(0)

            total_loss += (
                float(loss.item())
                * batch_size
            )

            total_samples += batch_size

    if total_samples == 0:

        return float("inf")

    return total_loss / total_samples


# ============================================================
# MAIN TRAINING
# ============================================================

def main():

    print("=" * 70)
    print("CTU13 TEMPORAL INFILTRATION RISK WORLD MODEL")
    print("=" * 70)

    print(f"Seed:                 {SEED}")
    print(f"Device:               {DEVICE}")
    print(f"Input features:       {INPUT_DIM}")
    print(f"Sequence length:      {SEQUENCE_LENGTH}")
    print(f"Forecast horizon:     {FORECAST_HORIZON}")
    print(f"Latent dimension:     {LATENT_DIM}")
    print(f"Epochs:               {EPOCHS}")
    print(f"Batch size:           {BATCH_SIZE}")
    print(f"Learning rate:        {LEARNING_RATE}")
    print()

    df = load_dataframe()

    print(
        f"Total CTU13 states: {len(df)}"
    )
    print()

    print(
        f"Train:       {TRAIN_SCENARIOS}"
    )
    print(
        f"Validation:  {VALIDATION_SCENARIOS}"
    )
    print(
        f"Test:        {TEST_SCENARIOS}"
    )
    print()

    mean, std = fit_scaler(df)

    print(
        "Feature normalization: OK"
    )
    print()

    train_dataset = CTU13RiskDataset(
        df,
        TRAIN_SCENARIOS,
        mean,
        std,
    )

    validation_dataset = CTU13RiskDataset(
        df,
        VALIDATION_SCENARIOS,
        mean,
        std,
    )

    test_dataset = CTU13RiskDataset(
        df,
        TEST_SCENARIOS,
        mean,
        std,
    )

    print(
        f"Train windows:       {len(train_dataset)}"
    )

    print(
        f"Validation windows:  {len(validation_dataset)}"
    )

    print(
        f"Test windows:        {len(test_dataset)}"
    )

    print()

    # --------------------------------------------------------
    # Balanced scenario sampler
    # --------------------------------------------------------

    sampler = create_balanced_sampler(
        train_dataset
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=0,
    )

    validation_loader = DataLoader(
        validation_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    positive_weight = (
        calculate_positive_weight(
            train_dataset
        )
    )

    print(
        f"Positive-class weight: "
        f"{positive_weight:.6f}"
    )

    print()

    # --------------------------------------------------------
    # Model
    # --------------------------------------------------------

    model = (
        CTU13RiskWorldModel()
        .to(DEVICE)
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=1e-4,
    )

    latent_criterion = nn.MSELoss()

    risk_criterion = nn.BCEWithLogitsLoss(
        pos_weight=torch.tensor(
            positive_weight,
            device=DEVICE,
        )
    )

    best_validation_loss = float(
        "inf"
    )

    best_epoch = 0

    epochs_without_improvement = 0

    # --------------------------------------------------------
    # Training loop
    # --------------------------------------------------------

    for epoch in range(1, EPOCHS + 1):

        model.train()

        running_loss = 0.0
        running_latent = 0.0
        running_risk = 0.0
        sample_count = 0

        for (
            history,
            future_features,
            future_attack,
            _,
        ) in train_loader:

            history = history.to(DEVICE)

            future_features = (
                future_features.to(DEVICE)
            )

            future_attack = (
                future_attack.to(DEVICE)
            )

            optimizer.zero_grad(
                set_to_none=True
            )

            (
                latent_predictions,
                risk_logits,
            ) = model(history)

            target_latent = (
                model.feature_projection(
                    future_features
                )
            )

            latent_loss = latent_criterion(
                latent_predictions,
                target_latent,
            )

            risk_loss = risk_criterion(
                risk_logits,
                future_attack,
            )

            loss = (
                LATENT_LOSS_WEIGHT
                * latent_loss
                + RISK_LOSS_WEIGHT
                * risk_loss
            )

            loss.backward()

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                GRADIENT_CLIP_NORM,
            )

            optimizer.step()

            batch_size = history.size(0)

            running_loss += (
                float(loss.item())
                * batch_size
            )

            running_latent += (
                float(latent_loss.item())
                * batch_size
            )

            running_risk += (
                float(risk_loss.item())
                * batch_size
            )

            sample_count += batch_size

        train_loss = (
            running_loss
            / sample_count
        )

        train_latent = (
            running_latent
            / sample_count
        )

        train_risk = (
            running_risk
            / sample_count
        )

        validation_loss = evaluate_loss(
            model,
            validation_loader,
            positive_weight,
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train={train_loss:.6f} | "
            f"Latent={train_latent:.6f} | "
            f"Risk={train_risk:.6f} | "
            f"Val={validation_loss:.6f}"
        )

        # ----------------------------------------------------
        # Best checkpoint
        # ----------------------------------------------------

        if validation_loss < (
            best_validation_loss
        ):

            best_validation_loss = (
                validation_loss
            )

            best_epoch = epoch

            epochs_without_improvement = 0

            torch.save(
                model.state_dict(),
                CHECKPOINT_DIR
                / "ctu13_risk_world_model.pt",
            )

        else:

            epochs_without_improvement += 1

        if (
            epochs_without_improvement
            >= EARLY_STOPPING_PATIENCE
        ):

            print()
            print(
                "Early stopping triggered."
            )

            break

    # --------------------------------------------------------
    # Save component checkpoints
    # --------------------------------------------------------

    best_state = torch.load(
        CHECKPOINT_DIR
        / "ctu13_risk_world_model.pt",
        map_location=DEVICE,
        weights_only=True,
    )

    model.load_state_dict(
        best_state
    )

    torch.save(
        model.feature_projection.state_dict(),
        CHECKPOINT_DIR
        / "feature_projection.pt",
    )

    torch.save(
        model.temporal_encoder.state_dict(),
        CHECKPOINT_DIR
        / "temporal_encoder.pt",
    )

    torch.save(
        model.latent_predictor.state_dict(),
        CHECKPOINT_DIR
        / "latent_predictor.pt",
    )

    torch.save(
        model.risk_head.state_dict(),
        CHECKPOINT_DIR
        / "risk_head.pt",
    )

    np.save(
        CHECKPOINT_DIR
        / "feature_mean.npy",
        mean,
    )

    np.save(
        CHECKPOINT_DIR
        / "feature_std.npy",
        std,
    )

    # --------------------------------------------------------
    # Metadata
    # --------------------------------------------------------

    metadata = {

        "model": (
            "CTU13 Temporal Infiltration "
            "Risk World Model"
        ),

        "dataset": "CTU13",

        "seed": SEED,

        "device": str(DEVICE),

        "features": FEATURE_NAMES,

        "input_dim": INPUT_DIM,

        "sequence_length": (
            SEQUENCE_LENGTH
        ),

        "forecast_horizon": (
            FORECAST_HORIZON
        ),

        "latent_dimension": LATENT_DIM,

        "epochs_configured": EPOCHS,

        "best_epoch": best_epoch,

        "batch_size": BATCH_SIZE,

        "learning_rate": LEARNING_RATE,

        "optimizer": "AdamW",

        "weight_decay": 1e-4,

        "latent_loss": "MSE",

        "risk_loss": (
            "BCEWithLogitsLoss"
        ),

        "latent_loss_weight": (
            LATENT_LOSS_WEIGHT
        ),

        "risk_loss_weight": (
            RISK_LOSS_WEIGHT
        ),

        "positive_class_weight": (
            positive_weight
        ),

        "gradient_clip_norm": (
            GRADIENT_CLIP_NORM
        ),

        "early_stopping_patience": (
            EARLY_STOPPING_PATIENCE
        ),

        "train_scenarios": (
            TRAIN_SCENARIOS
        ),

        "validation_scenarios": (
            VALIDATION_SCENARIOS
        ),

        "test_scenarios": (
            TEST_SCENARIOS
        ),

        "split_strategy": (
            "scenario-held-out "
            "chronological windows"
        ),

        "sampling_strategy": (
            "scenario-balanced "
            "weighted random sampling"
        ),

        "best_validation_loss": (
            best_validation_loss
        ),

        "checkpoint": (
            "ctu13_risk_world_model.pt"
        ),

        "scope_note": (
            "Scenario 13 is never used during "
            "training or threshold selection."
        ),
    }

    with open(
        CHECKPOINT_DIR
        / "training_metadata.json",
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
        )

    print()
    print("=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)

    print(
        f"Best epoch:            {best_epoch}"
    )

    print(
        f"Best validation loss:  "
        f"{best_validation_loss:.6f}"
    )

    print(
        f"Checkpoint directory:  "
        f"{CHECKPOINT_DIR}"
    )

    print()
    print(
        "Scenario 13 remained completely "
        "held out during training."
    )


if __name__ == "__main__":
    main()
