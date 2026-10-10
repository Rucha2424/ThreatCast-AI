from pathlib import Path
import json
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

lr_file = (
    ROOT
    / "benchmark"
    / "logistic_regression_benchmark.json"
)

lstm_file = (
    ROOT
    / "lstm_early_warning_evaluation.json"
)


def main():
    with open(
        lr_file,
        encoding="utf-8",
    ) as f:
        lr = json.load(f)

    with open(
        lstm_file,
        encoding="utf-8",
    ) as f:
        lstm = json.load(f)

    metrics = [
        "accuracy",
        "precision",
        "recall",
        "f1",
        "fpr",
        "roc_auc",
        "pr_auc",
    ]

    rows = []

    for metric in metrics:
        if metric not in lr or metric not in lstm:
            continue

        rows.append(
            {
                "metric": metric,
                "logistic_regression": lr[metric],
                "lstm": lstm[metric],
                "absolute_difference": (
                    lstm[metric] - lr[metric]
                ),
            }
        )

    result = pd.DataFrame(rows)

    output = (
        ROOT
        / "benchmark"
        / "temporal_improvement.csv"
    )

    result.to_csv(
        output,
        index=False,
    )

    print("\n=== TEMPORAL MODEL COMPARISON ===")
    print(result.to_string(index=False))


if __name__ == "__main__":
    main()