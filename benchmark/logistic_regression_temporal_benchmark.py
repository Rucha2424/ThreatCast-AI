from __future__ import annotations

from pathlib import Path

import json
import joblib
import numpy as np
import pandas as pd

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)
from sklearn.preprocessing import StandardScaler


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET = (
    PROJECT_ROOT
    / "data"
    / "CTU13"
    / "all_network_states.csv"
)

OUTPUT_DIR = PROJECT_ROOT / "benchmark"
OUTPUT_DIR.mkdir(exist_ok=True)


FEATURES = [
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


TRAIN_SCENARIOS = [
    1, 2, 3, 6, 7, 8, 9, 10, 11
]

VALIDATION_SCENARIOS = [4, 5]

TEST_SCENARIOS = [12, 13]


def load_data():
    df = pd.read_csv(DATASET)

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"],
        errors="coerce",
    )

    df = df.sort_values(
        ["Scenario", "Timestamp"]
    ).reset_index(drop=True)

    return df


def build_dataset(df):
    X = df[FEATURES].astype(float)
    y = df["Target_Early_Warning"].astype(int)

    return X, y


def evaluate(
    name,
    y_true,
    probabilities,
    threshold=0.08,
):
    predictions = (
        probabilities >= threshold
    ).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y_true,
        predictions,
        labels=[0, 1],
    ).ravel()

    result = {
        "model": name,
        "threshold": threshold,
        "accuracy": accuracy_score(
            y_true,
            predictions,
        ),
        "precision": precision_score(
            y_true,
            predictions,
            zero_division=0,
        ),
        "recall": recall_score(
            y_true,
            predictions,
            zero_division=0,
        ),
        "f1": f1_score(
            y_true,
            predictions,
            zero_division=0,
        ),
        "fpr": (
            fp / (fp + tn)
            if (fp + tn)
            else 0.0
        ),
        "roc_auc": roc_auc_score(
            y_true,
            probabilities,
        ),
        "pr_auc": average_precision_score(
            y_true,
            probabilities,
        ),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        "samples": int(len(y_true)),
    }

    return result


def main():
    df = load_data()

    train = df[
        df["Scenario"].isin(TRAIN_SCENARIOS)
    ].copy()

    validation = df[
        df["Scenario"].isin(VALIDATION_SCENARIOS)
    ].copy()

    test = df[
        df["Scenario"].isin(TEST_SCENARIOS)
    ].copy()

    X_train, y_train = build_dataset(train)
    X_val, y_val = build_dataset(validation)
    X_test, y_test = build_dataset(test)

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(
        X_train
    )

    X_val_scaled = scaler.transform(
        X_val
    )

    X_test_scaled = scaler.transform(
        X_test
    )

    model = LogisticRegression(
        max_iter=3000,
        class_weight="balanced",
        random_state=42,
    )

    model.fit(
        X_train_scaled,
        y_train,
    )

    val_probability = model.predict_proba(
        X_val_scaled
    )[:, 1]

    test_probability = model.predict_proba(
        X_test_scaled
    )[:, 1]

    thresholds = np.linspace(
        0.01,
        0.99,
        99,
    )

    best_threshold = 0.08
    best_f1 = -1

    for threshold in thresholds:
        prediction = (
            val_probability >= threshold
        ).astype(int)

        score = f1_score(
            y_val,
            prediction,
            zero_division=0,
        )

        if score > best_f1:
            best_f1 = score
            best_threshold = float(
                threshold
            )

    result = evaluate(
        "Logistic Regression — Same 12 Features",
        y_test.to_numpy(),
        test_probability,
        best_threshold,
    )

    result["train_scenarios"] = TRAIN_SCENARIOS
    result["validation_scenarios"] = (
        VALIDATION_SCENARIOS
    )
    result["test_scenarios"] = TEST_SCENARIOS
    result["features"] = FEATURES
    result["validation_best_f1"] = best_f1

    with open(
        OUTPUT_DIR
        / "logistic_regression_benchmark.json",
        "w",
        encoding="utf-8",
    ) as handle:
        json.dump(
            result,
            handle,
            indent=2,
        )

    joblib.dump(
        scaler,
        OUTPUT_DIR
        / "logistic_regression_scaler.pkl",
    )

    joblib.dump(
        model,
        OUTPUT_DIR
        / "logistic_regression_model.pkl",
    )

    pd.DataFrame([result]).to_csv(
        OUTPUT_DIR
        / "logistic_regression_benchmark.csv",
        index=False,
    )

    print("\n=== LOGISTIC REGRESSION BENCHMARK ===")
    print(
        json.dumps(
            result,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()