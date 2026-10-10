import pandas as pd
import numpy as np
import joblib

from tensorflow.keras.models import load_model

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    average_precision_score
)


# ============================================================
# CONFIG
# ============================================================

DATA_PATH = r"data\CTU13\all_network_states.csv"

MODEL_PATH = r"lstm_early_warning_multiscenario.keras"

SCALER_PATH = r"lstm_early_warning_scaler.pkl"

SEQUENCE_LENGTH = 5

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]

THRESHOLD = 0.08

TARGET = "Target_Early_Warning"

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


# ============================================================
# LOAD
# ============================================================

print("=" * 70)
print("THREATCAST FINAL LSTM EVALUATION")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(
    df["Timestamp"]
)

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


model = load_model(
    MODEL_PATH
)

scaler = joblib.load(
    SCALER_PATH
)


# ============================================================
# SEQUENCE CREATION
# ============================================================

def create_sequences(dataframe):

    X = []
    y = []
    scenarios = []

    for scenario, group in dataframe.groupby(
        "Scenario",
        sort=False
    ):

        group = group.sort_values(
            "Timestamp"
        ).reset_index(drop=True)

        values = scaler.transform(
            group[FEATURES]
        )

        targets = group[TARGET].values

        for i in range(len(group)):

            start = max(
                0,
                i - SEQUENCE_LENGTH + 1
            )

            sequence = values[start:i + 1]

            if len(sequence) < SEQUENCE_LENGTH:

                padding = np.zeros(
                    (
                        SEQUENCE_LENGTH - len(sequence),
                        len(FEATURES)
                    )
                )

                sequence = np.vstack(
                    [padding, sequence]
                )

            X.append(sequence)
            y.append(targets[i])
            scenarios.append(scenario)

    return (
        np.array(X, dtype=np.float32),
        np.array(y, dtype=np.int32),
        np.array(scenarios)
    )


# ============================================================
# TEST DATA
# ============================================================

test_df = df[
    df["Scenario"].isin(TEST_SCENARIOS)
].copy()

X_test, y_test, scenario_ids = create_sequences(
    test_df
)


print("\nTest scenarios:", TEST_SCENARIOS)

print(
    "Test states:",
    len(test_df)
)

print(
    "Test warnings:",
    int(y_test.sum())
)

print(
    "X_test shape:",
    X_test.shape
)


# ============================================================
# PREDICTIONS
# ============================================================

probabilities = model.predict(
    X_test,
    verbose=0
).ravel()

predictions = (
    probabilities >= THRESHOLD
).astype(int)


# ============================================================
# OVERALL METRICS
# ============================================================

accuracy = accuracy_score(
    y_test,
    predictions
)

precision = precision_score(
    y_test,
    predictions,
    zero_division=0
)

recall = recall_score(
    y_test,
    predictions,
    zero_division=0
)

f1 = f1_score(
    y_test,
    predictions,
    zero_division=0
)

tn, fp, fn, tp = confusion_matrix(
    y_test,
    predictions,
    labels=[0, 1]
).ravel()

fpr = fp / max(
    tn + fp,
    1
)

roc_auc = roc_auc_score(
    y_test,
    probabilities
)

pr_auc = average_precision_score(
    y_test,
    probabilities
)


print("\n" + "=" * 70)
print("OVERALL TEST RESULTS")
print("=" * 70)

print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1       : {f1:.4f}"
)

print(
    f"FPR      : {fpr:.4f}"
)

print(
    f"ROC-AUC  : {roc_auc:.4f}"
)

print(
    f"PR-AUC   : {pr_auc:.4f}"
)

print(
    f"TN={tn} FP={fp} FN={fn} TP={tp}"
)


# ============================================================
# PER-SCENARIO RESULTS
# ============================================================

print("\n" + "=" * 70)
print("PER-SCENARIO RESULTS")
print("=" * 70)

results = []

for scenario in TEST_SCENARIOS:

    mask = (
        scenario_ids == scenario
    )

    y_scenario = y_test[mask]

    pred_scenario = predictions[mask]

    prob_scenario = probabilities[mask]

    tn_s, fp_s, fn_s, tp_s = confusion_matrix(
        y_scenario,
        pred_scenario,
        labels=[0, 1]
    ).ravel()

    precision_s = precision_score(
        y_scenario,
        pred_scenario,
        zero_division=0
    )

    recall_s = recall_score(
        y_scenario,
        pred_scenario,
        zero_division=0
    )

    f1_s = f1_score(
        y_scenario,
        pred_scenario,
        zero_division=0
    )

    fpr_s = fp_s / max(
        tn_s + fp_s,
        1
    )

    try:
        roc_auc_s = roc_auc_score(
            y_scenario,
            prob_scenario
        )
    except ValueError:
        roc_auc_s = np.nan

    try:
        pr_auc_s = average_precision_score(
            y_scenario,
            prob_scenario
        )
    except ValueError:
        pr_auc_s = np.nan

    print(
        f"\nScenario {scenario}"
    )

    print(
        f"States   : {len(y_scenario)}"
    )

    print(
        f"Warnings : {int(y_scenario.sum())}"
    )

    print(
        f"Precision: {precision_s:.4f}"
    )

    print(
        f"Recall   : {recall_s:.4f}"
    )

    print(
        f"F1       : {f1_s:.4f}"
    )

    print(
        f"FPR      : {fpr_s:.4f}"
    )

    print(
        f"ROC-AUC  : {roc_auc_s:.4f}"
    )

    print(
        f"PR-AUC   : {pr_auc_s:.4f}"
    )

    print(
        f"TN={tn_s} FP={fp_s} "
        f"FN={fn_s} TP={tp_s}"
    )

    results.append({
        "Scenario": scenario,
        "States": len(y_scenario),
        "Warnings": int(y_scenario.sum()),
        "Precision": precision_s,
        "Recall": recall_s,
        "F1": f1_s,
        "FPR": fpr_s,
        "ROC_AUC": roc_auc_s,
        "PR_AUC": pr_auc_s,
        "TN": tn_s,
        "FP": fp_s,
        "FN": fn_s,
        "TP": tp_s
    })


# ============================================================
# SUMMARY TABLE
# ============================================================

results_df = pd.DataFrame(
    results
)

print("\n" + "=" * 70)
print("SUMMARY TABLE")
print("=" * 70)

print(
    results_df.to_string(
        index=False
    )
)


# ============================================================
# SAVE RESULTS
# ============================================================

results_df.to_csv(
    "final_lstm_scenario_results.csv",
    index=False
)

print(
    "\nSaved:",
    "final_lstm_scenario_results.csv"
)

print("\n" + "=" * 70)
print("FINAL EVALUATION COMPLETE")
print("=" * 70)