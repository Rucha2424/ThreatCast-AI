import os
import pickle

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)


# ============================================================
# PATH
# ============================================================

DATA_FILE = r"E:\Projects\SIH\data\CTU13\all_network_states.csv"


# ============================================================
# SCENARIO SPLIT
# ============================================================

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]


# ============================================================
# FEATURES
# ============================================================

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

TARGET = "Target_Early_Warning"


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("THREATCAST - RANDOM FOREST BASELINE")
print("5-MINUTE EARLY-WARNING EXPERIMENT")
print("=" * 70)

df = pd.read_csv(DATA_FILE)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)

print()
print(f"Dataset shape: {df.shape}")


# ============================================================
# SCENARIO SPLIT
# ============================================================

train_df = df[
    df["Scenario"].isin(TRAIN_SCENARIOS)
].copy()

val_df = df[
    df["Scenario"].isin(VAL_SCENARIOS)
].copy()

test_df = df[
    df["Scenario"].isin(TEST_SCENARIOS)
].copy()


print()
print("=" * 70)
print("SCENARIO SPLIT")
print("=" * 70)

print(f"Training scenarios   : {TRAIN_SCENARIOS}")
print(f"Validation scenarios : {VAL_SCENARIOS}")
print(f"Test scenarios       : {TEST_SCENARIOS}")

print()
print(f"Training states   : {len(train_df)}")
print(f"Validation states : {len(val_df)}")
print(f"Test states       : {len(test_df)}")

print()
print("Training target:")
print(train_df[TARGET].value_counts())

print()
print("Validation target:")
print(val_df[TARGET].value_counts())

print()
print("Test target:")
print(test_df[TARGET].value_counts())


# ============================================================
# FEATURES
# ============================================================

X_train = train_df[FEATURES].astype(float)
y_train = train_df[TARGET].astype(int)

X_val = val_df[FEATURES].astype(float)
y_val = val_df[TARGET].astype(int)

X_test = test_df[FEATURES].astype(float)
y_test = test_df[TARGET].astype(int)


# ============================================================
# RANDOM FOREST
# ============================================================

print()
print("=" * 70)
print("TRAINING RANDOM FOREST")
print("=" * 70)

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=8,
    min_samples_leaf=3,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)

model.fit(
    X_train,
    y_train
)

print("Training complete.")


# ============================================================
# VALIDATION PROBABILITIES
# ============================================================

val_prob = model.predict_proba(
    X_val
)[:, 1]


# ============================================================
# SELECT THRESHOLD ON VALIDATION
# ============================================================

thresholds = np.arange(
    0.05,
    0.96,
    0.01
)

best_threshold = 0.50
best_f1 = -1.0

for threshold in thresholds:

    val_pred = (
        val_prob >= threshold
    ).astype(int)

    score = f1_score(
        y_val,
        val_pred,
        zero_division=0
    )

    if score > best_f1:
        best_f1 = score
        best_threshold = threshold


val_pred = (
    val_prob >= best_threshold
).astype(int)


print()
print("=" * 70)
print("VALIDATION")
print("=" * 70)

print(
    f"Best threshold : {best_threshold:.2f}"
)

print(
    f"Validation F1  : {best_f1:.4f}"
)

print(
    f"Validation recall : "
    f"{recall_score(y_val, val_pred, zero_division=0):.4f}"
)


# ============================================================
# FINAL TEST
# ============================================================

test_prob = model.predict_proba(
    X_test
)[:, 1]

test_pred = (
    test_prob >= best_threshold
).astype(int)


# ============================================================
# METRICS
# ============================================================

accuracy = accuracy_score(
    y_test,
    test_pred
)

precision = precision_score(
    y_test,
    test_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    test_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    test_pred,
    zero_division=0
)

tn, fp, fn, tp = confusion_matrix(
    y_test,
    test_pred,
    labels=[0, 1]
).ravel()

fpr = (
    fp / (fp + tn)
    if (fp + tn) > 0
    else 0.0
)

roc_auc = roc_auc_score(
    y_test,
    test_prob
)

pr_auc = average_precision_score(
    y_test,
    test_prob
)


# ============================================================
# RESULTS
# ============================================================

print()
print("=" * 70)
print("FINAL RANDOM FOREST TEST RESULTS")
print("=" * 70)

print(f"Test scenarios : {TEST_SCENARIOS}")
print(f"Threshold      : {best_threshold:.2f}")

print()
print(f"Accuracy       : {accuracy:.4f}")
print(f"Precision      : {precision:.4f}")
print(f"Recall         : {recall:.4f}")
print(f"F1 Score       : {f1:.4f}")
print(f"FPR            : {fpr:.4f}")
print(f"ROC-AUC        : {roc_auc:.4f}")
print(f"PR-AUC         : {pr_auc:.4f}")

print()
print("Confusion Matrix:")
print(f"TN: {tn}")
print(f"FP: {fp}")
print(f"FN: {fn}")
print(f"TP: {tp}")

print()
print("=" * 70)
print("RANDOM FOREST EXPERIMENT COMPLETE")
print("=" * 70)