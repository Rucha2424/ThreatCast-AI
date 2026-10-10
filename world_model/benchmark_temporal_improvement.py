from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler

from world_model.train_ctu13_risk_model import (
    CTU13RiskWorldModel,
    CTU13RiskDataset,
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
    FORECAST_HORIZON,
    TRAIN_SCENARIOS,
    VALIDATION_SCENARIOS,
    TEST_SCENARIOS,
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


# ============================================================
# CONFIGURATION
# ============================================================

INPUT_DIM = len(
    FEATURE_NAMES
)

OUTPUT_DIR = (
    CHECKPOINT_DIR
    / "benchmark"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

BATCH_SIZE = 64

THRESHOLDS = np.linspace(
    0.01,
    0.99,
    99,
)


# ============================================================
# DATA
# ============================================================

def load_data():

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n"
            f"{DATA_PATH}"
        )

    dataframe = pd.read_csv(
        DATA_PATH
    )

    required = [
        "Scenario",
        "Timestamp",
        "Attack_State",
        *FEATURE_NAMES,
    ]

    missing = [
        column
        for column in required
        if column not in dataframe.columns
    ]

    if missing:
        raise ValueError(
            "Missing columns:\n"
            + "\n".join(missing)
        )

    dataframe[
        "Scenario"
    ] = dataframe[
        "Scenario"
    ].astype(int)

    dataframe[
        "Attack_State"
    ] = dataframe[
        "Attack_State"
    ].astype(int)

    dataframe[
        "Timestamp"
    ] = pd.to_datetime(
        dataframe[
            "Timestamp"
        ],
        errors="coerce",
    )

    dataframe = (
        dataframe
        .sort_values(
            [
                "Scenario",
                "Timestamp",
            ]
        )
        .reset_index(
            drop=True
        )
    )

    return dataframe


# ============================================================
# EXACT DATASET WINDOWS
# ============================================================

def build_exact_samples(
    dataframe,
    scenarios,
    mean,
    std,
):
    """
    Mirrors CTU13RiskDataset exactly.

    This guarantees:

        5-state history
        3 future labels
        scenario boundaries
        train-only normalization
    """

    dataset = CTU13RiskDataset(
        dataframe,
        scenarios,
        mean,
        std,
    )

    histories = np.stack(
        [
            sample[
                "history"
            ]
            for sample in dataset.samples
        ]
    ).astype(
        np.float32
    )

    labels = np.stack(
        [
            sample[
                "future_attack"
            ]
            for sample in dataset.samples
        ]
    ).astype(
        np.int64
    )

    sample_scenarios = np.asarray(
        [
            sample[
                "scenario"
            ]
            for sample in dataset.samples
        ],
        dtype=np.int64,
    )

    return (
        histories,
        labels,
        sample_scenarios,
    )


# ============================================================
# METRICS
# ============================================================

def safe_roc_auc(
    y_true,
    probability,
):
    if len(
        np.unique(y_true)
    ) < 2:
        return None

    return float(
        roc_auc_score(
            y_true,
            probability,
        )
    )


def safe_pr_auc(
    y_true,
    probability,
):
    if np.sum(y_true) == 0:
        return None

    return float(
        average_precision_score(
            y_true,
            probability,
        )
    )


def metrics(
    y_true,
    probability,
    threshold,
):
    prediction = (
        np.asarray(
            probability
        )
        >= threshold
    ).astype(int)

    tn, fp, fn, tp = (
        confusion_matrix(
            y_true,
            prediction,
            labels=[
                0,
                1,
            ],
        )
        .ravel()
    )

    return {
        "precision": float(
            precision_score(
                y_true,
                prediction,
                zero_division=0,
            )
        ),
        "recall": float(
            recall_score(
                y_true,
                prediction,
                zero_division=0,
            )
        ),
        "f1": float(
            f1_score(
                y_true,
                prediction,
                zero_division=0,
            )
        ),
        "fpr": float(
            fp / (fp + tn)
            if fp + tn > 0
            else 0.0
        ),
        "roc_auc": safe_roc_auc(
            y_true,
            probability,
        ),
        "pr_auc": safe_pr_auc(
            y_true,
            probability,
        ),
        "threshold": float(
            threshold
        ),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        "samples": int(
            len(y_true)
        ),
        "positives": int(
            np.sum(y_true)
        ),
        "negatives": int(
            np.sum(
                y_true == 0
            )
        ),
    }


# ============================================================
# VALIDATION-ONLY THRESHOLD
# ============================================================

def select_threshold(
    y_true,
    probability,
    max_fpr=0.10,
):
    candidates = []

    for threshold in THRESHOLDS:

        result = metrics(
            y_true,
            probability,
            threshold,
        )

        candidates.append(
            result
        )

    constrained = [
        item
        for item in candidates
        if item["fpr"]
        <= max_fpr
    ]

    if constrained:

        return max(
            constrained,
            key=lambda item: (
                item["f1"],
                item["recall"],
                -item["fpr"],
            ),
        )

    return max(
        candidates,
        key=lambda item: (
            item["f1"],
            item["recall"],
            -item["fpr"],
        ),
    )


# ============================================================
# LOGISTIC REGRESSION
# ============================================================

def run_logistic(
    train_history,
    train_labels,
    validation_history,
    validation_labels,
    test_history,
    test_labels,
    model_name,
    temporal,
):
    """
    Static baseline:
        latest state = 12 features

    Temporal baseline:
        5 states × 12 features = 60 features

    Same train/validation/test samples.
    """

    if temporal:

        X_train = (
            train_history
            .reshape(
                len(
                    train_history
                ),
                -1,
            )
        )

        X_validation = (
            validation_history
            .reshape(
                len(
                    validation_history
                ),
                -1,
            )
        )

        X_test = (
            test_history
            .reshape(
                len(
                    test_history
                ),
                -1,
            )
        )

    else:

        X_train = (
            train_history[:, -1, :]
        )

        X_validation = (
            validation_history[:, -1, :]
        )

        X_test = (
            test_history[:, -1, :]
        )

    scaler = StandardScaler()

    X_train = (
        scaler.fit_transform(
            X_train
        )
    )

    X_validation = (
        scaler.transform(
            X_validation
        )
    )

    X_test = (
        scaler.transform(
            X_test
        )
    )

    results = []

    for horizon_index in range(
        FORECAST_HORIZON
    ):

        horizon = (
            horizon_index + 1
        )

        y_train = (
            train_labels[
                :,
                horizon_index,
            ]
        )

        y_validation = (
            validation_labels[
                :,
                horizon_index,
            ]
        )

        y_test = (
            test_labels[
                :,
                horizon_index,
            ]
        )

        classifier = (
            LogisticRegression(
                max_iter=2000,
                random_state=SEED,
                class_weight="balanced",
            )
        )

        classifier.fit(
            X_train,
            y_train,
        )

        validation_probability = (
            classifier.predict_proba(
                X_validation
            )[:, 1]
        )

        test_probability = (
            classifier.predict_proba(
                X_test
            )[:, 1]
        )

        selected = (
            select_threshold(
                y_validation,
                validation_probability,
            )
        )

        validation_result = (
            metrics(
                y_validation,
                validation_probability,
                selected[
                    "threshold"
                ],
            )
        )

        test_result = (
            metrics(
                y_test,
                test_probability,
                selected[
                    "threshold"
                ],
            )
        )

        results.append(
            {
                "model": model_name,
                "horizon": (
                    f"T+{horizon}"
                ),
                "validation": (
                    validation_result
                ),
                "test": (
                    test_result
                ),
            }
        )

    return results


# ============================================================
# PERSISTENCE
# ============================================================

def run_persistence(
    dataframe,
):
    """
    Persistence uses the CURRENT Attack_State as the prediction
    for each future horizon.

    This is a non-learned reference baseline.
    """

    results = []

    for scenario in TEST_SCENARIOS:

        scenario_df = (
            dataframe[
                dataframe[
                    "Scenario"
                ]
                == scenario
            ]
            .sort_values(
                "Timestamp"
            )
            .reset_index(
                drop=True
            )
        )

        maximum_start = (
            len(scenario_df)
            - SEQUENCE_LENGTH
            - FORECAST_HORIZON
            + 1
        )

        for start in range(
            maximum_start
        ):

            history_end = (
                start
                + SEQUENCE_LENGTH
            )

            future_end = (
                history_end
                + FORECAST_HORIZON
            )

            current_state = int(
                scenario_df[
                    "Attack_State"
                ].iloc[
                    history_end - 1
                ]
            )

            future_states = (
                scenario_df[
                    "Attack_State"
                ]
                .iloc[
                    history_end:
                    future_end
                ]
                .astype(int)
                .to_numpy()
            )

            for horizon_index in range(
                FORECAST_HORIZON
            ):

                horizon = (
                    horizon_index + 1
                )

                results.append(
                    {
                        "scenario": int(
                            scenario
                        ),
                        "horizon": (
                            f"T+{horizon}"
                        ),
                        "actual": int(
                            future_states[
                                horizon_index
                            ]
                        ),
                        "probability": float(
                            current_state
                        ),
                    }
                )

    rows = []

    for horizon_index in range(
        FORECAST_HORIZON
    ):

        horizon = (
            f"T+{horizon_index + 1}"
        )

        selected = [
            row
            for row in results
            if row["horizon"]
            == horizon
        ]

        y_true = np.asarray(
            [
                row["actual"]
                for row in selected
            ],
            dtype=int,
        )

        probability = np.asarray(
            [
                row["probability"]
                for row in selected
            ],
            dtype=float,
        )

        result = metrics(
            y_true,
            probability,
            0.5,
        )

        rows.append(
            {
                "model": (
                    "persistence"
                ),
                "horizon": horizon,
                "test": result,
            }
        )

    return rows


# ============================================================
# WORLD MODEL
# ============================================================

def load_world_model():

    checkpoint = (
        CHECKPOINT_DIR
        / "ctu13_risk_world_model.pt"
    )

    if not checkpoint.exists():
        raise FileNotFoundError(
            f"World-model checkpoint "
            f"not found:\n{checkpoint}"
        )

    model = (
        CTU13RiskWorldModel()
        .cpu()
    )

    state = torch.load(
        checkpoint,
        map_location="cpu",
        weights_only=True,
    )

    model.load_state_dict(
        state
    )

    model.eval()

    return model


def world_model_predict(
    model,
    history,
):
    """
    Raw world-model sigmoid outputs.

    No test information is used here.
    """

    tensor = torch.from_numpy(
        history.astype(
            np.float32
        )
    )

    probabilities = []

    with torch.no_grad():

        for start in range(
            0,
            len(tensor),
            BATCH_SIZE,
        ):

            batch = tensor[
                start:
                start + BATCH_SIZE
            ]

            _latent, logits = (
                model(batch)
            )

            probability = (
                torch.sigmoid(
                    logits
                )
                .cpu()
                .numpy()
            )

            probabilities.append(
                probability
            )

    return np.concatenate(
        probabilities,
        axis=0,
    )


def run_world_model(
    train_history,
    train_labels,
    validation_history,
    validation_labels,
    test_history,
    test_labels,
):
    model = (
        load_world_model()
    )

    validation_probability = (
        world_model_predict(
            model,
            validation_history,
        )
    )

    test_probability = (
        world_model_predict(
            model,
            test_history,
        )
    )

    results = []

    for horizon_index in range(
        FORECAST_HORIZON
    ):

        horizon = (
            horizon_index + 1
        )

        y_validation = (
            validation_labels[
                :,
                horizon_index,
            ]
        )

        validation_scores = (
            validation_probability[
                :,
                horizon_index,
            ]
        )

        y_test = (
            test_labels[
                :,
                horizon_index,
            ]
        )

        test_scores = (
            test_probability[
                :,
                horizon_index,
            ]
        )

        selected = (
            select_threshold(
                y_validation,
                validation_scores,
            )
        )

        validation_result = (
            metrics(
                y_validation,
                validation_scores,
                selected[
                    "threshold"
                ],
            )
        )

        test_result = (
            metrics(
                y_test,
                test_scores,
                selected[
                    "threshold"
                ],
            )
        )

        results.append(
            {
                "model": (
                    "ctu13_temporal_world_model"
                ),
                "horizon": (
                    f"T+{horizon}"
                ),
                "validation": (
                    validation_result
                ),
                "test": (
                    test_result
                ),
            }
        )

    return results


# ============================================================
# FLATTEN
# ============================================================

def flatten(
    groups,
):
    rows = []

    for group in groups:

        for result in group:

            row = {
                "model": result[
                    "model"
                ],
                "horizon": result[
                    "horizon"
                ],
            }

            if (
                "validation"
                in result
            ):

                for key, value in (
                    result[
                        "validation"
                    ].items()
                ):

                    row[
                        f"validation_{key}"
                    ] = value

            for key, value in (
                result[
                    "test"
                ].items()
            ):

                row[
                    f"test_{key}"
                ] = value

            rows.append(
                row
            )

    return pd.DataFrame(
        rows
    )


# ============================================================
# TEMPORAL COMPARISON
# ============================================================

def temporal_comparison(
    dataframe,
):

    static = dataframe[
        dataframe["model"]
        == "static_logistic_regression"
    ].copy()

    temporal = dataframe[
        dataframe["model"]
        == "temporal_logistic_regression"
    ].copy()

    merged = static.merge(
        temporal,
        on="horizon",
        suffixes=(
            "_static",
            "_temporal",
        ),
    )

    rows = []

    for _, row in merged.iterrows():

        def delta(
            metric
        ):
            static_value = row.get(
                f"test_{metric}_static"
            )

            temporal_value = row.get(
                f"test_{metric}_temporal"
            )

            if (
                pd.isna(
                    static_value
                )
                or pd.isna(
                    temporal_value
                )
            ):
                return None

            return float(
                temporal_value
                - static_value
            )

        rows.append(
            {
                "horizon": row[
                    "horizon"
                ],
                "pr_auc_static": row.get(
                    "test_pr_auc_static"
                ),
                "pr_auc_temporal": row.get(
                    "test_pr_auc_temporal"
                ),
                "pr_auc_delta": delta(
                    "pr_auc"
                ),
                "roc_auc_static": row.get(
                    "test_roc_auc_static"
                ),
                "roc_auc_temporal": row.get(
                    "test_roc_auc_temporal"
                ),
                "roc_auc_delta": delta(
                    "roc_auc"
                ),
                "f1_static": row.get(
                    "test_f1_static"
                ),
                "f1_temporal": row.get(
                    "test_f1_temporal"
                ),
                "f1_delta": delta(
                    "f1"
                ),
            }
        )

    return pd.DataFrame(
        rows
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 80)
    print(
        "THREATCAST CTU13 "
        "APPLES-TO-APPLES BENCHMARK"
    )
    print("=" * 80)
    print()

    print(
        f"Dataset: {DATA_PATH}"
    )

    print(
        f"Train scenarios: "
        f"{TRAIN_SCENARIOS}"
    )

    print(
        f"Validation scenarios: "
        f"{VALIDATION_SCENARIOS}"
    )

    print(
        f"Test scenarios: "
        f"{TEST_SCENARIOS}"
    )

    print(
        f"Sequence length: "
        f"{SEQUENCE_LENGTH}"
    )

    print(
        f"Features: "
        f"{INPUT_DIM}"
    )

    print(
        f"Forecast horizon: "
        f"{FORECAST_HORIZON}"
    )

    print(
        f"Seed: {SEED}"
    )

    print()

    dataframe = (
        load_data()
    )

    print(
        f"Dataset rows: "
        f"{len(dataframe)}"
    )

    # --------------------------------------------------------
    # TRAIN-ONLY SCALER
    # --------------------------------------------------------

    mean, std = (
        fit_scaler(
            dataframe
        )
    )

    print(
        "Train-only scaler: OK"
    )

    # --------------------------------------------------------
    # EXACT WINDOWS
    # --------------------------------------------------------

    (
        train_history,
        train_labels,
        train_scenarios,
    ) = build_exact_samples(
        dataframe,
        TRAIN_SCENARIOS,
        mean,
        std,
    )

    (
        validation_history,
        validation_labels,
        validation_scenarios,
    ) = build_exact_samples(
        dataframe,
        VALIDATION_SCENARIOS,
        mean,
        std,
    )

    (
        test_history,
        test_labels,
        test_scenarios,
    ) = build_exact_samples(
        dataframe,
        TEST_SCENARIOS,
        mean,
        std,
    )

    print(
        f"Train windows: "
        f"{len(train_history)}"
    )

    print(
        f"Validation windows: "
        f"{len(validation_history)}"
    )

    print(
        f"Test windows: "
        f"{len(test_history)}"
    )

    # --------------------------------------------------------
    # LEAKAGE CHECKS
    # --------------------------------------------------------

    if 13 in train_scenarios:
        raise RuntimeError(
            "Scenario 13 leaked into training."
        )

    if 13 in validation_scenarios:
        raise RuntimeError(
            "Scenario 13 leaked into validation."
        )

    if 12 in train_scenarios:
        raise RuntimeError(
            "Scenario 12 leaked into training."
        )

    print(
        "Scenario isolation: PASSED"
    )

    # --------------------------------------------------------
    # PERSISTENCE
    # --------------------------------------------------------

    print()
    print(
        "=" * 80
    )
    print(
        "PERSISTENCE"
    )
    print(
        "=" * 80
    )

    persistence_results = (
        run_persistence(
            dataframe
        )
    )

    for result in persistence_results:

        metric = result[
            "test"
        ]

        print(
            f"{result['horizon']}: "
            f"PR-AUC={metric['pr_auc']} "
            f"ROC-AUC={metric['roc_auc']} "
            f"F1={metric['f1']:.4f}"
        )

    # --------------------------------------------------------
    # STATIC LOGISTIC
    # --------------------------------------------------------

    print()
    print(
        "=" * 80
    )
    print(
        "STATIC LOGISTIC REGRESSION"
    )
    print(
        "=" * 80
    )

    static_results = (
        run_logistic(
            train_history,
            train_labels,
            validation_history,
            validation_labels,
            test_history,
            test_labels,
            "static_logistic_regression",
            temporal=False,
        )
    )

    for result in static_results:

        metric = result[
            "test"
        ]

        print(
            f"{result['horizon']}: "
            f"PR-AUC={metric['pr_auc']} "
            f"ROC-AUC={metric['roc_auc']} "
            f"F1={metric['f1']:.4f} "
            f"FPR={metric['fpr']:.4f}"
        )

    # --------------------------------------------------------
    # TEMPORAL LOGISTIC
    # --------------------------------------------------------

    print()
    print(
        "=" * 80
    )
    print(
        "TEMPORAL LOGISTIC REGRESSION"
    )
    print(
        "=" * 80
    )

    temporal_results = (
        run_logistic(
            train_history,
            train_labels,
            validation_history,
            validation_labels,
            test_history,
            test_labels,
            "temporal_logistic_regression",
            temporal=True,
        )
    )

    for result in temporal_results:

        metric = result[
            "test"
        ]

        print(
            f"{result['horizon']}: "
            f"PR-AUC={metric['pr_auc']} "
            f"ROC-AUC={metric['roc_auc']} "
            f"F1={metric['f1']:.4f} "
            f"FPR={metric['fpr']:.4f}"
        )

    # --------------------------------------------------------
    # WORLD MODEL
    # --------------------------------------------------------

    print()
    print(
        "=" * 80
    )
    print(
        "CTU13 TEMPORAL WORLD MODEL"
    )
    print(
        "=" * 80
    )

    world_model_results = (
        run_world_model(
            train_history,
            train_labels,
            validation_history,
            validation_labels,
            test_history,
            test_labels,
        )
    )

    for result in (
        world_model_results
    ):

        metric = result[
            "test"
        ]

        print(
            f"{result['horizon']}: "
            f"PR-AUC={metric['pr_auc']} "
            f"ROC-AUC={metric['roc_auc']} "
            f"F1={metric['f1']:.4f} "
            f"FPR={metric['fpr']:.4f}"
        )

    # --------------------------------------------------------
    # SAVE ALL RESULTS
    # --------------------------------------------------------

    dataframe_results = (
        flatten(
            [
                persistence_results,
                static_results,
                temporal_results,
                world_model_results,
            ]
        )
    )

    all_results_path = (
        OUTPUT_DIR
        / "apples_to_apples_results.csv"
    )

    dataframe_results.to_csv(
        all_results_path,
        index=False,
    )

    print()
    print(
        f"Saved: "
        f"{all_results_path}"
    )

    # --------------------------------------------------------
    # TEMPORAL IMPROVEMENT
    # --------------------------------------------------------

    improvement = (
        temporal_comparison(
            dataframe_results
        )
    )

    improvement_path = (
        OUTPUT_DIR
        / "temporal_improvement_results.csv"
    )

    improvement.to_csv(
        improvement_path,
        index=False,
    )

    print(
        f"Saved: "
        f"{improvement_path}"
    )

    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    summary = {
        "experiment": (
            "CTU13 apples-to-apples "
            "baseline benchmark"
        ),
        "seed": SEED,
        "dataset": "CTU13",
        "feature_names": FEATURE_NAMES,
        "feature_count": INPUT_DIM,
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
        "train_windows": int(
            len(train_history)
        ),
        "validation_windows": int(
            len(validation_history)
        ),
        "test_windows": int(
            len(test_history)
        ),
        "models": [
            "persistence",
            "static_logistic_regression",
            "temporal_logistic_regression",
            "ctu13_temporal_world_model",
        ],
        "threshold_selection": (
            "validation-only, "
            "maximize F1 subject to "
            "FPR <= 0.10"
        ),
        "scenario_13_used_for_training": False,
        "scenario_13_used_for_model_selection": False,
        "scenario_13_used_for_threshold_selection": False,
        "raw_world_model_probabilities": True,
        "results_csv": str(
            all_results_path
        ),
        "temporal_improvement_csv": str(
            improvement_path
        ),
    }

    summary_path = (
        OUTPUT_DIR
        / "experiment_summary.json"
    )

    with open(
        summary_path,
        "w",
        encoding="utf-8",
    ) as handle:

        json.dump(
            summary,
            handle,
            indent=2,
        )

    print(
        f"Saved: "
        f"{summary_path}"
    )

    # --------------------------------------------------------
    # FINAL TABLE
    # --------------------------------------------------------

    print()
    print(
        "=" * 80
    )
    print(
        "TEMPORAL IMPROVEMENT COMPARISON"
    )
    print(
        "=" * 80
    )

    if improvement.empty:

        print(
            "No comparison rows were generated."
        )

    else:

        print(
            improvement.to_string(
                index=False
            )
        )

    print()
    print(
        "=" * 80
    )
    print(
        "BENCHMARK COMPLETE"
    )
    print(
        "=" * 80
    )


if __name__ == "__main__":
    main()