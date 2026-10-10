# ============================================================
# CTU13 RISK WORLD MODEL - RISK-FOCUSED RETRAINING
# ============================================================
#
# Purpose:
#   Retrain the existing CTU13 temporal world model with
#   risk-focused optimization and validation checkpointing.
#
# Architecture is NOT changed.
#
# Scenario 13 remains completely held out.
#
# ============================================================

import json
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
)
from torch.utils.data import DataLoader, WeightedRandomSampler

from world_model.train_ctu13_risk_model import (
    CTU13RiskWorldModel,
    CTU13RiskDataset,
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
    FORECAST_HORIZON,
    TRAIN_SCENARIOS,
    VALIDATION_SCENARIOS,
    TEST_SCENARIOS,
    DEVICE,
    DATA_PATH,
    CHECKPOINT_DIR,
    fit_scaler,
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

SEED = 42

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)


# ============================================================
# TRAINING CONFIGURATION
# ============================================================

EPOCHS = 60

BATCH_SIZE = 32

LEARNING_RATE = 0.0005

WEIGHT_DECAY = 0.0001

LATENT_LOSS_WEIGHT = 0.5

RISK_LOSS_WEIGHT = 2.0

# Do not down-weight the attack class.
POSITIVE_CLASS_WEIGHT = 1.0

GRADIENT_CLIP_NORM = 1.0

EARLY_STOPPING_PATIENCE = 12

MIN_EPOCHS = 10


# ============================================================
# HELPERS
# ============================================================

def load_dataframe():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"CTU13 dataset not found: {DATA_PATH}"
        )

    import pandas as pd

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


def create_scenario_balanced_sampler(dataset):
    scenario_counts = {}

    for sample in dataset.samples:
        scenario = sample["scenario"]

        scenario_counts[scenario] = (
            scenario_counts.get(scenario, 0)
            + 1
        )

    weights = []

    for sample in dataset.samples:
        scenario = sample["scenario"]

        weights.append(
            1.0 / scenario_counts[scenario]
        )

    weights = torch.tensor(
        weights,
        dtype=torch.double,
    )

    generator = torch.Generator()
    generator.manual_seed(SEED)

    return WeightedRandomSampler(
        weights=weights,
        num_samples=len(weights),
        replacement=True,
        generator=generator,
    )


# ============================================================
# RISK METRICS
# ============================================================

def calculate_risk_metrics(
    risk_logits,
    future_attack,
):
    """
    Calculate threshold-independent risk metrics.

    Returns:
        mean PR-AUC
        mean ROC-AUC
        per-horizon metrics
    """

    probabilities = (
        torch.sigmoid(risk_logits)
        .detach()
        .cpu()
        .numpy()
    )

    labels = (
        future_attack
        .detach()
        .cpu()
        .numpy()
    )

    horizon_metrics = {}

    pr_values = []
    roc_values = []

    for horizon_index in range(
        FORECAST_HORIZON
    ):

        y_true = labels[:, horizon_index]
        y_prob = probabilities[:, horizon_index]

        unique_labels = np.unique(y_true)

        if len(unique_labels) < 2:
            roc_auc = float("nan")
            pr_auc = float("nan")
        else:
            roc_auc = float(
                roc_auc_score(
                    y_true,
                    y_prob,
                )
            )

            pr_auc = float(
                average_precision_score(
                    y_true,
                    y_prob,
                )
            )

            roc_values.append(roc_auc)
            pr_values.append(pr_auc)

        horizon_metrics[
            f"T+{horizon_index + 1}"
        ] = {
            "roc_auc": roc_auc,
            "pr_auc": pr_auc,
        }

    mean_pr_auc = (
        float(np.mean(pr_values))
        if pr_values
        else float("-inf")
    )

    mean_roc_auc = (
        float(np.mean(roc_values))
        if roc_values
        else float("nan")
    )

    return (
        mean_pr_auc,
        mean_roc_auc,
        horizon_metrics,
    )


# ============================================================
# VALIDATION
# ============================================================

