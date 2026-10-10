from pathlib import Path
import json

import numpy as np
import pandas as pd
import torch
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
from torch.utils.data import DataLoader

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
)

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
# CONFIG
# ============================================================

BATCH_SIZE = 64

# Fine-grained threshold search.
# Thresholds are selected ONLY from validation data.
THRESHOLD_GRID = np.arange(
    0.001,
    1.000,
    0.001,
)

# Security-oriented operating constraint.
#
# We first restrict candidate thresholds to those producing
# validation FPR <= this value, then select the candidate
# with the highest F1.
#
# Scenario 13 is NEVER used for this selection.
MAX_VALIDATION_FPR = 0.10


# ============================================================
# DATA
# ============================================================

def load_data():

    if not DATA_PATH.exists():

        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH)

    mean_path = (
        CHECKPOINT_DIR
        / "feature_mean.npy"
    )

    std_path = (
        CHECKPOINT_DIR
        / "feature_std.npy"
    )

    if mean_path.exists() and std_path.exists():

        mean = np.load(mean_path)
        std = np.load(std_path)

    else:

        mean, std = fit_scaler(df)

    return df, mean, std


# ============================================================
# MODEL
# ============================================================

def load_model():

    checkpoint = (
        CHECKPOINT_DIR
        / "ctu13_risk_world_model.pt"
    )

    if not checkpoint.exists():

        raise FileNotFoundError(
            f"Risk model checkpoint not found: "
            f"{checkpoint}"
        )

    model = (
        CTU13RiskWorldModel()
        .to(DEVICE)
    )

    state = torch.load(
        checkpoint,
        map_location=DEVICE,
        weights_only=True,
    )

    model.load_state_dict(state)

    model.eval()

    return model


# ============================================================
# COLLECT PREDICTIONS
# ============================================================

def collect_predictions(
    model,
    dataset,
):

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    probabilities = {
        horizon: []
        for horizon in range(
            1,
            FORECAST_HORIZON + 1,
        )
    }

    labels = {
        horizon: []
        for horizon in range(
            1,
            FORECAST_HORIZON + 1,
        )
    }

    scenarios = []

    with torch.no_grad():

        for (
            history,
            _future_features,
            future_attack,
            batch_scenarios,
        ) in loader:

            history = history.to(
                DEVICE
            )

            (
                _latent_predictions,
                risk_logits,
            ) = model(history)

            risk_probability = (
                torch.sigmoid(
                    risk_logits
                )
                .cpu()
                .numpy()
            )

            future_attack = (
                future_attack
                .cpu()
                .numpy()
            )

            for horizon_index in range(
                FORECAST_HORIZON
            ):

                horizon = (
                    horizon_index + 1
                )

                probabilities[
                    horizon
                ].extend(
                    risk_probability[
                        :,
                        horizon_index,
                    ].tolist()
                )

                labels[
                    horizon
                ].extend(
                    future_attack[
                        :,
                        horizon_index,
                    ].tolist()
                )

            scenarios.extend(
                batch_scenarios.tolist()
            )

    return (
        probabilities,
        labels,
        scenarios,
    )


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(
    probabilities,
    labels,
    threshold,
):

    probabilities = np.asarray(
        probabilities,
        dtype=np.float64,
    )

    labels = np.asarray(
        labels,
        dtype=np.int32,
    )

    predictions = (
        probabilities >= threshold
    ).astype(np.int32)

    accuracy = accuracy_score(
        labels,
        predictions,
    )

    precision = precision_score(
        labels,
        predictions,
        zero_division=0,
    )

    recall = recall_score(
        labels,
        predictions,
        zero_division=0,
    )

    f1 = f1_score(
        labels,
        predictions,
        zero_division=0,
    )

    tn, fp, fn, tp = (
        confusion_matrix(
            labels,
            predictions,
            labels=[0, 1],
        ).ravel()
    )

    negative_count = (
        tn + fp
    )

    if negative_count > 0:

        fpr = fp / negative_count

    else:

        fpr = float("nan")

    if len(np.unique(labels)) == 2:

        roc_auc = roc_auc_score(
            labels,
            probabilities,
        )

        pr_auc = average_precision_score(
            labels,
            probabilities,
        )

    else:

        roc_auc = float("nan")
        pr_auc = float("nan")

    return {

        "samples": int(len(labels)),

        "positive_samples": int(
            np.sum(labels == 1)
        ),

        "negative_samples": int(
            np.sum(labels == 0)
        ),

        "positive_prevalence": float(
            np.mean(labels == 1)
        ),

        "threshold": float(
            threshold
        ),

        "accuracy": float(
            accuracy
        ),

        "precision": float(
            precision
        ),

        "recall": float(
            recall
        ),

        "f1": float(
            f1
        ),

        "fpr": float(
            fpr
        ),

        "roc_auc": float(
            roc_auc
        ),

        "pr_auc": float(
            pr_auc
        ),

        "tn": int(tn),

        "fp": int(fp),

        "fn": int(fn),

        "tp": int(tp),
    }


