import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
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
# CONFIGURATION
# ============================================================

DATA_PATH = r"data\CTU13\all_network_states.csv"

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]

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
# LOAD
# ============================================================

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


# ============================================================
# SPLIT
# ============================================================

train_df = df[df["Scenario"].isin(TRAIN_SCENARIOS)].copy()
val_df = df[df["Scenario"].isin(VAL_SCENARIOS)].copy()
test_df = df[df["Scenario"].isin(TEST_SCENARIOS)].copy()


print("=" * 70)
print("LOGISTIC REGRESSION BASELINE")
print("=" * 70)

print("\nTrain:", len(train_df))
print("Validation:", len(val_df))
print("Test:", len(test_df))

print("\nTrain targets:")
print(train_df[TARGET].value_counts())

print("\nValidation targets:")
print(val_df[TARGET].value_counts())

print("\nTest targets:")
print(test_df[TARGET].value_counts())


# ============================================================
# SCALE
# FIT ONLY ON TRAINING DATA
# ============================================================

scaler = StandardScaler()

X_train = scaler.fit_transform(
    train_df[FEATURES]
)

X_val = scaler.transform(
    val_df[FEATURES]
)

X_test = scaler.transform(
    test_df[FEATURES]
)

y_train = train_df[TARGET].values
y_val = val_df[TARGET].values
y_test = test_df[TARGET].values


# ============================================================
# MODEL
# ============================================================

model = LogisticRegression(
    class_weight="balanced",
    max_iter=2000,
    C=1.0,
    random_state=42
)

model.fit(
    X_train,
    y_train
)


# ============================================================
# VALIDATION PROBABILITIES
# ============================================================

val_prob = model.predict_proba(
    X_val
)[:, 1]


# ============================================================
# SELECT THRESHOLD USING VALIDATION F1
# ============================================================

best_threshold = 0.50
best_f1 = -1

for threshold in np.arange(
    0.01,
    0.51,
    0.01
):

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


print("\n" + "=" * 70)
print("VALIDATION")
print("=" * 70)

print(
    "Best threshold:",
    round(best_threshold, 2)
)

print(
    "Validation F1:",
    round(best_f1, 4)
)


# ============================================================
# TEST
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

fpr = fp / max(
    tn + fp,
    1
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

print("\n" + "=" * 70)
print("FINAL TEST RESULTS")
print("=" * 70)

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1       : {f1:.4f}")
print(f"FPR      : {fpr:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")
print(f"PR-AUC   : {pr_auc:.4f}")

print("\nConfusion Matrix:")
print(f"TN={tn}  FP={fp}")
print(f"FN={fn}  TP={tp}")

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)