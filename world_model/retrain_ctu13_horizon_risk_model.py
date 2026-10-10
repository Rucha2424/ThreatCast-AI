# ============================================================
# CTU13 HORIZON-SPECIFIC INFILTRATION RISK WORLD MODEL
# Experimental retraining
#
# IMPORTANT:
# - Does NOT modify the production LSTM.
# - Does NOT use Scenario 13 for training.
# - Does NOT use Scenario 13 for checkpoint selection.
# - Keeps the existing feature/temporal/latent architecture.
# - Replaces one shared risk head with 3 horizon-specific heads.
# ============================================================

import json
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from torch.utils.data import DataLoader, WeightedRandomSampler

from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
)

from world_model.train_ctu13_risk_model import (
    CTU13RiskDataset,
    CTU13FeatureProjection,
    TemporalStateEncoder,
    LatentStatePredictor,
    FEATURE_NAMES,
    INPUT_DIM,
    LATENT_DIM,
    SEQUENCE_LENGTH,
    FORECAST_HORIZON,
    TRAIN_SCENARIOS,
    VALIDATION_SCENARIOS,
    TEST_SCENARIOS,
    DATA_PATH,
    CHECKPOINT_DIR,
    SEED,
)


# ============================================================
# CONFIGURATION
# ============================================================

EPOCHS = 60
MIN_EPOCHS = 10

BATCH_SIZE = 32

LEARNING_RATE = 0.0005
WEIGHT_DECAY = 1e-4

LATENT_LOSS_WEIGHT = 0.5
RISK_LOSS_WEIGHT = 2.0

POSITIVE_CLASS_WEIGHT = 1.0

GRADIENT_CLIP_NORM = 1.0

EARLY_STOPPING_PATIENCE = 12

# Separate experimental artifacts.
EXPERIMENT_DIR = (
    CHECKPOINT_DIR
    / "horizon_specific_experiment"
)

EXPERIMENT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


set_seed(SEED)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# HORIZON-SPECIFIC RISK HEAD
# ============================================================

class HorizonRiskHead(nn.Module):

    def __init__(
        self,
        latent_dim=LATENT_DIM,
    ):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(
                latent_dim,
                32,
            ),
            nn.LayerNorm(32),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(
                32,
                1,
            ),
        )

    def forward(self, x):

        return self.network(x).squeeze(-1)


# ============================================================
# HORIZON-SPECIFIC WORLD MODEL
# ============================================================

class CTU13HorizonRiskWorldModel(nn.Module):

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

        self.risk_head_t1 = (
            HorizonRiskHead(
                latent_dim=LATENT_DIM
            )
        )

        self.risk_head_t2 = (
            HorizonRiskHead(
                latent_dim=LATENT_DIM
            )
        )

        self.risk_head_t3 = (
            HorizonRiskHead(
                latent_dim=LATENT_DIM
            )
        )

    def forward(self, history):

        # ----------------------------------------------------
        # Project observed feature states
        # ----------------------------------------------------

        projected_history = (
            self.feature_projection(
                history
            )
        )

        # ----------------------------------------------------
        # Encode temporal context
        # ----------------------------------------------------

        current_latent = (
            self.temporal_encoder(
                projected_history
            )
        )

        # ----------------------------------------------------
        # Autoregressive latent rollout
        # ----------------------------------------------------

        latent_predictions = []

        latent_state = current_latent

        for _ in range(
            FORECAST_HORIZON
        ):

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

        # ----------------------------------------------------
        # Horizon-specific risk predictions
        # ----------------------------------------------------

        risk_t1 = (
            self.risk_head_t1(
                latent_predictions[:, 0, :]
            )
        )

        risk_t2 = (
            self.risk_head_t2(
                latent_predictions[:, 1, :]
            )
        )

        risk_t3 = (
            self.risk_head_t3(
                latent_predictions[:, 2, :]
            )
        )

        risk_logits = torch.stack(
            [
                risk_t1,
                risk_t2,
                risk_t3,
            ],
            dim=1,
        )

        return (
            latent_predictions,
            risk_logits,
        )


