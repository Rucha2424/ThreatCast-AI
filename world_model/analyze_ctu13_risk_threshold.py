import numpy as np
import pandas as pd
import torch

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
    DEVICE,
    DATA_FILE,
    CHECKPOINT_DIR,
    SEQUENCE_LENGTH,
    FORECAST_HORIZON,
)


# ============================================================
# CONFIG
# ============================================================

SCENARIOS = [
    1, 2, 3, 4, 5, 6, 8,
    9, 10, 11, 12, 13
]

THRESHOLDS = np.arange(
    0.01,
    1.00,
    0.01
)


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    model = CTU13RiskWorldModel().to(
        DEVICE
    )

    model.load_state_dict(
        torch.load(
            CHECKPOINT_DIR
            / "ctu13_risk_world_model.pt",
            map_location=DEVICE,
            weights_only=True,
        )
    )

    model.eval()

    return model


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    df = pd.read_csv(
        DATA_FILE
    )

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"]
    )

    df = (
        df
        .sort_values(
            ["Scenario", "Timestamp"]
        )
        .reset_index(drop=True)
    )

    mean = np.load(
        CHECKPOINT_DIR
        / "feature_mean.npy"
    )

    std = np.load(
        CHECKPOINT_DIR
        / "feature_std.npy"
    )

    return df, mean, std


# ============================================================
# COLLECT RISK SCORES
# ============================================================

def collect_predictions(
    model,
    dataset,
):

    probabilities = {
        step: []
        for step in range(
            1,
            FORECAST_HORIZON + 1
        )
    }

    labels = {
        step: []
        for step in range(
            1,
            FORECAST_HORIZON + 1
        )
    }

    loader = torch.utils.data.DataLoader(
        dataset,
        batch_size=64,
        shuffle=False,
        num_workers=0,
    )

    with torch.no_grad():

        for (
            history,
            _future_features,
            future_labels,
        ) in loader:

            history = history.to(
                DEVICE
            )

            _, risk_logits = (
                model.rollout(
                    history,
                    steps=FORECAST_HORIZON,
                )
            )

            risk_probabilities = (
                torch.sigmoid(
                    risk_logits
                )
                .cpu()
                .numpy()
            )

            future_labels = (
                future_labels
                .cpu()
                .numpy()
            )

            for step in range(
                FORECAST_HORIZON
            ):

                probabilities[
                    step + 1
                ].extend(
                    risk_probabilities[
                        :, step
                    ].tolist()
                )

                labels[
                    step + 1
                ].extend(
                    future_labels[
                        :, step
                    ].tolist()
                )

    return probabilities, labels


# ============================================================
# METRICS
# ============================================================

def metrics_at_threshold(
    probabilities,
    labels,
    threshold,
):

    predictions = (
        probabilities >= threshold
    ).astype(int)

    tn, fp, fn, tp = (
        confusion_matrix(
            labels,
            predictions,
            labels=[0, 1],
        ).ravel()
    )

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

    fpr = (
        fp / (fp + tn)
        if (fp + tn) > 0
        else 0.0
    )

    return {
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
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }


# ============================================================
# FIND BEST LOW-FPR THRESHOLD
# ============================================================

