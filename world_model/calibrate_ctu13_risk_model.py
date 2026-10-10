
"""
CTU13 scenario-adaptive risk calibration.

Scientific design:
- The neural world-model checkpoint is NOT modified.
- Calibration is learned only from validation Scenario 12.
- Scenario 13 labels are never used for fitting or threshold selection.
- Raw logits are normalized per scenario using the unlabeled score
  distribution (mean/std), then a sigmoid/Platt calibrator is fit.
- Thresholds are selected from out-of-fold calibrated validation predictions
  with FPR <= 0.10.
- The final calibrator is refit on all validation data and frozen.
- Scenario 13 is evaluated exactly once with the frozen calibration.

This is intentionally called "scenario-adaptive calibration": the score
normalization uses the current scenario's unlabeled score distribution.
Therefore the resulting probability is conditional on the scenario score
distribution and must not be described as a universally calibrated
probability across arbitrary domains.
"""

from pathlib import Path
import json
import math
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    brier_score_loss,
    log_loss,
)

from world_model.train_ctu13_risk_model import (
    CTU13RiskWorldModel,
    CTU13RiskDataset,
    FORECAST_HORIZON,
    TRAIN_SCENARIOS,
    VALIDATION_SCENARIOS,
    TEST_SCENARIOS,
    DEVICE,
    DATA_PATH,
    CHECKPOINT_DIR,
    fit_scaler,
)

SEED = 42
BATCH_SIZE = 64
MAX_FPR = 0.10
N_FOLDS = 4
EPS = 1e-6

CALIBRATION_PATH = CHECKPOINT_DIR / "risk_calibration.json"
CALIBRATED_RESULTS_PATH = (
    CHECKPOINT_DIR / "risk_world_model_calibrated_test_results.csv"
)
CALIBRATED_EVAL_PATH = (
    CHECKPOINT_DIR / "risk_world_model_calibrated_evaluation.json"
)


def sigmoid(x):
    x = np.clip(np.asarray(x, dtype=np.float64), -60.0, 60.0)
    return 1.0 / (1.0 + np.exp(-x))


def scenario_standardize(logits):
    """
    Unlabeled, per-scenario normalization.

    Returns standardized scores and the parameters required to reproduce
    exactly the same transformation during API inference.
    """
    logits = np.asarray(logits, dtype=np.float64)

    mean = float(np.mean(logits))
    std = float(np.std(logits))

    if not np.isfinite(std) or std < EPS:
        std = 1.0

    z = (logits - mean) / std
    return z, mean, std


def fit_platt_oof(z, y, n_folds=N_FOLDS):
    """
    Produce out-of-fold sigmoid calibration probabilities.

    Folds are chronological blocks. No model retraining occurs here; the
    world-model logits are frozen. The calibration layer sees only validation
    scores/labels.
    """
    z = np.asarray(z, dtype=np.float64)
    y = np.asarray(y, dtype=int)

    n = len(y)
    if n < n_folds * 2:
        raise ValueError("Not enough validation samples for OOF calibration.")

    order = np.arange(n)
    folds = np.array_split(order, n_folds)
    oof = np.full(n, np.nan, dtype=np.float64)

    for fold_indices in folds:
        train_indices = np.setdiff1d(order, fold_indices, assume_unique=True)

        y_train = y[train_indices]
        if len(np.unique(y_train)) < 2:
            raise ValueError(
                "A calibration fold's training portion contains only one class."
            )

        calibrator = LogisticRegression(
            solver="lbfgs",
            C=1.0,
            max_iter=2000,
            random_state=SEED,
        )

        calibrator.fit(
            z[train_indices].reshape(-1, 1),
            y_train,
        )

        oof[fold_indices] = calibrator.predict_proba(
            z[fold_indices].reshape(-1, 1)
        )[:, 1]

    if np.any(~np.isfinite(oof)):
        raise RuntimeError("OOF calibration did not produce all predictions.")

    return oof


def fit_final_platt(z, y):
    calibrator = LogisticRegression(
        solver="lbfgs",
        C=1.0,
        max_iter=2000,
        random_state=SEED,
    )
    calibrator.fit(
        np.asarray(z, dtype=np.float64).reshape(-1, 1),
        np.asarray(y, dtype=int),
    )
    return calibrator