# ============================================================
# SCALER
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

    mean = values.mean(
        axis=0
    )

    std = values.std(
        axis=0
    )

    std[
        std < 1e-8
    ] = 1.0

    return (
        mean.astype(np.float32),
        std.astype(np.float32),
    )


# ============================================================
# DATA LOADING
# ============================================================

def load_dataframe():

    if not DATA_PATH.exists():

        raise FileNotFoundError(
            f"CTU13 dataset not found: "
            f"{DATA_PATH}"
        )

    import pandas as pd

    df = pd.read_csv(
        DATA_PATH
    )

    required_columns = (
        [
            "Scenario",
            "Timestamp",
            "Attack_State",
        ]
        + FEATURE_NAMES
    )

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:

        raise ValueError(
            f"Missing CTU13 columns: "
            f"{missing}"
        )

    return df


# ============================================================
# SCENARIO-BALANCED SAMPLER
# ============================================================

def create_balanced_sampler(
    dataset
):

    scenario_counts = {}

    for sample in dataset.samples:

        scenario = sample[
            "scenario"
        ]

        scenario_counts[
            scenario
        ] = (
            scenario_counts.get(
                scenario,
                0,
            )
            + 1
        )

    weights = []

    for sample in dataset.samples:

        scenario = sample[
            "scenario"
        ]

        weights.append(
            1.0
            / scenario_counts[
                scenario
            ]
        )

    weights = torch.tensor(
        weights,
        dtype=torch.double,
    )

    return WeightedRandomSampler(
        weights=weights,
        num_samples=len(weights),
        replacement=True,
        generator=(
            torch.Generator()
            .manual_seed(SEED)
        ),
    )


# ============================================================
# VALIDATION METRICS
# ============================================================

def collect_predictions(
    model,
    loader,
):

    model.eval()

    all_risk = []
    all_labels = []

    total_latent_loss = 0.0
    total_samples = 0

    latent_criterion = nn.MSELoss()

    with torch.no_grad():

        for (
            history,
            future_features,
            future_attack,
            _,
        ) in loader:

            history = history.to(
                DEVICE
            )

            future_features = (
                future_features.to(
                    DEVICE
                )
            )

            future_attack = (
                future_attack.to(
                    DEVICE
                )
            )

            (
                latent_predictions,
                risk_logits,
            ) = model(
                history
            )

            target_latent = (
                model.feature_projection(
                    future_features
                )
            )

            latent_loss = (
                latent_criterion(
                    latent_predictions,
                    target_latent,
                )
            )

            batch_size = (
                history.size(0)
            )

            total_latent_loss += (
                float(
                    latent_loss.item()
                )
                * batch_size
            )

            total_samples += (
                batch_size
            )

            probabilities = (
                torch.sigmoid(
                    risk_logits
                )
                .cpu()
                .numpy()
            )

            all_risk.append(
                probabilities
            )

            all_labels.append(
                future_attack
                .cpu()
                .numpy()
            )

    if total_samples == 0:

        raise RuntimeError(
            "Validation loader "
            "contains zero samples."
        )

    probabilities = np.concatenate(
        all_risk,
        axis=0,
    )

    labels = np.concatenate(
        all_labels,
        axis=0,
    )

    latent_loss = (
        total_latent_loss
        / total_samples
    )

    metrics = []

    for horizon in range(
        FORECAST_HORIZON
    ):

        y_true = labels[
            :,
            horizon,
        ]

        y_prob = probabilities[
            :,
            horizon,
        ]

        if (
            len(np.unique(y_true))
            < 2
        ):

            roc_auc = float("nan")
            pr_auc = float("nan")

        else:

            roc_auc = (
                roc_auc_score(
                    y_true,
                    y_prob,
                )
            )

            pr_auc = (
                average_precision_score(
                    y_true,
                    y_prob,
                )
            )

        metrics.append(
            {
                "horizon": horizon + 1,
                "roc_auc": float(
                    roc_auc
                ),
                "pr_auc": float(
                    pr_auc
                ),
            }
        )

    valid_pr_auc = [
        m["pr_auc"]
        for m in metrics
        if np.isfinite(
            m["pr_auc"]
        )
    ]

    mean_pr_auc = (
        float(
            np.mean(valid_pr_auc)
        )
        if valid_pr_auc
        else float("-inf")
    )

    return (
        probabilities,
        labels,
        latent_loss,
        metrics,
        mean_pr_auc,
    )