def find_best_threshold(
    probabilities,
    labels,
    maximum_fpr=0.10,
):

    candidates = []

    for threshold in THRESHOLDS:

        result = metrics_at_threshold(
            probabilities,
            labels,
            threshold,
        )

        if result["fpr"] <= maximum_fpr:

            candidates.append(
                result
            )

    if not candidates:
        return None

    candidates.sort(
        key=lambda x: (
            x["f1"],
            x["recall"],
        ),
        reverse=True,
    )

    return candidates[0]


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 80)
    print(
        "THREATCAST - CTU13 RISK THRESHOLD ANALYSIS"
    )
    print("=" * 80)

    print()
    print(
        "Purpose: inspect risk-score quality and "
        "low-FPR operating thresholds."
    )

    df, mean, std = load_data()

    model = load_model()

    print()
    print(
        f"Scenarios analysed: {SCENARIOS}"
    )

    print()

    all_probabilities = {
        step: []
        for step in range(
            1,
            FORECAST_HORIZON + 1
        )
    }

    all_labels = {
        step: []
        for step in range(
            1,
            FORECAST_HORIZON + 1
        )
    }

    scenario_results = []

    # --------------------------------------------------------
    # PER-SCENARIO COLLECTION
    # --------------------------------------------------------

    for scenario in SCENARIOS:

        scenario_dataset = (
            CTU13RiskDataset(
                df,
                [scenario],
                mean,
                std,
            )
        )

        if len(scenario_dataset) == 0:

            print(
                f"Scenario {scenario}: "
                f"not enough states for temporal evaluation."
            )

            continue

        probabilities, labels = (
            collect_predictions(
                model,
                scenario_dataset,
            )
        )

        print(
            f"Scenario {scenario}: "
            f"{len(scenario_dataset)} temporal samples"
        )

        for step in range(
            1,
            FORECAST_HORIZON + 1
        ):

            p = np.asarray(
                probabilities[step]
            )

            y = np.asarray(
                labels[step]
            )

            all_probabilities[
                step
            ].extend(
                p.tolist()
            )

            all_labels[
                step
            ].extend(
                y.tolist()
            )

            if len(
                np.unique(y)
            ) > 1:

                auc = roc_auc_score(
                    y,
                    p,
                )

                pr_auc = (
                    average_precision_score(
                        y,
                        p,
                    )
                )

                scenario_results.append(
                    {
                        "scenario": scenario,
                        "horizon": (
                            f"T+{step}"
                        ),
                        "samples": len(y),
                        "positive": int(
                            y.sum()
                        ),
                        "negative": int(
                            len(y) - y.sum()
                        ),
                        "roc_auc": auc,
                        "pr_auc": pr_auc,
                    }
                )

    # --------------------------------------------------------
    # OVERALL SCORE QUALITY
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("OVERALL SCORE QUALITY")
    print("=" * 80)

    for step in range(
        1,
        FORECAST_HORIZON + 1
    ):

        probabilities = np.asarray(
            all_probabilities[step]
        )

        labels = np.asarray(
            all_labels[step]
        )

        print()
        print(
            f"T+{step}"
        )

        print(
            f"Samples:   {len(labels)}"
        )

        print(
            f"Positive:  {int(labels.sum())}"
        )

        print(
            f"Negative:  "
            f"{int(len(labels) - labels.sum())}"
        )

        if len(
            np.unique(labels)
        ) > 1:

            print(
                f"ROC-AUC:   "
                f"{roc_auc_score(labels, probabilities):.4f}"
            )

            print(
                f"PR-AUC:    "
                f"{average_precision_score(labels, probabilities):.4f}"
            )

    # --------------------------------------------------------
    # LOW-FPR OPERATING POINTS
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("LOW-FPR OPERATING POINTS")
    print("=" * 80)

    threshold_results = []

    for step in range(
        1,
        FORECAST_HORIZON + 1
    ):

        probabilities = np.asarray(
            all_probabilities[step]
        )

        labels = np.asarray(
            all_labels[step]
        )

        print()
        print(
            f"T+{step}"
        )

        for maximum_fpr in [
            0.05,
            0.10,
            0.20,
        ]:

            result = find_best_threshold(
                probabilities,
                labels,
                maximum_fpr=maximum_fpr,
            )

            if result is None:

                print(
                    f"FPR <= {maximum_fpr:.0%}: "
                    f"No threshold found"
                )

                continue

            print(
                f"FPR <= {maximum_fpr:.0%}: "
                f"threshold={result['threshold']:.2f} "
                f"F1={result['f1']:.4f} "
                f"Precision={result['precision']:.4f} "
                f"Recall={result['recall']:.4f} "
                f"FPR={result['fpr']:.4f}"
            )

            threshold_results.append(
                {
                    "horizon": f"T+{step}",
                    "max_allowed_fpr": (
                        maximum_fpr
                    ),
                    **result,
                }
            )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    output_path = (
        CHECKPOINT_DIR
        / "risk_threshold_analysis.csv"
    )

    pd.DataFrame(
        threshold_results
    ).to_csv(
        output_path,
        index=False,
    )

    scenario_path = (
        CHECKPOINT_DIR
        / "risk_scenario_analysis.csv"
    )

    pd.DataFrame(
        scenario_results
    ).to_csv(
        scenario_path,
        index=False,
    )

    print()
    print("=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)

    print(
        f"Saved: {output_path}"
    )

    print(
        f"Saved: {scenario_path}"
    )


if __name__ == "__main__":
    main()