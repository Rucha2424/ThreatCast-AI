"""
THREATCAST
Cross-Dataset Flow_Count Robustness Experiment

Datasets:
    CTU13
    DAPT2020

Experiment:
    Train a binary Logistic Regression using ONLY Flow_Count
    on one dataset and test it zero-shot on the other.

Why Flow_Count?
    It is the only feature whose definition is directly
    comparable across the two finalized preprocessing pipelines.

Labels:
    CTU13:
        Target_Early_Warning
        0 = normal
        1 = early warning

    DAPT2020:
        Stage
        BENIGN = 0
        Any attack stage = 1

IMPORTANT:
    This is a robustness/generalization experiment.
    It is NOT the deployed ThreatCast model.
"""

import argparse

import numpy as np
import pandas as pd

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)


# ============================================================
# LOAD CTU13
# ============================================================

def load_ctu13_flowcount(csv_path):
    """
    Load CTU13 network states.

    Uses:
        Flow_Count
        Target_Early_Warning
    """

    df = pd.read_csv(csv_path)

    required = [
        "Flow_Count",
        "Target_Early_Warning",
    ]

    missing = [
        col for col in required
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            f"CTU13 is missing columns: {missing}"
        )

    out = pd.DataFrame({
        "Flow_Count": pd.to_numeric(
            df["Flow_Count"],
            errors="coerce"
        ),
        "label": pd.to_numeric(
            df["Target_Early_Warning"],
            errors="coerce"
        ),
    })

    out = out.dropna()

    out["label"] = out["label"].astype(int)

    return out


# ============================================================
# LOAD DAPT2020
# ============================================================