def select_threshold(y, p, max_fpr=MAX_FPR):
    """
    Select maximum-F1 threshold subject to validation FPR <= max_fpr.

    Threshold selection is performed only on OOF validation probabilities.
    """
    y = np.asarray(y, dtype=int)
    p = np.asarray(p, dtype=float)

    candidates = np.unique(
        np.concatenate(
            [
                np.array([0.0, 1.0]),
                p,
            ]
        )
    )

    best = None

    for threshold in candidates:
        pred = (p >= threshold).astype(int)

        tn, fp, fn, tp = confusion_matrix(
            y,
            pred,
            labels=[0, 1],
        ).ravel()

        fpr = fp / max(tn + fp, 1)
        precision = precision_score(
            y, pred, zero_division=0
        )
        recall = recall_score(
            y, pred, zero_division=0
        )
        f1 = f1_score(
            y, pred, zero_division=0
        )

        if fpr > max_fpr:
            continue

        candidate = (
            f1,
            precision,
            recall,
            -threshold,
            threshold,
            fpr,
            tn,
            fp,
            fn,
            tp,
        )

        if best is None or candidate > best:
            best = candidate

    if best is None:
        # Safe fallback: highest threshold.
        threshold = 1.0
    else:
        threshold = float(best[4])

    return threshold


def binary_metrics(y, p, threshold):
    y = np.asarray(y, dtype=int)
    p = np.asarray(p, dtype=float)
    pred = (p >= threshold).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y,
        pred,
        labels=[0, 1],
    ).ravel()

    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy_score(y, pred)),
        "precision": float(
            precision_score(y, pred, zero_division=0)
        ),
        "recall": float(
            recall_score(y, pred, zero_division=0)
        ),
        "f1": float(
            f1_score(y, pred, zero_division=0)
        ),
        "fpr": float(
            fp / max(tn + fp, 1)
        ),
        "roc_auc": float(
            roc_auc_score(y, p)
        ) if len(np.unique(y)) == 2 else None,
        "pr_auc": float(
            average_precision_score(y, p)
        ) if len(np.unique(y)) == 2 else None,
        "brier": float(
            brier_score_loss(y, p)
        ),
        "log_loss": float(
            log_loss(y, np.column_stack([1.0 - p, p]), labels=[0, 1])
        ),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        "positive_samples": int(np.sum(y == 1)),
        "negative_samples": int(np.sum(y == 0)),
    }


def load_model():
    model = CTU13RiskWorldModel().to(DEVICE)
    checkpoint = (
        CHECKPOINT_DIR / "ctu13_risk_world_model.pt"
    )

    state = torch.load(
        checkpoint,
        map_location=DEVICE,
        weights_only=True,
    )
    model.load_state_dict(state)
    model.eval()

    return model


def collect_logits(model, dataset):
    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    logits = {
        h: [] for h in range(1, FORECAST_HORIZON + 1)
    }
    labels = {
        h: [] for h in range(1, FORECAST_HORIZON + 1)
    }

    with torch.no_grad():
        for history, _future_features, future_attack, _scenarios in loader:
            history = history.to(DEVICE)

            _latent, risk_logits = model(history)

            batch_logits = risk_logits.cpu().numpy()
            batch_labels = future_attack.numpy()

            for i in range(FORECAST_HORIZON):
                h = i + 1
                logits[h].extend(batch_logits[:, i].tolist())
                labels[h].extend(batch_labels[:, i].tolist())

    return {
        h: np.asarray(logits[h], dtype=np.float64)
        for h in logits
    }, {
        h: np.asarray(labels[h], dtype=int)
        for h in labels
    }