def evaluate_model(
    model,
    loader,
    latent_criterion,
    risk_criterion,
):
    model.eval()

    total_latent_loss = 0.0
    total_risk_loss = 0.0
    total_combined_loss = 0.0
    total_samples = 0

    all_logits = []
    all_labels = []

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

            combined_loss = (
                LATENT_LOSS_WEIGHT
                * latent_loss
                + RISK_LOSS_WEIGHT
                * risk_loss
            )

            batch_size = history.size(0)

            total_latent_loss += (
                float(latent_loss.item())
                * batch_size
            )

            total_risk_loss += (
                float(risk_loss.item())
                * batch_size
            )

            total_combined_loss += (
                float(combined_loss.item())
                * batch_size
            )

            total_samples += batch_size

            all_logits.append(
                risk_logits.detach().cpu()
            )

            all_labels.append(
                future_attack.detach().cpu()
            )

    if total_samples == 0:
        raise RuntimeError(
            "Validation loader contains zero samples."
        )

    logits = torch.cat(
        all_logits,
        dim=0,
    )

    labels = torch.cat(
        all_labels,
        dim=0,
    )

    (
        mean_pr_auc,
        mean_roc_auc,
        horizon_metrics,
    ) = calculate_risk_metrics(
        logits,
        labels,
    )

    return {
        "latent_loss": (
            total_latent_loss
            / total_samples
        ),
        "risk_loss": (
            total_risk_loss
            / total_samples
        ),
        "combined_loss": (
            total_combined_loss
            / total_samples
        ),
        "mean_pr_auc": mean_pr_auc,
        "mean_roc_auc": mean_roc_auc,
        "horizon_metrics": horizon_metrics,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print(
        "CTU13 RISK WORLD MODEL - "
        "RISK-FOCUSED RETRAINING"
    )
    print("=" * 70)

    print(
        f"Seed:                 {SEED}"
    )

    print(
        f"Device:               {DEVICE}"
    )

    print(
        f"Input features:       {len(FEATURE_NAMES)}"
    )

    print(
        f"Sequence length:      {SEQUENCE_LENGTH}"
    )

    print(
        f"Forecast horizon:     {FORECAST_HORIZON}"
    )

    print(
        "Latent dimension:     64"
    )

    print(
        f"Epochs:               {EPOCHS}"
    )

    print(
        f"Minimum epochs:       {MIN_EPOCHS}"
    )

    print(
        f"Batch size:           {BATCH_SIZE}"
    )

    print(
        f"Learning rate:        {LEARNING_RATE}"
    )

    print(
        f"Latent loss weight:   {LATENT_LOSS_WEIGHT}"
    )

    print(
        f"Risk loss weight:     {RISK_LOSS_WEIGHT}"
    )

    print(
        f"Positive class weight:{POSITIVE_CLASS_WEIGHT}"
    )

    print()

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    df = load_dataframe()

    print(
        f"Total CTU13 states: {len(df)}"
    )

    print()

    print(
        f"Train scenarios:      {TRAIN_SCENARIOS}"
    )

    print(
        f"Validation scenarios: {VALIDATION_SCENARIOS}"
    )

    print(
        f"Test scenarios:       {TEST_SCENARIOS}"
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
    # SAMPLER
    # --------------------------------------------------------

    sampler = create_scenario_balanced_sampler(
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

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = (
        CTU13RiskWorldModel()
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
    # CHECKPOINT STATE
    # --------------------------------------------------------

    best_validation_pr_auc = float(
        "-inf"
    )

    best_epoch = 0

    epochs_without_improvement = 0

    best_validation_metrics = None

    # --------------------------------------------------------
    # TRAINING
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("TRAINING")
    print("=" * 70)

    for epoch in range(
        1,
        EPOCHS + 1,
    ):

        model.train()

        running_latent = 0.0
        running_risk = 0.0
        running_combined = 0.0

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

            combined_loss = (
                LATENT_LOSS_WEIGHT
                * latent_loss
                + RISK_LOSS_WEIGHT
                * risk_loss
            )

            combined_loss.backward()

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                GRADIENT_CLIP_NORM,
            )

            optimizer.step()

            batch_size = history.size(0)

            running_latent += (
                float(latent_loss.item())
                * batch_size
            )

            running_risk += (
                float(risk_loss.item())
                * batch_size
            )

            running_combined += (
                float(combined_loss.item())
                * batch_size
            )

            sample_count += batch_size

        train_latent = (
            running_latent
            / sample_count
        )

        train_risk = (
            running_risk
            / sample_count
        )

        train_combined = (
            running_combined
            / sample_count
        )

        validation_metrics = evaluate_model(
            model,
            validation_loader,
            latent_criterion,
            risk_criterion,
        )

        val_pr_auc = (
            validation_metrics[
                "mean_pr_auc"
            ]
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train={train_combined:.6f} | "
            f"Latent={train_latent:.6f} | "
            f"Risk={train_risk:.6f} | "
            f"Val={validation_metrics['combined_loss']:.6f} | "
            f"Val PR-AUC={val_pr_auc:.6f} | "
            f"Val ROC-AUC={validation_metrics['mean_roc_auc']:.6f}"
        )

        for horizon, metrics in (
            validation_metrics[
                "horizon_metrics"
            ].items()
        ):

            print(
                f"    {horizon}: "
                f"PR-AUC={metrics['pr_auc']:.6f} | "
                f"ROC-AUC={metrics['roc_auc']:.6f}"
            )

        # ----------------------------------------------------
        # BEST CHECKPOINT
        #
        # Checkpoint selection is based on validation PR-AUC.
        #
        # Scenario 13 is never consulted here.
        # ----------------------------------------------------

        improved = (
            val_pr_auc
            > best_validation_pr_auc
            + 1e-6
        )

        if improved:

            best_validation_pr_auc = (
                val_pr_auc
            )

            best_epoch = epoch

            best_validation_metrics = (
                validation_metrics
            )

            epochs_without_improvement = 0

            torch.save(
                model.state_dict(),
                CHECKPOINT_DIR
                / "ctu13_risk_world_model.pt",
            )

            print(
                "    -> BEST CHECKPOINT SAVED"
            )

        else:

            epochs_without_improvement += 1

        # ----------------------------------------------------
        # EARLY STOPPING
        # ----------------------------------------------------

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

    # --------------------------------------------------------
    # LOAD BEST CHECKPOINT
    # --------------------------------------------------------

    checkpoint_path = (
        CHECKPOINT_DIR
        / "ctu13_risk_world_model.pt"
    )

    if not checkpoint_path.exists():
        raise RuntimeError(
            "No best checkpoint was created."
        )

    best_state = torch.load(
        checkpoint_path,
        map_location=DEVICE,
        weights_only=True,
    )

    model.load_state_dict(
        best_state
    )

    # --------------------------------------------------------
    # SAVE COMPONENT CHECKPOINTS
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # SAVE SCALER
    # --------------------------------------------------------

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
    # FINAL VALIDATION
    # --------------------------------------------------------

    final_validation_metrics = (
        evaluate_model(
            model,
            validation_loader,
            latent_criterion,
            risk_criterion,
        )
    )

    # --------------------------------------------------------
    # METADATA
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

        "input_dim": len(FEATURE_NAMES),

        "sequence_length": SEQUENCE_LENGTH,

        "forecast_horizon": FORECAST_HORIZON,

        "latent_dimension": 64,

        "epochs_configured": EPOCHS,

        "minimum_epochs": MIN_EPOCHS,

        "best_epoch": best_epoch,

        "batch_size": BATCH_SIZE,

        "learning_rate": LEARNING_RATE,

        "optimizer": "AdamW",

        "weight_decay": WEIGHT_DECAY,

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
            POSITIVE_CLASS_WEIGHT
        ),

        "gradient_clip_norm": (
            GRADIENT_CLIP_NORM
        ),

        "early_stopping_patience": (
            EARLY_STOPPING_PATIENCE
        ),

        "checkpoint_selection": (
            "validation_mean_pr_auc"
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

        "best_validation_mean_pr_auc": (
            best_validation_pr_auc
        ),

        "best_validation_metrics": (
            best_validation_metrics
        ),

        "final_validation_metrics": (
            final_validation_metrics
        ),

        "checkpoint": (
            "ctu13_risk_world_model.pt"
        ),

        "scope_note": (
            "Scenario 13 is never used "
            "during training or checkpoint "
            "selection."
        ),

        "test_note": (
            "Scenario 13 must only be "
            "evaluated by the separate "
            "evaluation script after "
            "training is complete."
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

    # --------------------------------------------------------
    # COMPLETE
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("RISK-FOCUSED RETRAINING COMPLETE")
    print("=" * 70)

    print(
        f"Best epoch:              {best_epoch}"
    )

    print(
        f"Best validation PR-AUC:  "
        f"{best_validation_pr_auc:.6f}"
    )

    print(
        f"Checkpoint:              "
        f"{checkpoint_path}"
    )

    print()

    print(
        "Scenario 13 was NOT used "
        "for training or checkpoint selection."
    )


if __name__ == "__main__":
    main()