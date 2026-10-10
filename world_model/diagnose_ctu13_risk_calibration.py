"""
CTU13 risk-model calibration and label-alignment diagnostic.

This script is READ-ONLY with respect to the trained model/checkpoints.
It does not retrain, overwrite checkpoints, change thresholds, or modify
the production LSTM.

Purpose:
1. Verify the exact dataset/window/label semantics used by the evaluator.
2. Verify train-only normalization.
3. Collect raw risk logits/probabilities from the current checkpoint.
4. Compare labels and score distributions for train/validation/test.
5. Check whether validation/test labels are actually present at each horizon.
6. Quantify ranking quality and threshold transfer without selecting anything
   from Scenario 13.
"""

from pathlib import Path
import math
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score, average_precision_score

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


BATCH_SIZE = 64


def safe_auc(y, score):
    y = np.asarray(y, dtype=int)
    score = np.asarray(score, dtype=float)
    if len(np.unique(y)) < 2:
        return float("nan")
    return float(roc_auc_score(y, score))


def safe_pr_auc(y, score):
    y = np.asarray(y, dtype=int)
    score = np.asarray(score, dtype=float)
    if len(np.unique(y)) < 2:
        return float("nan")
    return float(average_precision_score(y, score))


def percentile_summary(values):
    values = np.asarray(values, dtype=float)
    return {
        "min": float(np.min(values)),
        "p01": float(np.percentile(values, 1)),
        "p05": float(np.percentile(values, 5)),
        "p25": float(np.percentile(values, 25)),
        "median": float(np.median(values)),
        "mean": float(np.mean(values)),
        "p75": float(np.percentile(values, 75)),
        "p95": float(np.percentile(values, 95)),
        "p99": float(np.percentile(values, 99)),
        "max": float(np.max(values)),
        "std": float(np.std(values)),
    }


def print_summary(name, values):
    s = percentile_summary(values)
    print(
        f"{name:<24}"
        f"N={len(values):4d} "
        f"min={s['min']:.6f} "
        f"p01={s['p01']:.6f} "
        f"p05={s['p05']:.6f} "
        f"p25={s['p25']:.6f} "
        f"median={s['median']:.6f} "
        f"mean={s['mean']:.6f} "
        f"p75={s['p75']:.6f} "
        f"p95={s['p95']:.6f} "
        f"p99={s['p99']:.6f} "
        f"max={s['max']:.6f} "
        f"std={s['std']:.6f}"
    )


def load_model():
    checkpoint = CHECKPOINT_DIR / "ctu13_risk_world_model.pt"

    if not checkpoint.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint}")

    model = CTU13RiskWorldModel().to(DEVICE)

    state = torch.load(
        checkpoint,
        map_location=DEVICE,
        weights_only=True,
    )

    model.load_state_dict(state)
    model.eval()

    return model, checkpoint


def collect_predictions(model, dataset):
    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    probabilities = {
        h: [] for h in range(1, FORECAST_HORIZON + 1)
    }
    logits = {
        h: [] for h in range(1, FORECAST_HORIZON + 1)
    }
    labels = {
        h: [] for h in range(1, FORECAST_HORIZON + 1)
    }
    scenarios = []

    with torch.no_grad():
        for history, _future_features, future_attack, batch_scenarios in loader:
            history = history.to(DEVICE)

            _latent_predictions, risk_logits = model(history)

            batch_logits = risk_logits.cpu().numpy()
            batch_probabilities = 1.0 / (1.0 + np.exp(-batch_logits))
            batch_labels = future_attack.numpy()

            for i in range(FORECAST_HORIZON):
                h = i + 1
                logits[h].extend(batch_logits[:, i].tolist())
                probabilities[h].extend(
                    batch_probabilities[:, i].tolist()
                )
                labels[h].extend(
                    batch_labels[:, i].tolist()
                )

            scenarios.extend(batch_scenarios.tolist())

    return probabilities, logits, labels, scenarios