# ============================================================
# TRAINING
# ============================================================

def main():

    print("=" * 70)
    print(
        "CTU13 HORIZON-SPECIFIC "
        "INFILTRATION RISK WORLD MODEL"
    )
    print("=" * 70)

    print(
        f"Seed:                  {SEED}"
    )

    print(
        f"Device:                {DEVICE}"
    )

    print(
        f"Input features:        {INPUT_DIM}"
    )

    print(
        f"Sequence length:       "
        f"{SEQUENCE_LENGTH}"
    )

    print(
        f"Forecast horizon:      "
        f"{FORECAST_HORIZON}"
    )

    print(
        f"Latent dimension:      "
        f"{LATENT_DIM}"
    )

    print(
        f"Epochs:                {EPOCHS}"
    )

    print(
        f"Batch size:            {BATCH_SIZE}"
    )

    print(
        f"Learning rate:         "
        f"{LEARNING_RATE}"
    )

    print(
        f"Risk loss weight:      "
        f"{RISK_LOSS_WEIGHT}"
    )

    print(
        f"Positive class weight: "
        f"{POSITIVE_CLASS_WEIGHT}"
    )

    print()

    print(
        "EXPERIMENTAL CHECKPOINT:"
    )

    print(
        EXPERIMENT_DIR
    )

    print()

    # --------------------------------------------------------
    # Load data
    # --------------------------------------------------------

    df = load_dataframe()

    print(
        f"Total CTU13 states: "
        f"{len(df)}"
    )

    print()

    print(
        f"Train scenarios: "
        f"{TRAIN_SCENARIOS}"
    )

    print(
        f"Validation scenarios: "
        f"{VALIDATION_SCENARIOS}"
    )

    print(
        f"TEST scenarios: "
        f"{TEST_SCENARIOS}"
    )

    print()

    # --------------------------------------------------------
    # Normalization
    # --------------------------------------------------------

    mean, std = fit_scaler(
        df
    )

    print(
        "Feature normalization: OK"
    )

    # --------------------------------------------------------
    # Datasets
    # --------------------------------------------------------

    train_dataset = (
        CTU13RiskDataset(
            df,
            TRAIN_SCENARIOS,
            mean,
            std,
        )
    )

    validation_dataset = (
        CTU13RiskDataset(
            df,
            VALIDATION_SCENARIOS,
            mean,
            std,
        )
    )

    test_dataset = (
        CTU13RiskDataset(
            df,
            TEST_SCENARIOS,
            mean,
            std,
        )
    )

    print(
        f"Train windows:       "
        f"{len(train_dataset)}"
    )

    print(
        f"Validation windows:  "
        f"{len(validation_dataset)}"
    )

    print(
        f"Test windows:        "
        f"{len(test_dataset)}"
    )

    print()

    # --------------------------------------------------------
    # Sampler
    # --------------------------------------------------------

    sampler = (
        create_balanced_sampler(
            train_dataset
        )
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

    # --------------------------------------------------------
    # Model
    # --------------------------------------------------------

    model = (
        CTU13HorizonRiskWorldModel()
        .to(DEVICE)
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    latent_criterion = nn.MSELoss()

    risk_criterion = (
        nn.BCEWithLogitsLoss(
            pos_weight=torch.tensor(
                POSITIVE_CLASS_WEIGHT,
                device=DEVICE,
            )
        )
    )

    # --------------------------------------------------------
    # Checkpoint tracking
    # --------------------------------------------------------

    best_pr_auc = float(
        "-inf"
    )

    best_epoch = 0

    epochs_without_improvement = 0

    # --------------------------------------------------------
    # Training loop
    # --------------------------------------------------------

    for epoch in range(
        1,
        EPOCHS + 1,
    ):

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

            history = history.to(
                DEVICE
            )

            future_features = (
                future_features.to(
                    DEVICE
                )
            )

            future_attack = (
                future_attack.to(
                    DEVICE
                )
            )

            optimizer.zero_grad(
                set_to_none=True
            )

            (
                latent_predictions,
                risk_logits,
            ) = model(
                history
            )

            target_latent = (
                model.feature_projection(
                    future_features
                )
            )

            latent_loss = (
                latent_criterion(
                    latent_predictions,
                    target_latent,
                )
            )

            risk_loss = (
                risk_criterion(
                    risk_logits,
                    future_attack,
                )
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

            batch_size = (
                history.size(0)
            )

            running_loss += (
                float(loss.item())
                * batch_size
            )

            running_latent += (
                float(
                    latent_loss.item()
                )
                * batch_size
            )

            running_risk += (
                float(
                    risk_loss.item()
                )
                * batch_size
            )

            sample_count += (
                batch_size
            )

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

        (
            _,
            _,
            validation_latent_loss,
            validation_metrics,
            validation_pr_auc,
        ) = collect_predictions(
            model,
            validation_loader,
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train={train_loss:.6f} | "
            f"Latent={train_latent:.6f} | "
            f"Risk={train_risk:.6f} | "
            f"ValLatent="
            f"{validation_latent_loss:.6f} | "
            f"ValPR-AUC="
            f"{validation_pr_auc:.6f}"
        )

        for metric in (
            validation_metrics
        ):

            print(
                f"    T+{metric['horizon']}: "
                f"ROC-AUC="
                f"{metric['roc_auc']:.6f} "
                f"PR-AUC="
                f"{metric['pr_auc']:.6f}"
            )

        # ----------------------------------------------------
        # Select checkpoint using validation PR-AUC only.
        #
        # Scenario 13 is never evaluated here.
        # ----------------------------------------------------

        if (
            validation_pr_auc
            > best_pr_auc
        ):

            best_pr_auc = (
                validation_pr_auc
            )

            best_epoch = epoch

            epochs_without_improvement = 0

            torch.save(
                model.state_dict(),
                EXPERIMENT_DIR
                / "ctu13_horizon_risk_world_model.pt",
            )

            print(
                "    NEW BEST CHECKPOINT"
            )

        else:

            epochs_without_improvement += 1

        if (
            epoch >= MIN_EPOCHS
            and epochs_without_improvement
            >= EARLY_STOPPING_PATIENCE
        ):

            print()
            print(
                "Early stopping triggered."
            )

            break

    # ========================================================
    # Restore best checkpoint
    # ========================================================

    checkpoint_path = (
        EXPERIMENT_DIR
        / "ctu13_horizon_risk_world_model.pt"
    )

    if not checkpoint_path.exists():

        raise RuntimeError(
            "No best checkpoint was "
            "created."
        )

    best_state = torch.load(
        checkpoint_path,
        map_location=DEVICE,
        weights_only=True,
    )

    model.load_state_dict(
        best_state
    )

    # ========================================================
    # Final validation evaluation
    # ========================================================

    (
        validation_probabilities,
        validation_labels,
        validation_latent_loss,
        validation_metrics,
        final_validation_pr_auc,
    ) = collect_predictions(
        model,
        validation_loader,
    )

    # ========================================================
    # Save component checkpoints
    # ========================================================

    torch.save(
        model.feature_projection.state_dict(),
        EXPERIMENT_DIR
        / "feature_projection.pt",
    )

    torch.save(
        model.temporal_encoder.state_dict(),
        EXPERIMENT_DIR
        / "temporal_encoder.pt",
    )

    torch.save(
        model.latent_predictor.state_dict(),
        EXPERIMENT_DIR
        / "latent_predictor.pt",
    )

    torch.save(
        model.risk_head_t1.state_dict(),
        EXPERIMENT_DIR
        / "risk_head_t1.pt",
    )

    torch.save(
        model.risk_head_t2.state_dict(),
        EXPERIMENT_DIR
        / "risk_head_t2.pt",
    )

    torch.save(
        model.risk_head_t3.state_dict(),
        EXPERIMENT_DIR
        / "risk_head_t3.pt",
    )

    np.save(
        EXPERIMENT_DIR
        / "feature_mean.npy",
        mean,
    )

    np.save(
        EXPERIMENT_DIR
        / "feature_std.npy",
        std,
    )

    # ========================================================
    # Save validation predictions
    # ========================================================

    validation_rows = []

    for index in range(
        len(validation_probabilities)
    ):

        for horizon in range(
            FORECAST_HORIZON
        ):

            validation_rows.append(
                {
                    "scenario": int(
                        validation_dataset
                        .samples[index]
                        ["scenario"]
                    ),
                    "horizon": horizon + 1,
                    "probability": float(
                        validation_probabilities[
                            index,
                            horizon,
                        ]
                    ),
                    "actual_attack": int(
                        validation_labels[
                            index,
                            horizon,
                        ]
                    ),
                }
            )

    import pandas as pd

    validation_df = pd.DataFrame(
        validation_rows
    )

    validation_df.to_csv(
        EXPERIMENT_DIR
        / "validation_predictions.csv",
        index=False,
    )

    # ========================================================
    # Metadata
    # ========================================================

    metadata = {

        "model":
            "CTU13 Horizon-Specific "
            "Temporal Infiltration "
            "Risk World Model",

        "architecture":
            "shared feature projection + "
            "shared temporal encoder + "
            "shared autoregressive latent "
            "predictor + three "
            "horizon-specific risk heads",

        "dataset":
            "CTU13",

        "seed":
            SEED,

        "device":
            str(DEVICE),

        "features":
            FEATURE_NAMES,

        "input_dim":
            INPUT_DIM,

        "sequence_length":
            SEQUENCE_LENGTH,

        "forecast_horizon":
            FORECAST_HORIZON,

        "latent_dimension":
            LATENT_DIM,

        "epochs_configured":
            EPOCHS,

        "best_epoch":
            best_epoch,

        "batch_size":
            BATCH_SIZE,

        "learning_rate":
            LEARNING_RATE,

        "optimizer":
            "AdamW",

        "weight_decay":
            WEIGHT_DECAY,

        "latent_loss":
            "MSE",

        "risk_loss":
            "BCEWithLogitsLoss",

        "latent_loss_weight":
            LATENT_LOSS_WEIGHT,

        "risk_loss_weight":
            RISK_LOSS_WEIGHT,

        "positive_class_weight":
            POSITIVE_CLASS_WEIGHT,

        "gradient_clip_norm":
            GRADIENT_CLIP_NORM,

        "early_stopping_patience":
            EARLY_STOPPING_PATIENCE,

        "train_scenarios":
            TRAIN_SCENARIOS,

        "validation_scenarios":
            VALIDATION_SCENARIOS,

        "test_scenarios":
            TEST_SCENARIOS,

        "split_strategy":
            "scenario-held-out "
            "chronological windows",

        "sampling_strategy":
            "scenario-balanced "
            "weighted random sampling",

        "best_validation_mean_pr_auc":
            best_pr_auc,

        "final_validation_mean_pr_auc":
            final_validation_pr_auc,

        "validation_metrics":
            validation_metrics,

        "checkpoint":
            "ctu13_horizon_risk_world_model.pt",

        "scenario_13_policy":
            "Scenario 13 is completely "
            "excluded from training, "
            "checkpoint selection, "
            "and threshold selection.",

        "production_policy":
            "This experimental checkpoint "
            "does not replace the current "
            "production checkpoint."
    }

    with open(
        EXPERIMENT_DIR
        / "training_metadata.json",
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
        )

    # ========================================================
    # Final output
    # ========================================================

    print()
    print("=" * 70)
    print(
        "HORIZON-SPECIFIC TRAINING COMPLETE"
    )
    print("=" * 70)

    print(
        f"Best epoch: "
        f"{best_epoch}"
    )

    print(
        f"Best validation mean PR-AUC: "
        f"{best_pr_auc:.6f}"
    )

    print()
    print(
        "Validation metrics:"
    )

    for metric in validation_metrics:

        print(
            f"T+{metric['horizon']}: "
            f"ROC-AUC="
            f"{metric['roc_auc']:.6f}, "
            f"PR-AUC="
            f"{metric['pr_auc']:.6f}"
        )

    print()
    print(
        "Experimental checkpoint:"
    )

    print(
        checkpoint_path
    )

    print()
    print(
        "IMPORTANT:"
    )

    print(
        "The existing production "
        "checkpoint was NOT modified."
    )


if __name__ == "__main__":
    main()