def load_dapt2020_flowcount(csv_path):
    """
    Load DAPT2020 network states.

    Actual DAPT2020 schema:
        Flow_Count
        Stage

    Label conversion:
        BENIGN -> 0
        Any attack stage -> 1
    """

    df = pd.read_csv(csv_path)

    required = [
        "Flow_Count",
        "Stage",
    ]

    missing = [
        col for col in required
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            f"DAPT2020 is missing columns: {missing}"
        )

    # Normalize stage labels
    stage = (
        df["Stage"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    out = pd.DataFrame({
        "Flow_Count": pd.to_numeric(
            df["Flow_Count"],
            errors="coerce"
        ),
        "label": (
            stage != "BENIGN"
        ).astype(int),
    })

    out = out.dropna()

    out["label"] = out["label"].astype(int)

    return out


# ============================================================
# METRIC CALCULATION
# ============================================================

def evaluate_predictions(
    y_true,
    y_pred,
    y_proba
):
    """
    Calculate binary classification metrics.
    """

    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=[0, 1]
    )

    tn, fp, fn, tp = cm.ravel()

    metrics = {
        "accuracy": accuracy_score(
            y_true,
            y_pred
        ),

        "precision": precision_score(
            y_true,
            y_pred,
            zero_division=0
        ),

        "recall": recall_score(
            y_true,
            y_pred,
            zero_division=0
        ),

        "f1": f1_score(
            y_true,
            y_pred,
            zero_division=0
        ),

        "roc_auc": (
            roc_auc_score(
                y_true,
                y_proba
            )
            if len(np.unique(y_true)) > 1
            else np.nan
        ),

        "fpr": (
            fp / (fp + tn)
            if (fp + tn) > 0
            else np.nan
        ),

        "tn": tn,
        "fp": fp,
        "fn": fn,
        "tp": tp,
    }

    return metrics


# ============================================================
# ONE-WAY TRANSFER
# ============================================================

def run_transfer(
    train_name,
    train_df,
    test_name,
    test_df
):
    """
    Train on one dataset and perform
    zero-shot testing on another dataset.
    """

    print("\n" + "=" * 70)

    print(
        f"TRAIN ON {train_name} "
        f"-> TEST ON {test_name}"
    )

    print("=" * 70)

    X_train = train_df[
        ["Flow_Count"]
    ].to_numpy(dtype=float)

    y_train = train_df[
        "label"
    ].to_numpy(dtype=int)

    X_test = test_df[
        ["Flow_Count"]
    ].to_numpy(dtype=float)

    y_test = test_df[
        "label"
    ].to_numpy(dtype=int)

    print(
        f"\nTraining samples: {len(y_train)}"
    )

    print(
        f"Test samples:     {len(y_test)}"
    )

    print(
        f"\nTraining positive rate: "
        f"{y_train.mean():.4f}"
    )

    print(
        f"Test positive rate: "
        f"{y_test.mean():.4f}"
    )

    # --------------------------------------------------------
    # TRAIN-ONLY STANDARDIZATION
    # --------------------------------------------------------

    train_mean = X_train.mean()

    train_std = X_train.std()

    if train_std == 0:
        train_std = 1.0

    X_train_scaled = (
        X_train - train_mean
    ) / train_std

    X_test_scaled = (
        X_test - train_mean
    ) / train_std

    print(
        "\nScaling:"
    )

    print(
        f"Training mean: {train_mean:.4f}"
    )

    print(
        f"Training std : {train_std:.4f}"
    )

    # --------------------------------------------------------
    # LOGISTIC REGRESSION
    # --------------------------------------------------------

    model = LogisticRegression(
        class_weight="balanced",
        max_iter=2000,
        random_state=42
    )

    model.fit(
        X_train_scaled,
        y_train
    )

    # --------------------------------------------------------
    # PREDICTIONS
    # --------------------------------------------------------

    y_pred = model.predict(
        X_test_scaled
    )

    y_proba = model.predict_proba(
        X_test_scaled
    )[:, 1]

    # --------------------------------------------------------
    # METRICS
    # --------------------------------------------------------

    metrics = evaluate_predictions(
        y_test,
        y_pred,
        y_proba
    )

    result = {
        "train_on": train_name,
        "test_on": test_name,
        "n_train": len(y_train),
        "n_test": len(y_test),
        "train_positive_rate": float(
            y_train.mean()
        ),
        "test_positive_rate": float(
            y_test.mean()
        ),
        **metrics
    }

    # --------------------------------------------------------
    # DISPLAY
    # --------------------------------------------------------

    print("\nRESULTS")

    print(
        f"Accuracy : {metrics['accuracy']:.4f}"
    )

    print(
        f"Precision: {metrics['precision']:.4f}"
    )

    print(
        f"Recall   : {metrics['recall']:.4f}"
    )

    print(
        f"F1       : {metrics['f1']:.4f}"
    )

    print(
        f"ROC-AUC  : {metrics['roc_auc']:.4f}"
    )

    print(
        f"FPR      : {metrics['fpr']:.4f}"
    )

    print("\nConfusion Matrix:")

    print(
        confusion_matrix(
            y_test,
            y_pred,
            labels=[0, 1]
        )
    )

    print(
        "\nTN =", metrics["tn"],
        " FP =", metrics["fp"],
        " FN =", metrics["fn"],
        " TP =", metrics["tp"]
    )

    return result


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description=(
            "CTU13 <-> DAPT2020 "
            "Flow_Count cross-dataset experiment"
        )
    )

    parser.add_argument(
        "--ctu13-csv",
        required=True,
        help="Path to CTU13 network states CSV"
    )

    parser.add_argument(
        "--dapt2020-csv",
        required=True,
        help="Path to DAPT2020 network states CSV"
    )

    parser.add_argument(
        "--out",
        default="cross_dataset_flowcount_results.csv",
        help="Output CSV filename"
    )

    args = parser.parse_args()

    # ========================================================
    # LOAD
    # ========================================================

    print("=" * 70)
    print("THREATCAST - CROSS-DATASET ROBUSTNESS")
    print("=" * 70)

    print("\nLoading CTU13...")

    ctu13 = load_ctu13_flowcount(
        args.ctu13_csv
    )

    print(
        f"CTU13 rows: {len(ctu13)}"
    )

    print(
        f"CTU13 positive rate: "
        f"{ctu13['label'].mean():.4f}"
    )

    print("\nLoading DAPT2020...")

    dapt2020 = load_dapt2020_flowcount(
        args.dapt2020_csv
    )

    print(
        f"DAPT2020 rows: {len(dapt2020)}"
    )

    print(
        f"DAPT2020 positive rate: "
        f"{dapt2020['label'].mean():.4f}"
    )

    # ========================================================
    # DATASET LABEL DISTRIBUTIONS
    # ========================================================

    print("\n" + "=" * 70)
    print("LABEL DISTRIBUTIONS")
    print("=" * 70)

    print("\nCTU13:")

    print(
        ctu13["label"]
        .value_counts()
        .sort_index()
        .rename(
            index={
                0: "Normal",
                1: "Early Warning"
            }
        )
    )

    print("\nDAPT2020:")

    print(
        dapt2020["label"]
        .value_counts()
        .sort_index()
        .rename(
            index={
                0: "Benign",
                1: "Attack"
            }
        )
    )

    # ========================================================
    # BIDIRECTIONAL TRANSFER
    # ========================================================

    results = []

    # CTU13 -> DAPT2020

    result_1 = run_transfer(
        "CTU13",
        ctu13,
        "DAPT2020",
        dapt2020
    )

    results.append(result_1)

    # DAPT2020 -> CTU13

    result_2 = run_transfer(
        "DAPT2020",
        dapt2020,
        "CTU13",
        ctu13
    )

    results.append(result_2)

    # ========================================================
    # SAVE RESULTS
    # ========================================================

    results_df = pd.DataFrame(
        results
    )

    results_df.to_csv(
        args.out,
        index=False
    )

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print("\n" + "=" * 70)
    print("FINAL CROSS-DATASET SUMMARY")
    print("=" * 70)

    print(
        results_df[
            [
                "train_on",
                "test_on",
                "accuracy",
                "precision",
                "recall",
                "f1",
                "roc_auc",
                "fpr"
            ]
        ].to_string(
            index=False
        )
    )

    print(
        "\nSaved:"
    )

    print(
        args.out
    )

    print("\n" + "=" * 70)
    print("CROSS-DATASET EXPERIMENT COMPLETE")
    print("=" * 70)

    print(
        "\nIMPORTANT:"
    )

    print(
        "This is a zero-shot robustness experiment."
    )

    print(
        "Only Flow_Count was used."
    )

    print(
        "No DAPT2020 statistics were used "
        "to train the CTU13 model, and vice versa."
    )

    print(
        "Do not use this result as the deployed "
        "ThreatCast model's performance."
    )