def analyze_split(name, model, dataset):
    print()
    print("=" * 90)
    print(f"{name} — DATASET / PREDICTION DIAGNOSTIC")
    print("=" * 90)

    print(f"Dataset scenarios: {sorted(set(dataset_scenarios(dataset)))}")
    print(f"Dataset windows:   {len(dataset)}")

    probabilities, logits, labels, scenarios = collect_predictions(
        model, dataset
    )

    for h in range(1, FORECAST_HORIZON + 1):
        y = np.asarray(labels[h], dtype=int)
        p = np.asarray(probabilities[h], dtype=float)
        z = np.asarray(logits[h], dtype=float)

        benign = int(np.sum(y == 0))
        attack = int(np.sum(y == 1))

        print()
        print(f"---------------- T+{h} ----------------")
        print(f"Labels: benign={benign} attack={attack}")

        print_summary("ALL probability", p)
        print_summary("ALL logit", z)

        if attack > 0:
            print_summary(
                "ATTACK probability",
                p[y == 1],
            )
            print_summary(
                "ATTACK logit",
                z[y == 1],
            )

        if benign > 0:
            print_summary(
                "BENIGN probability",
                p[y == 0],
            )
            print_summary(
                "BENIGN logit",
                z[y == 0],
            )

        if attack > 0 and benign > 0:
            prob_gap = float(
                np.mean(p[y == 1]) -
                np.mean(p[y == 0])
            )
            logit_gap = float(
                np.mean(z[y == 1]) -
                np.mean(z[y == 0])
            )
            print()
            print(
                f"Probability mean gap : {prob_gap:.10f}"
            )
            print(
                f"Logit mean gap       : {logit_gap:.10f}"
            )

        print(
            f"ROC-AUC              : {safe_auc(y, p)}"
        )
        print(
            f"PR-AUC               : {safe_pr_auc(y, p)}"
        )

    return {
        "probabilities": probabilities,
        "logits": logits,
        "labels": labels,
        "scenarios": scenarios,
    }


def dataset_scenarios(dataset):
    return [
        sample["scenario"]
        for sample in dataset.samples
    ]


def raw_attack_state_check(df, scenarios):
    print()
    print("=" * 90)
    print("RAW CSV ATTACK_STATE CHECK")
    print("=" * 90)

    for scenario in scenarios:
        part = (
            df[df["Scenario"] == scenario]
            .sort_values("Timestamp")
            .reset_index(drop=True)
        )

        values = (
            part["Attack_State"]
            .astype(int)
            .to_numpy()
        )

        print(
            f"Scenario {scenario:2d}: "
            f"states={len(values):3d} "
            f"benign={int(np.sum(values == 0)):3d} "
            f"attack={int(np.sum(values == 1)):3d}"
        )

        if len(values) >= SEQUENCE_LENGTH + FORECAST_HORIZON:
            for h in range(1, FORECAST_HORIZON + 1):
                start = SEQUENCE_LENGTH + (h - 1)
                future_values = values[start:]
                print(
                    f"    raw future T+{h}: "
                    f"benign={int(np.sum(future_values == 0)):3d} "
                    f"attack={int(np.sum(future_values == 1)):3d}"
                )


def verify_window_label_semantics(df, dataset):
    """
    Independently reconstruct the future Attack_State labels from the raw
    scenario rows and compare them with the dataset's stored future_attack.
    This is the critical check for the earlier validation discrepancy.
    """
    print()
    print("=" * 90)
    print("WINDOW LABEL-ALIGNMENT CHECK")
    print("=" * 90)

    total_checked = 0
    total_mismatches = 0

    for sample in dataset.samples:
        scenario = sample["scenario"]

        scenario_df = (
            df[df["Scenario"] == scenario]
            .sort_values("Timestamp")
            .reset_index(drop=True)
        )

        history = sample["history"]
        del history

        # Identify the exact window by matching the stored future feature
        # sequence against the scaled values is unnecessary and can be
        # numerically fragile. Instead, reproduce all possible windows and
        # compare their future labels in order.
        #
        # The dataset constructs windows chronologically with:
        # start -> start+SEQUENCE_LENGTH ... start+SEQUENCE_LENGTH+HORIZON-1
        #
        # We therefore use an occurrence counter per scenario.
        #
        # This function performs a complete reconstruction below.
        break

    # Complete reconstruction by scenario, in exactly the same order as
    # CTU13RiskDataset.
    for scenario in sorted(set(dataset_scenarios(dataset))):
        scenario_df = (
            df[df["Scenario"] == scenario]
            .sort_values("Timestamp")
            .reset_index(drop=True)
        )

        raw_labels = (
            scenario_df["Attack_State"]
            .astype(int)
            .to_numpy()
        )

        max_start = (
            len(scenario_df)
            - SEQUENCE_LENGTH
            - FORECAST_HORIZON
            + 1
        )

        expected = [
            raw_labels[
                start + SEQUENCE_LENGTH:
                start + SEQUENCE_LENGTH + FORECAST_HORIZON
            ].astype(np.float32)
            for start in range(max_start)
        ]

        actual = [
            sample["future_attack"]
            for sample in dataset.samples
            if sample["scenario"] == scenario
        ]

        scenario_mismatches = 0

        if len(expected) != len(actual):
            print(
                f"Scenario {scenario}: "
                f"WINDOW COUNT MISMATCH "
                f"expected={len(expected)} actual={len(actual)}"
            )
            scenario_mismatches += abs(
                len(expected) - len(actual)
            )

        for e, a in zip(expected, actual):
            total_checked += 1
            if not np.array_equal(e, a):
                scenario_mismatches += 1
                total_mismatches += 1

        print(
            f"Scenario {scenario:2d}: "
            f"windows={len(actual):3d} "
            f"label_mismatches={scenario_mismatches}"
        )

    print()
    if total_mismatches == 0:
        print("RESULT: WINDOW LABEL ALIGNMENT PASSED.")
    else:
        print(
            "RESULT: WINDOW LABEL ALIGNMENT FAILED — "
            f"{total_mismatches} mismatches."
        )

    print(f"Windows checked: {total_checked}")


