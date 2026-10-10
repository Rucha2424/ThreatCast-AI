"""
CTU13 weakly-supervised MITRE ATT&CK stage head.

IMPORTANT METHODOLOGY
---------------------
CTU13 does not provide ground-truth timestamped MITRE ATT&CK tactic labels.

Therefore this model is explicitly WEAKLY SUPERVISED.

Labels are derived from the documented CTU13 scenario activity mapping:

    PORT_SCAN / HTTP / IRC / P2P / SPAM / CLICK_FRAUD / DDOS
            ↓
    Discovery / Command and Control / Impact

This implementation uses MULTI-LABEL supervision rather than forcing every
scenario into one arbitrary "primary" tactic.

The existing CTU13 risk world model is frozen. Only an auxiliary stage head
is trained on its 64-D current latent.

Scenario 13 remains completely held out from:
    - stage-head training
    - validation/model selection
    - threshold selection

Scenario 13 is evaluated only after the stage head has been selected.

Because the labels are scenario/activity-derived rather than ground-truth
timestamped MITRE labels, evaluation is reported as weak-label consistency,
NOT as ground-truth MITRE classification accuracy.
"""

from pathlib import Path
import json
import random

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
    hamming_loss,
)

from world_model.attack_stage import (
    ACTIVITY_MAP,
    SCENARIO_ACTIVITIES,
)
from world_model.train_ctu13_risk_model import (
    CTU13RiskWorldModel,
    FEATURE_NAMES,
    INPUT_DIM,
    LATENT_DIM,
    SEQUENCE_LENGTH,
    TRAIN_SCENARIOS,
    TEST_SCENARIOS,
    fit_scaler,
    DATA_PATH,
    CHECKPOINT_DIR,
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

torch.use_deterministic_algorithms(True)


# ============================================================
# DEVICE / CONFIG
# ============================================================

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

EPOCHS = 60
BATCH_SIZE = 32
LEARNING_RATE = 0.001
WEIGHT_DECAY = 1e-4

EARLY_STOPPING_PATIENCE = 10

DROPOUT = 0.20

NUM_CLASSES = 3

CLASS_NAMES = [
    "Discovery",
    "Command and Control",
    "Impact",
]

CLASS_TO_INDEX = {
    name: index
    for index, name in enumerate(CLASS_NAMES)
}

STAGE_CHECKPOINT = (
    CHECKPOINT_DIR / "ctu13_stage_head.pt"
)

STAGE_METADATA = (
    CHECKPOINT_DIR / "stage_training_metadata.json"
)


# ============================================================
# SCENARIO SPLIT FOR STAGE HEAD
# ============================================================
#
# The risk model's split is NOT changed.
#
# For the auxiliary stage model we need a validation set
# containing all three weak-label classes.
#
# These scenarios are removed from stage-head training only.
#
# Scenario 13 remains the final held-out test.
# ============================================================

STAGE_TRAIN_SCENARIOS = [
    1,
    2,
    3,
    4,
    8,
    9,
]

STAGE_VALIDATION_SCENARIOS = [
    5,
    6,
    10,
    11,
]

STAGE_TEST_SCENARIOS = [
    13,
]


# ============================================================
# WEAK LABEL GENERATION
# ============================================================

def scenario_stage_vector(scenario):
    """
    Convert the documented scenario activity list into a
    three-element multi-label tactic vector.

    Example:

        scenario 5:
            SPAM
            PORT_SCAN
            HTTP

        -> Discovery = 1
           C2        = 1
           Impact    = 1
    """

    activities = SCENARIO_ACTIVITIES.get(
        int(scenario),
        [],
    )

    vector = np.zeros(
        NUM_CLASSES,
        dtype=np.float32,
    )

    for activity in activities:

        if activity not in ACTIVITY_MAP:
            continue

        tactic = ACTIVITY_MAP[activity].tactic

        if tactic not in CLASS_TO_INDEX:
            continue

        vector[
            CLASS_TO_INDEX[tactic]
        ] = 1.0

    return vector


# ============================================================
# DATASET
# ============================================================

class CTU13StageDataset(Dataset):

    def __init__(
        self,
        dataframe,
        scenarios,
        mean,
        std,
    ):

        self.histories = []
        self.labels = []
        self.scenarios = []

        for scenario in scenarios:

            scenario_df = (
                dataframe[
                    dataframe["Scenario"] == scenario
                ]
                .sort_values("Timestamp")
                .reset_index(drop=True)
            )

            if len(scenario_df) < SEQUENCE_LENGTH:
                continue

            features = (
                scenario_df[FEATURE_NAMES]
                .replace(
                    [np.inf, -np.inf],
                    np.nan,
                )
                .fillna(0.0)
                .to_numpy(
                    dtype=np.float32
                )
            )

            scaled = (
                features - mean
            ) / std

            label = scenario_stage_vector(
                scenario
            )

            for start in range(
                len(scenario_df)
                - SEQUENCE_LENGTH
                + 1
            ):

                history = scaled[
                    start:
                    start + SEQUENCE_LENGTH
                ]

                self.histories.append(
                    history.astype(
                        np.float32
                    )
                )

                self.labels.append(
                    label.copy()
                )

                self.scenarios.append(
                    int(scenario)
                )

        if not self.histories:
            raise RuntimeError(
                "No stage-head samples were created."
            )

        self.histories = np.stack(
            self.histories
        )

        self.labels = np.stack(
            self.labels
        )

        self.scenarios = np.asarray(
            self.scenarios,
            dtype=np.int64,
        )

    def __len__(self):
        return len(self.histories)

    def __getitem__(self, index):

        return (
            torch.from_numpy(
                self.histories[index]
            ),
            torch.from_numpy(
                self.labels[index]
            ),
        )


# ============================================================
# STAGE HEAD
# ============================================================

class StageClassificationHead(nn.Module):

    def __init__(
        self,
        latent_dim=LATENT_DIM,
        num_classes=NUM_CLASSES,
    ):

        super().__init__()

        self.network = nn.Sequential(

            nn.Linear(
                latent_dim,
                32,
            ),

            nn.LayerNorm(32),

            nn.GELU(),

            nn.Dropout(
                DROPOUT
            ),

            nn.Linear(
                32,
                num_classes,
            ),
        )

    def forward(self, x):

        return self.network(x)


# ============================================================
# LATENT EXTRACTION
# ============================================================

@torch.no_grad()
def extract_latents(
    world_model,
    histories,
    batch_size=128,
):

    world_model.eval()

    outputs = []

    for start in range(
        0,
        len(histories),
        batch_size,
    ):

        batch = torch.from_numpy(
            histories[
                start:
                start + batch_size
            ]
        ).to(DEVICE)

        projected = (
            world_model.feature_projection(
                batch
            )
        )

        current_latent = (
            world_model.temporal_encoder(
                projected
            )
        )

        outputs.append(
            current_latent.detach()
            .cpu()
            .numpy()
        )

    return np.concatenate(
        outputs,
        axis=0,
    ).astype(np.float32)


# ============================================================
# METRICS
# ============================================================

def multilabel_metrics(
    y_true,
    probabilities,
    threshold=0.5,
):

    y_true = np.asarray(
        y_true,
        dtype=np.int32,
    )

    probabilities = np.asarray(
        probabilities,
        dtype=np.float64,
    )

    y_pred = (
        probabilities >= threshold
    ).astype(np.int32)

    macro_f1 = f1_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    micro_f1 = f1_score(
        y_true,
        y_pred,
        average="micro",
        zero_division=0,
    )

    macro_precision = precision_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    macro_recall = recall_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    return {
        "macro_f1": float(macro_f1),
        "micro_f1": float(micro_f1),
        "macro_precision": float(
            macro_precision
        ),
        "macro_recall": float(
            macro_recall
        ),
        "hamming_loss": float(
            hamming_loss(
                y_true,
                y_pred,
            )
        ),
        "threshold": float(threshold),
    }


# ============================================================
# THRESHOLD SELECTION
# ============================================================

def select_thresholds(
    y_true,
    probabilities,
):

    thresholds = np.arange(
        0.10,
        0.91,
        0.05,
    )

    selected = {}

    for class_index, class_name in enumerate(
        CLASS_NAMES
    ):

        best_threshold = 0.50
        best_f1 = -1.0

        class_true = y_true[
            :,
            class_index,
        ]

        class_probability = probabilities[
            :,
            class_index,
        ]

        for threshold in thresholds:

            class_pred = (
                class_probability
                >= threshold
            ).astype(int)

            score = f1_score(
                class_true,
                class_pred,
                zero_division=0,
            )

            if score > best_f1:

                best_f1 = float(score)
                best_threshold = float(
                    threshold
                )

        selected[class_name] = {
            "threshold": best_threshold,
            "validation_f1": best_f1,
        }

    return selected


# ============================================================
# PREDICTION
# ============================================================

@torch.no_grad()
def predict_head(
    head,
    latent_array,
):

    head.eval()

    latent_tensor = torch.from_numpy(
        latent_array
    ).to(DEVICE)

    logits = head(
        latent_tensor
    )

    probabilities = torch.sigmoid(
        logits
    )

    return probabilities.cpu().numpy()


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 78)
    print(
        "CTU13 WEAKLY-SUPERVISED MITRE STAGE HEAD"
    )
    print("=" * 78)

    print(
        f"Seed:                 {SEED}"
    )

    print(
        f"Device:               {DEVICE}"
    )

    print(
        f"Latent dimension:     {LATENT_DIM}"
    )

    print(
        f"Classes:              {CLASS_NAMES}"
    )

    print(
        f"Stage train scenarios: "
        f"{STAGE_TRAIN_SCENARIOS}"
    )

    print(
        f"Stage validation:     "
        f"{STAGE_VALIDATION_SCENARIOS}"
    )

    print(
        f"Stage test:           "
        f"{STAGE_TEST_SCENARIOS}"
    )

    print()

    # --------------------------------------------------------
    # LOAD DATA
    # --------------------------------------------------------

    dataframe = pd.read_csv(
        DATA_PATH
    )

    dataframe["Timestamp"] = pd.to_datetime(
        dataframe["Timestamp"]
    )

      # --------------------------------------------------------
    # LOAD FROZEN TRAIN-ONLY SCALER
    # --------------------------------------------------------
    #
    # The risk world model already saved normalization statistics
    # calculated from its training scenarios.
    #
    # Reuse those exact statistics so the auxiliary stage head
    # sees the same feature representation as the frozen world model.
    #
    # Scenario 13 is therefore not allowed to influence scaling.
    # --------------------------------------------------------

    scaler_mean_path = (
        CHECKPOINT_DIR / "feature_mean.npy"
    )

    scaler_std_path = (
        CHECKPOINT_DIR / "feature_std.npy"
    )

    if not scaler_mean_path.exists():
        raise FileNotFoundError(
            f"Missing train-only scaler mean: "
            f"{scaler_mean_path}"
        )

    if not scaler_std_path.exists():
        raise FileNotFoundError(
            f"Missing train-only scaler std: "
            f"{scaler_std_path}"
        )

    mean = np.load(
        scaler_mean_path
    ).astype(np.float32)

    std = np.load(
        scaler_std_path
    ).astype(np.float32)

    if mean.shape != (INPUT_DIM,):
        raise RuntimeError(
            "Invalid feature_mean shape: "
            f"{mean.shape}; expected "
            f"({INPUT_DIM},)"
        )

    if std.shape != (INPUT_DIM,):
        raise RuntimeError(
            "Invalid feature_std shape: "
            f"{std.shape}; expected "
            f"({INPUT_DIM},)"
        )

    if not np.all(np.isfinite(mean)):
        raise RuntimeError(
            "feature_mean.npy contains non-finite values."
        )

    if not np.all(np.isfinite(std)):
        raise RuntimeError(
            "feature_std.npy contains non-finite values."
        )

    if np.any(std <= 0):
        raise RuntimeError(
            "feature_std.npy contains zero or negative "
            "standard deviations."
        )

    print(
        "Scaler source:        frozen risk-model scaler"
    )

    print(
        f"Mean shape:            {mean.shape}"
    )

    print(
        f"Std shape:             {std.shape}"
    )

    print(
        "Scenario 13 in scaler: NO"
    )

    print()

    # --------------------------------------------------------
    # BUILD DATASETS
    # --------------------------------------------------------

    train_dataset = CTU13StageDataset(
        dataframe,
        STAGE_TRAIN_SCENARIOS,
        mean,
        std,
    )

    validation_dataset = CTU13StageDataset(
        dataframe,
        STAGE_VALIDATION_SCENARIOS,
        mean,
        std,
    )

    test_dataset = CTU13StageDataset(
        dataframe,
        STAGE_TEST_SCENARIOS,
        mean,
        std,
    )

    print(
        f"Train stage windows:      "
        f"{len(train_dataset)}"
    )

    print(
        f"Validation stage windows: "
        f"{len(validation_dataset)}"
    )

    print(
        f"Test stage windows:       "
        f"{len(test_dataset)}"
    )

    print()

    # --------------------------------------------------------
    # LABEL COVERAGE CHECK
    # --------------------------------------------------------

    print("=" * 78)
    print("WEAK-LABEL COVERAGE CHECK")
    print("=" * 78)

    for split_name, scenarios in [
        (
            "TRAIN",
            STAGE_TRAIN_SCENARIOS,
        ),
        (
            "VALIDATION",
            STAGE_VALIDATION_SCENARIOS,
        ),
        (
            "TEST",
            STAGE_TEST_SCENARIOS,
        ),
    ]:

        print()
        print(
            f"{split_name}:"
        )

        combined = np.zeros(
            NUM_CLASSES,
            dtype=int,
        )

        for scenario in scenarios:

            vector = scenario_stage_vector(
                scenario
            )

            combined |= (
                vector.astype(int)
            )

            active = [
                CLASS_NAMES[i]
                for i, value in enumerate(
                    vector
                )
                if value > 0
            ]

            print(
                f"  Scenario {scenario:2d}: "
                f"{active}"
            )

        print(
            "  Coverage:",
            [
                CLASS_NAMES[i]
                for i, value in enumerate(
                    combined
                )
                if value > 0
            ],
        )

    # --------------------------------------------------------
    # LOAD FROZEN RISK WORLD MODEL
    # --------------------------------------------------------

    print()
    print("=" * 78)
    print("LOADING FROZEN WORLD MODEL")
    print("=" * 78)

    world_model = CTU13RiskWorldModel().to(
        DEVICE
    )

    checkpoint_path = (
        CHECKPOINT_DIR
        / "ctu13_risk_world_model.pt"
    )

    checkpoint = torch.load(
        checkpoint_path,
        map_location=DEVICE,
        weights_only=False,
    )

    if not isinstance(
        checkpoint,
        dict,
    ):
        raise RuntimeError(
            "Unexpected world-model checkpoint format."
        )

    model_state = (
        checkpoint.get(
            "model_state_dict",
            checkpoint,
        )
    )

    missing, unexpected = (
        world_model.load_state_dict(
            model_state,
            strict=False,
        )
    )

    if missing or unexpected:

        raise RuntimeError(
            "World-model checkpoint mismatch.\n"
            f"Missing: {missing}\n"
            f"Unexpected: {unexpected}"
        )

    world_model.eval()

    for parameter in world_model.parameters():
        parameter.requires_grad = False

    print(
        f"Checkpoint: {checkpoint_path}"
    )

    print(
        "World model frozen: YES"
    )

    print()

    # --------------------------------------------------------
    # EXTRACT LATENTS
    # --------------------------------------------------------

    train_latents = extract_latents(
        world_model,
        train_dataset.histories,
    )

    validation_latents = extract_latents(
        world_model,
        validation_dataset.histories,
    )

    test_latents = extract_latents(
        world_model,
        test_dataset.histories,
    )

    print(
        "Latent extraction complete."
    )

    print(
        f"Train latent shape:      "
        f"{train_latents.shape}"
    )

    print(
        f"Validation latent shape: "
        f"{validation_latents.shape}"
    )

    print(
        f"Test latent shape:       "
        f"{test_latents.shape}"
    )

    # --------------------------------------------------------
    # DATA LOADERS
    # --------------------------------------------------------

    train_loader = DataLoader(
        list(
            zip(
                torch.from_numpy(
                    train_latents
                ),
                torch.from_numpy(
                    train_dataset.labels
                ),
            )
        ),
        batch_size=BATCH_SIZE,
        shuffle=True,
    )

    validation_loader = DataLoader(
        list(
            zip(
                torch.from_numpy(
                    validation_latents
                ),
                torch.from_numpy(
                    validation_dataset.labels
                ),
            )
        ),
        batch_size=BATCH_SIZE,
        shuffle=False,
    )

    # --------------------------------------------------------
    # CLASS WEIGHTS
    # --------------------------------------------------------

    positive_counts = (
        train_dataset.labels.sum(
            axis=0
        )
    )

    negative_counts = (
        len(train_dataset)
        - positive_counts
    )

    positive_counts = np.maximum(
        positive_counts,
        1.0,
    )

    pos_weight = (
        negative_counts
        / positive_counts
    )

    pos_weight_tensor = torch.tensor(
        pos_weight,
        dtype=torch.float32,
        device=DEVICE,
    )

    print()
    print(
        "Training positive counts:",
        positive_counts.astype(int).tolist(),
    )

    print(
        "Training negative counts:",
        negative_counts.astype(int).tolist(),
    )

    print(
        "BCE positive weights:",
        pos_weight.tolist(),
    )

    # --------------------------------------------------------
    # HEAD
    # --------------------------------------------------------

    head = StageClassificationHead().to(
        DEVICE
    )

    criterion = nn.BCEWithLogitsLoss(
        pos_weight=pos_weight_tensor
    )

    optimizer = torch.optim.AdamW(
        head.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    # --------------------------------------------------------
    # TRAINING
    # --------------------------------------------------------

    print()
    print("=" * 78)
    print("STAGE HEAD TRAINING")
    print("=" * 78)

    best_macro_f1 = -1.0
    best_epoch = 0
    epochs_without_improvement = 0

    best_state = None

    for epoch in range(
        1,
        EPOCHS + 1,
    ):

        head.train()

        running_loss = 0.0
        sample_count = 0

        for latent_batch, label_batch in train_loader:

            latent_batch = latent_batch.to(
                DEVICE
            )

            label_batch = label_batch.to(
                DEVICE
            )

            optimizer.zero_grad(
                set_to_none=True
            )

            logits = head(
                latent_batch
            )

            loss = criterion(
                logits,
                label_batch,
            )

            loss.backward()

            torch.nn.utils.clip_grad_norm_(
                head.parameters(),
                1.0,
            )

            optimizer.step()

            batch_size = (
                latent_batch.shape[0]
            )

            running_loss += (
                loss.item()
                * batch_size
            )

            sample_count += batch_size

        train_loss = (
            running_loss
            / max(sample_count, 1)
        )

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        head.eval()

        validation_probabilities = []

        with torch.no_grad():

            for latent_batch, _ in validation_loader:

                latent_batch = latent_batch.to(
                    DEVICE
                )

                logits = head(
                    latent_batch
                )

                probabilities = (
                    torch.sigmoid(
                        logits
                    )
                    .cpu()
                    .numpy()
                )

                validation_probabilities.append(
                    probabilities
                )

        validation_probabilities = np.concatenate(
            validation_probabilities,
            axis=0,
        )

        validation_metrics = multilabel_metrics(
            validation_dataset.labels,
            validation_probabilities,
            threshold=0.50,
        )

        current_f1 = (
            validation_metrics[
                "macro_f1"
            ]
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train Loss={train_loss:.6f} | "
            f"Val Macro-F1={current_f1:.6f} | "
            f"Val Micro-F1="
            f"{validation_metrics['micro_f1']:.6f}"
        )

        if current_f1 > best_macro_f1:

            best_macro_f1 = current_f1
            best_epoch = epoch
            epochs_without_improvement = 0

            best_state = {
                key: value.detach()
                .cpu()
                .clone()
                for key, value in (
                    head.state_dict().items()
                )
            }

            print(
                "    -> BEST STAGE CHECKPOINT SAVED"
            )

        else:

            epochs_without_improvement += 1

        if (
            epochs_without_improvement
            >= EARLY_STOPPING_PATIENCE
        ):

            print(
                "Early stopping triggered."
            )

            break

    # --------------------------------------------------------
    # RESTORE BEST
    # --------------------------------------------------------

    if best_state is None:

        raise RuntimeError(
            "No valid stage-head checkpoint was produced."
        )

    head.load_state_dict(
        best_state
    )

    head.to(DEVICE)

    # --------------------------------------------------------
    # FINAL VALIDATION
    # --------------------------------------------------------

    validation_probabilities = predict_head(
        head,
        validation_latents,
    )

    validation_metrics = multilabel_metrics(
        validation_dataset.labels,
        validation_probabilities,
        threshold=0.50,
    )

    thresholds = select_thresholds(
        validation_dataset.labels,
        validation_probabilities,
    )

    # --------------------------------------------------------
    # FINAL TEST
    # --------------------------------------------------------

    test_probabilities = predict_head(
        head,
        test_latents,
    )

    # Per-class thresholds are selected ONLY from validation.
    test_predictions = np.zeros_like(
        test_probabilities,
        dtype=np.int32,
    )

    for class_index, class_name in enumerate(
        CLASS_NAMES
    ):

        threshold = thresholds[
            class_name
        ]["threshold"]

        test_predictions[
            :,
            class_index
        ] = (
            test_probabilities[
                :,
                class_index
            ]
            >= threshold
        ).astype(np.int32)

    test_macro_f1 = f1_score(
        test_dataset.labels,
        test_predictions,
        average="macro",
        zero_division=0,
    )

    test_micro_f1 = f1_score(
        test_dataset.labels,
        test_predictions,
        average="micro",
        zero_division=0,
    )

    test_precision = precision_score(
        test_dataset.labels,
        test_predictions,
        average="macro",
        zero_division=0,
    )

    test_recall = recall_score(
        test_dataset.labels,
        test_predictions,
        average="macro",
        zero_division=0,
    )

    test_hamming = hamming_loss(
        test_dataset.labels,
        test_predictions,
    )

    # --------------------------------------------------------
    # SAVE CHECKPOINT
    # --------------------------------------------------------

    torch.save(
        {
            "model_state_dict": head.state_dict(),
            "latent_dimension": LATENT_DIM,
            "num_classes": NUM_CLASSES,
            "class_names": CLASS_NAMES,
            "seed": SEED,
        },
        STAGE_CHECKPOINT,
    )

    # --------------------------------------------------------
    # METADATA
    # --------------------------------------------------------

    metadata = {

        "model":
            "CTU13 Weakly-Supervised MITRE Stage Head",

        "dataset":
            "CTU13",

        "supervision":
            "weakly_supervised",

        "label_source":
            (
                "Documented CTU13 activity-to-"
                "ATT&CK-tactic interpretation"
            ),

        "ground_truth_mitre_labels":
            False,

        "architecture":
            (
                "Frozen CTU13 risk world-model "
                "64-D current latent -> "
                "32-D hidden -> "
                "3-output multi-label stage head"
            ),

        "class_names":
            CLASS_NAMES,

        "input_latent_dimension":
            LATENT_DIM,

        "input_sequence_length":
            SEQUENCE_LENGTH,

        "feature_count":
            INPUT_DIM,

        "features":
            FEATURE_NAMES,

        "seed":
            SEED,

        "device":
            str(DEVICE),

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

        "early_stopping_patience":
            EARLY_STOPPING_PATIENCE,

        "stage_train_scenarios":
            STAGE_TRAIN_SCENARIOS,

        "stage_validation_scenarios":
            STAGE_VALIDATION_SCENARIOS,

        "stage_test_scenarios":
            STAGE_TEST_SCENARIOS,

        "risk_model_train_scenarios":
            TRAIN_SCENARIOS,

        "risk_model_test_scenario":
            TEST_SCENARIOS,

        "scenario_13_used_for_training":
            False,

        "scenario_13_used_for_model_selection":
            False,

        "scenario_13_used_for_threshold_selection":
            False,

        "validation_macro_f1_at_0_5":
            validation_metrics["macro_f1"],

        "validation_micro_f1_at_0_5":
            validation_metrics["micro_f1"],

        "selected_validation_thresholds":
            thresholds,

        "test_macro_f1":
            float(test_macro_f1),

        "test_micro_f1":
            float(test_micro_f1),

        "test_macro_precision":
            float(test_precision),

        "test_macro_recall":
            float(test_recall),

        "test_hamming_loss":
            float(test_hamming),

        "checkpoint":
            STAGE_CHECKPOINT.name,

        "methodology_note":
            (
                "Stage labels are weak scenario/activity-derived "
                "labels. They are not ground-truth timestamped "
                "MITRE ATT&CK annotations. Test metrics therefore "
                "measure consistency with the weak label construction "
                "and must not be presented as ground-truth MITRE "
                "classification performance."
            ),
    }

    with open(
        STAGE_METADATA,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
        )

    # --------------------------------------------------------
    # FINAL REPORT
    # --------------------------------------------------------

    print()
    print("=" * 78)
    print("STAGE HEAD TRAINING COMPLETE")
    print("=" * 78)

    print(
        f"Best epoch:                 {best_epoch}"
    )

    print(
        f"Validation Macro-F1:        "
        f"{validation_metrics['macro_f1']:.6f}"
    )

    print(
        f"Validation Micro-F1:        "
        f"{validation_metrics['micro_f1']:.6f}"
    )

    print(
        f"Scenario 13 Macro-F1:       "
        f"{test_macro_f1:.6f}"
    )

    print(
        f"Scenario 13 Micro-F1:       "
        f"{test_micro_f1:.6f}"
    )

    print(
        f"Scenario 13 Macro Precision:"
        f" {test_precision:.6f}"
    )

    print(
        f"Scenario 13 Macro Recall:   "
        f"{test_recall:.6f}"
    )

    print(
        f"Scenario 13 Hamming Loss:   "
        f"{test_hamming:.6f}"
    )

    print()

    print(
        "Validation-selected thresholds:"
    )

    for class_name in CLASS_NAMES:

        print(
            f"  {class_name:22s}: "
            f"{thresholds[class_name]['threshold']:.2f}"
        )

    print()

    print(
        f"Checkpoint: {STAGE_CHECKPOINT}"
    )

    print(
        f"Metadata:   {STAGE_METADATA}"
    )

    print()

    print(
        "Scenario 13 was NOT used for training, "
        "model selection, or threshold selection."
    )

    print(
        "Supervision: WEAKLY SUPERVISED."
    )

    print(
        "Ground-truth timestamped MITRE labels: NOT AVAILABLE."
    )


if __name__ == "__main__":
    main()