def main():
    print("=" * 90)
    print("CTU13 FINAL SCENARIO-ADAPTIVE RISK CALIBRATION")
    print("=" * 90)
    print("Model checkpoint is frozen.")
    print("Scenario 13 is NOT used for fitting or threshold selection.")
    print(f"Validation scenario: {VALIDATION_SCENARIOS}")
    print(f"Test scenario:       {TEST_SCENARIOS}")

    df = pd.read_csv(DATA_PATH)
    mean, std = fit_scaler(df)

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

    model = load_model()

    val_logits, val_labels = collect_logits(
        model,
        validation_dataset,
    )
    test_logits, test_labels = collect_logits(
        model,
        test_dataset,
    )

    calibration = {
        "method": "scenario_zscore_platt",
        "version": 1,
        "seed": SEED,
        "validation_scenarios": list(VALIDATION_SCENARIOS),
        "test_scenarios": list(TEST_SCENARIOS),
        "max_validation_fpr": MAX_FPR,
        "folds": N_FOLDS,
        "horizons": {},
        "scientific_note": (
            "Scenario-adaptive calibration. Raw logits are standardized "
            "using the unlabeled score distribution of the current "
            "scenario before sigmoid calibration. This compensates for "
            "cross-scenario score-location/scale shift. Scenario 13 labels "
            "are never used during fitting or threshold selection."
        ),
    }

    calibrated_test_rows = []
    calibrated_evaluation = {
        "method": "scenario_zscore_platt",
        "validation": {},
        "test": {},
    }

    for h in range(1, FORECAST_HORIZON + 1):
        print()
        print("-" * 90)
        print(f"T+{h}")

        # Validation normalization.
        val_z, val_mean, val_std = scenario_standardize(
            val_logits[h]
        )

        # OOF sigmoid calibration.
        val_oof = fit_platt_oof(
            val_z,
            val_labels[h],
            n_folds=N_FOLDS,
        )

        threshold = select_threshold(
            val_labels[h],
            val_oof,
            MAX_FPR,
        )

        # Final calibration layer fit on all validation data.
        final_calibrator = fit_final_platt(
            val_z,
            val_labels[h],
        )

        A = float(final_calibrator.coef_[0, 0])
        B = float(final_calibrator.intercept_[0])

        val_calibrated = sigmoid(
            A * val_z + B
        )

        # Test normalization uses only unlabeled test logits.
        test_z, test_mean, test_std = scenario_standardize(
            test_logits[h]
        )

        test_calibrated = sigmoid(
            A * test_z + B
        )

        val_metrics = binary_metrics(
            val_labels[h],
            val_oof,
            threshold,
        )

        test_metrics = binary_metrics(
            test_labels[h],
            test_calibrated,
            threshold,
        )

        calibrated_evaluation["validation"][
            f"T+{h}"
        ] = val_metrics

        calibrated_evaluation["test"][
            f"T+{h}"
        ] = test_metrics

        calibration["horizons"][
            f"T+{h}"
        ] = {
            "validation_score_mean": val_mean,
            "validation_score_std": val_std,
            "test_score_mean": test_mean,
            "test_score_std": test_std,
            "platt_A": A,
            "platt_B": B,
            "threshold": threshold,
            "validation_oof_metrics": val_metrics,
            "test_metrics": test_metrics,
        }

        print(
            f"Validation OOF PR-AUC : "
            f"{val_metrics['pr_auc']:.6f}"
        )
        print(
            f"Validation OOF ROC-AUC: "
            f"{val_metrics['roc_auc']:.6f}"
        )
        print(
            f"Frozen threshold      : "
            f"{threshold:.6f}"
        )
        print(
            f"Scenario 13 PR-AUC    : "
            f"{test_metrics['pr_auc']:.6f}"
        )
        print(
            f"Scenario 13 ROC-AUC   : "
            f"{test_metrics['roc_auc']:.6f}"
        )
        print(
            f"Scenario 13 F1        : "
            f"{test_metrics['f1']:.6f}"
        )
        print(
            f"Scenario 13 Recall    : "
            f"{test_metrics['recall']:.6f}"
        )
        print(
            f"Scenario 13 FPR       : "
            f"{test_metrics['fpr']:.6f}"
        )
        print(
            f"Scenario 13 positives : "
            f"{int(np.sum(test_calibrated >= threshold))}/"
            f"{len(test_calibrated)}"
        )

        for i, (p, y) in enumerate(
            zip(test_calibrated, test_labels[h])
        ):
            calibrated_test_rows.append(
                {
                    "scenario": int(TEST_SCENARIOS[0]),
                    "horizon": h,
                    "window_index": i,
                    "calibrated_probability": float(p),
                    "actual_attack": int(y),
                    "threshold": float(threshold),
                    "predicted_attack": int(p >= threshold),
                }
            )

    with open(
        CALIBRATION_PATH,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            calibration,
            f,
            indent=2,
        )

    pd.DataFrame(
        calibrated_test_rows
    ).to_csv(
        CALIBRATED_RESULTS_PATH,
        index=False,
    )

    with open(
        CALIBRATED_EVAL_PATH,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            calibrated_evaluation,
            f,
            indent=2,
        )

    print()
    print("=" * 90)
    print("CALIBRATION COMPLETE")
    print("=" * 90)
    print(CALIBRATION_PATH)
    print(CALIBRATED_RESULTS_PATH)
    print(CALIBRATED_EVAL_PATH)
    print()
    print(
        "The neural checkpoint was not modified."
    )
    print(
        "The production LSTM was not modified."
    )
    print(
        "Scenario 13 labels were not used for calibration "
        "or threshold selection."
    )


if __name__ == "__main__":
    main()