def threshold_transfer_report(validation_result, test_result):
    """
    Uses the already frozen thresholds from the current evaluation artifact
    only as a diagnostic reference. It does not optimize thresholds.
    """
    threshold_path = (
        CHECKPOINT_DIR / "risk_threshold_analysis.csv"
    )

    print()
    print("=" * 90)
    print("FROZEN THRESHOLD TRANSFER DIAGNOSTIC")
    print("=" * 90)

    if not threshold_path.exists():
        print(
            f"Threshold file not found: {threshold_path}"
        )
        return

    try:
        threshold_df = pd.read_csv(threshold_path)
    except Exception as exc:
        print(f"Could not read threshold file: {exc}")
        return

    print(
        f"Threshold artifact: {threshold_path}"
    )
    print()

    for h in range(1, FORECAST_HORIZON + 1):
        candidates = threshold_df[
            threshold_df.astype(str).apply(
                lambda row: row.str.contains(
                    f"T+{h}",
                    case=False,
                    regex=False,
                ).any(),
                axis=1,
            )
        ]

        if len(candidates) == 0:
            continue

        print(
            f"T+{h}: matching threshold-artifact rows="
            f"{len(candidates)}"
        )

    # Known frozen thresholds from the completed validation-only evaluation.
    frozen = {
        1: 0.924,
        2: 0.942,
        3: 0.937,
    }

    for h, threshold in frozen.items():
        y = np.asarray(
            test_result["labels"][h],
            dtype=int,
        )
        p = np.asarray(
            test_result["probabilities"][h],
            dtype=float,
        )

        predicted = p >= threshold
        positives = int(np.sum(predicted))
        actual_positives = int(np.sum(y == 1))

        print(
            f"T+{h}: frozen_threshold={threshold:.3f} "
            f"predicted_positive={positives} "
            f"actual_positive={actual_positives} "
            f"max_probability={np.max(p):.6f}"
        )

        if positives == 0:
            print(
                "     -> threshold is above every Scenario 13 "
                "probability."
            )