# ============================================================
# VALIDATION THRESHOLD SELECTION
# ============================================================

def select_threshold(
    probabilities,
    labels,
):

    candidate_metrics = []

    for threshold in THRESHOLD_GRID:

        metrics = calculate_metrics(
            probabilities,
            labels,
            threshold,
        )

        if (
            not np.isnan(metrics["fpr"])
            and metrics["fpr"]
            <= MAX_VALIDATION_FPR
        ):

            candidate_metrics.append(
                metrics
            )

    # --------------------------------------------------------
    # Preferred operating point:
    #
    # Highest F1 among thresholds whose
    # validation FPR is <= 10%.
    # --------------------------------------------------------

    if candidate_metrics:

        candidate_metrics.sort(
            key=lambda metrics: (
                metrics["f1"],
                metrics["recall"],
                -metrics["fpr"],
                metrics["threshold"],
            ),
            reverse=True,
        )

        best_metrics = (
            candidate_metrics[0]
        )

        return (
            float(
                best_metrics["threshold"]
            ),
            best_metrics,
            "max_f1_subject_to_validation_fpr_constraint",
        )

    # --------------------------------------------------------
    # Defensive fallback:
    #
    # If no threshold can achieve the
    # required FPR, choose the threshold
    # with the minimum validation FPR.
    #
    # This does NOT use test data.
    # --------------------------------------------------------

    all_metrics = []

    for threshold in THRESHOLD_GRID:

        metrics = calculate_metrics(
            probabilities,
            labels,
            threshold,
        )

        if not np.isnan(metrics["fpr"]):

            all_metrics.append(
                metrics
            )

    if not all_metrics:

        raise RuntimeError(
            "Unable to select a threshold: "
            "validation labels do not contain "
            "enough information to calculate FPR."
        )

    all_metrics.sort(
        key=lambda metrics: (
            metrics["fpr"],
            -metrics["f1"],
            -metrics["recall"],
            metrics["threshold"],
        )
    )

    best_metrics = all_metrics[0]

    return (
        float(
            best_metrics["threshold"]
        ),
        best_metrics,
        "minimum_validation_fpr_fallback",
    )


# ============================================================
# SUMMARY
# ============================================================