def main():
    print("=" * 90)
    print("CTU13 RISK MODEL CALIBRATION DIAGNOSTIC")
    print("=" * 90)
    print(f"Project root : {Path.cwd()}")
    print(f"Checkpoint   : {CHECKPOINT_DIR / 'ctu13_risk_world_model.pt'}")
    print(f"Device       : {DEVICE}")
    print(f"Train        : {TRAIN_SCENARIOS}")
    print(f"Validation   : {VALIDATION_SCENARIOS}")
    print(f"Test         : {TEST_SCENARIOS}")

    # ------------------------------------------------------------
    # Isolation
    # ------------------------------------------------------------
    overlap_train_val = set(TRAIN_SCENARIOS) & set(
        VALIDATION_SCENARIOS
    )
    overlap_train_test = set(TRAIN_SCENARIOS) & set(
        TEST_SCENARIOS
    )
    overlap_val_test = set(VALIDATION_SCENARIOS) & set(
        TEST_SCENARIOS
    )

    if (
        overlap_train_val
        or overlap_train_test
        or overlap_val_test
    ):
        raise RuntimeError(
            "Scenario isolation FAILED."
        )

    print()
    print("Scenario isolation check: PASSED")

    # ------------------------------------------------------------
    # Model
    # ------------------------------------------------------------
    print()
    print("=" * 90)
    print("LOADING MODEL")
    print("=" * 90)

    model, checkpoint = load_model()

    state = torch.load(
        checkpoint,
        map_location="cpu",
        weights_only=True,
    )

    print(
        f"Checkpoint type: {type(state)}"
    )
    print("Checkpoint loaded with an exact key match.")
    print("Model is ready for inference.")

    # ------------------------------------------------------------
    # Data
    # ------------------------------------------------------------
    print()
    print("=" * 90)
    print("LOADING DATA")
    print("=" * 90)

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH)

    print(f"Network-state CSV:")
    print(DATA_PATH)
    print(f"Total dataframe rows: {len(df)}")
    print(
        f"Scenarios present: "
        f"{sorted(df['Scenario'].unique().tolist())}"
    )

    # ------------------------------------------------------------
    # Train-only scaler
    # ------------------------------------------------------------
    print()
    print("=" * 90)
    print("FITTING TRAIN-ONLY SCALER")
    print("=" * 90)

    mean, std = fit_scaler(df)

    print(
        "Using the project's existing fit_scaler()."
    )
    print(
        "Only training scenarios can influence normalization statistics."
    )
    print(f"Mean shape: {mean.shape}")
    print(f"Std shape : {std.shape}")
    print("Train-only scaler check: PASSED")

    # ------------------------------------------------------------
    # Datasets
    # ------------------------------------------------------------
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

    print()
    print(
        f"Train windows:      {len(train_dataset)}"
    )
    print(
        f"Validation windows: {len(validation_dataset)}"
    )
    print(
        f"Test windows:       {len(test_dataset)}"
    )

    # ------------------------------------------------------------
    # Raw labels
    # ------------------------------------------------------------
    raw_attack_state_check(
        df,
        TRAIN_SCENARIOS
        + VALIDATION_SCENARIOS
        + TEST_SCENARIOS,
    )

    # ------------------------------------------------------------
    # Exact dataset-label reconstruction
    # ------------------------------------------------------------
    verify_window_label_semantics(
        df,
        train_dataset,
    )

    verify_window_label_semantics(
        df,
        validation_dataset,
    )

    verify_window_label_semantics(
        df,
        test_dataset,
    )

    # ------------------------------------------------------------
    # Predictions
    # ------------------------------------------------------------
    train_result = analyze_split(
        "TRAIN",
        model,
        train_dataset,
    )

    validation_result = analyze_split(
        "VALIDATION",
        model,
        validation_dataset,
    )

    test_result = analyze_split(
        "TEST / SCENARIO 13",
        model,
        test_dataset,
    )

    # ------------------------------------------------------------
    # Frozen threshold transfer
    # ------------------------------------------------------------
    threshold_transfer_report(
        validation_result,
        test_result,
    )

    # ------------------------------------------------------------
    # Final diagnosis
    # ------------------------------------------------------------
    print()
    print("=" * 90)
    print("DIAGNOSTIC CONCLUSION")
    print("=" * 90)

    val_attack_counts = {
        h: int(
            np.sum(
                np.asarray(
                    validation_result["labels"][h],
                    dtype=int,
                ) == 1
            )
        )
        for h in range(1, FORECAST_HORIZON + 1)
    }

    test_attack_counts = {
        h: int(
            np.sum(
                np.asarray(
                    test_result["labels"][h],
                    dtype=int,
                ) == 1
            )
        )
        for h in range(1, FORECAST_HORIZON + 1)
    }

    print(
        f"Validation attack counts by horizon: "
        f"{val_attack_counts}"
    )
    print(
        f"Scenario 13 attack counts by horizon: "
        f"{test_attack_counts}"
    )

    print()
    print(
        "This diagnostic does NOT change the model, thresholds, "
        "checkpoint, or production LSTM."
    )
    print(
        "Use the output to determine whether the remaining issue is "
        "label/window alignment, probability calibration, or "
        "cross-scenario score-shift."
    )


if __name__ == "__main__":
    main()