def print_metrics(
    name,
    metrics,
):

    print()
    print(name)

    print(
        f"Samples   : {metrics['samples']}"
    )

    print(
        f"Attack    : "
        f"{metrics['positive_samples']}"
    )

    print(
        f"Benign    : "
        f"{metrics['negative_samples']}"
    )

    print(
        f"Prevalence: "
        f"{metrics['positive_prevalence']:.4f}"
    )

    print(
        f"Threshold : "
        f"{metrics['threshold']:.3f}"
    )

    print(
        f"Accuracy  : "
        f"{metrics['accuracy']:.4f}"
    )

    print(
        f"Precision : "
        f"{metrics['precision']:.4f}"
    )

    print(
        f"Recall    : "
        f"{metrics['recall']:.4f}"
    )

    print(
        f"F1        : "
        f"{metrics['f1']:.4f}"
    )

    print(
        f"FPR       : "
        f"{metrics['fpr']:.4f}"
    )

    print(
        f"ROC-AUC   : "
        f"{metrics['roc_auc']:.4f}"
    )

    print(
        f"PR-AUC    : "
        f"{metrics['pr_auc']:.4f}"
    )

    print(
        "Confusion : "
        f"TN={metrics['tn']} "
        f"FP={metrics['fp']} "
        f"FN={metrics['fn']} "
        f"TP={metrics['tp']}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("CTU13 RISK WORLD MODEL EVALUATION")
    print("=" * 70)

    print(
        f"Maximum validation FPR: "
        f"{MAX_VALIDATION_FPR:.2f}"
    )

    print(
        "Threshold selection: "
        "maximize F1 subject to validation FPR constraint"
    )

    print(
        "Threshold grid: "
        f"{THRESHOLD_GRID[0]:.3f} "
        f"to "
        f"{THRESHOLD_GRID[-1]:.3f}"
    )

    df, mean, std = load_data()

    model = load_model()

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

    print()

    print(
        f"Validation samples: "
        f"{len(validation_dataset)}"
    )

    print(
        f"Test samples:       "
        f"{len(test_dataset)}"
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    (
        validation_probabilities,
        validation_labels,
        _,
    ) = collect_predictions(
        model,
        validation_dataset,
    )

    thresholds = {}

    threshold_selection_methods = {}

    validation_results = {}

    print()
    print("=" * 70)
    print("VALIDATION THRESHOLD SELECTION")
    print("=" * 70)

    for horizon in range(
        1,
        FORECAST_HORIZON + 1,
    ):

        (
            threshold,
            metrics,
            selection_method,
        ) = select_threshold(
            validation_probabilities[
                horizon
            ],
            validation_labels[
                horizon
            ],
        )

        thresholds[horizon] = (
            threshold
        )

        threshold_selection_methods[
            horizon
        ] = selection_method

        validation_results[horizon] = (
            metrics
        )

        print()
        print(
            f"T+{horizon} selection method: "
            f"{selection_method}"
        )

        print(
            f"Validation FPR constraint: "
            f"<= {MAX_VALIDATION_FPR:.4f}"
        )

        print_metrics(
            f"T+{horizon} VALIDATION",
            metrics,
        )

    # --------------------------------------------------------
    # TEST
    # --------------------------------------------------------

    (
        test_probabilities,
        test_labels,
        test_scenarios,
    ) = collect_predictions(
        model,
        test_dataset,
    )

    test_results = {}

    print()
    print("=" * 70)
    print("HELD-OUT SCENARIO 13 TEST")
    print("=" * 70)

    print(
        "IMPORTANT: Scenario 13 was NOT used "
        "for threshold selection."
    )

    for horizon in range(
        1,
        FORECAST_HORIZON + 1,
    ):

        threshold = thresholds[
            horizon
        ]

        metrics = calculate_metrics(
            test_probabilities[
                horizon
            ],
            test_labels[
                horizon
            ],
            threshold,
        )

        test_results[horizon] = (
            metrics
        )

        print_metrics(
            f"T+{horizon} TEST",
            metrics,
        )

        if metrics[
            "negative_samples"
        ] < 20:

            print(
                "WARNING: FPR is statistically "
                "unstable because the held-out "
                "test scenario contains fewer "
                "than 20 benign samples."
            )

    # --------------------------------------------------------
    # PROBABILITY DISTRIBUTION
    # --------------------------------------------------------

    probability_summary = {}

    for horizon in range(
        1,
        FORECAST_HORIZON + 1,
    ):

        probabilities = np.asarray(
            test_probabilities[horizon]
        )

        labels = np.asarray(
            test_labels[horizon]
        )

        probability_summary[
            horizon
        ] = {

            "min": float(
                np.min(probabilities)
            ),

            "max": float(
                np.max(probabilities)
            ),

            "mean": float(
                np.mean(probabilities)
            ),

            "attack_mean": float(
                np.mean(
                    probabilities[
                        labels == 1
                    ]
                )
            )
            if np.any(labels == 1)
            else None,

            "benign_mean": float(
                np.mean(
                    probabilities[
                        labels == 0
                    ]
                )
            )
            if np.any(labels == 0)
            else None,
        }

    # --------------------------------------------------------
    # SAVE TEST CSV
    # --------------------------------------------------------

    rows = []

    for index in range(
        len(test_scenarios)
    ):

        scenario = int(
            test_scenarios[index]
        )

        for horizon in range(
            1,
            FORECAST_HORIZON + 1,
        ):

            rows.append(
                {

                    "scenario": scenario,

                    "horizon": horizon,

                    "probability": float(
                        test_probabilities[
                            horizon
                        ][index]
                    ),

                    "actual_attack": int(
                        test_labels[
                            horizon
                        ][index]
                    ),

                    "threshold": float(
                        thresholds[
                            horizon
                        ]
                    ),

                    "predicted_attack": int(
                        test_probabilities[
                            horizon
                        ][index]
                        >= thresholds[
                            horizon
                        ]
                    ),
                }
            )

    results_df = pd.DataFrame(
        rows
    )

    csv_path = (
        CHECKPOINT_DIR
        / "risk_world_model_test_results.csv"
    )

    results_df.to_csv(
        csv_path,
        index=False,
    )

    # --------------------------------------------------------
    # SAVE JSON
    # --------------------------------------------------------

    evaluation = {

        "model": (
            "CTU13 Temporal Infiltration "
            "Risk World Model"
        ),

        "dataset": "CTU13",

        "features": FEATURE_NAMES,

        "sequence_length": (
            SEQUENCE_LENGTH
        ),

        "forecast_horizon": (
            FORECAST_HORIZON
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

        "threshold_selection": {
            "dataset": "validation_only",

            "criterion": (
                "maximize F1 subject to "
                "validation FPR constraint"
            ),

            "maximum_validation_fpr": (
                MAX_VALIDATION_FPR
            ),

            "threshold_grid_start": (
                float(THRESHOLD_GRID[0])
            ),

            "threshold_grid_end": (
                float(THRESHOLD_GRID[-1])
            ),

            "threshold_grid_step": 0.001,

            "scenario_13_used_for_selection": False,
        },

        "validation_results": {

            f"T+{horizon}": (
                validation_results[
                    horizon
                ]
            )

            for horizon in range(
                1,
                FORECAST_HORIZON + 1,
            )
        },

        "threshold_selection_methods": {

            f"T+{horizon}": (
                threshold_selection_methods[
                    horizon
                ]
            )

            for horizon in range(
                1,
                FORECAST_HORIZON + 1,
            )
        },

        "frozen_thresholds": {

            f"T+{horizon}": float(
                thresholds[horizon]
            )

            for horizon in range(
                1,
                FORECAST_HORIZON + 1,
            )
        },

        "test_results": {

            f"T+{horizon}": (
                test_results[
                    horizon
                ]
            )

            for horizon in range(
                1,
                FORECAST_HORIZON + 1,
            )
        },

        "test_probability_summary": {

            f"T+{horizon}":
                probability_summary[
                    horizon
                ]

            for horizon in range(
                1,
                FORECAST_HORIZON + 1,
            )
        },

        "scientific_limitations": [

            (
                "Thresholds are selected "
                "using validation data only."
            ),

            (
                "Scenario 13 remains completely "
                "held out from threshold selection."
            ),

            (
                "The operating criterion constrains "
                "validation FPR to at most 10%."
            ),

            (
                "F1 is optimized only among thresholds "
                "satisfying the validation FPR constraint."
            ),

            (
                "ROC-AUC and PR-AUC are "
                "threshold-independent ranking "
                "metrics."
            ),

            (
                "Scenario 13 has high attack prevalence "
                "and relatively few benign samples, "
                "so its FPR estimate may be unstable."
            ),

            (
                "This evaluation changes threshold "
                "selection only; it does not retrain "
                "or modify the world-model weights."
            ),
        ],
    }

    json_path = (
        CHECKPOINT_DIR
        / "risk_world_model_evaluation.json"
    )

    with open(
        json_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            evaluation,
            file,
            indent=2,
        )

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("EVALUATION FILES SAVED")
    print("=" * 70)

    print(csv_path)
    print(json_path)

    print()
    print("=" * 70)
    print("FROZEN VALIDATION THRESHOLDS")
    print("=" * 70)

    for horizon in range(
        1,
        FORECAST_HORIZON + 1,
    ):

        print(
            f"T+{horizon}: "
            f"{thresholds[horizon]:.3f}"
        )

    print()
    print(
        "Scenario 13 was evaluated only "
        "after thresholds were frozen."
    )


if __name__ == "__main__":
    main()