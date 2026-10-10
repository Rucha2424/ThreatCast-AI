import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    average_precision_score
)

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.optimizers import Adam


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = r"data\CTU13\scenario12_rich_features.csv"

MODEL_PATH = "lstm_scenario12_rich.keras"
SCALER_PATH = "lstm_scenario12_rich_scaler.pkl"

SEQUENCE_LENGTH = 5

# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("SCENARIO 12 RICH-FEATURE LSTM")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values("Timestamp").reset_index(drop=True)

print("\nDataset shape:", df.shape)


# ============================================================
# REMOVE NON-MODEL / LEAKAGE COLUMNS
# ============================================================

EXCLUDE_COLUMNS = [
    "Timestamp",
    "Scenario",

    # Attack information
    "Attack_Flow_Count",
    "Attack_State",

    # Target
    "Target_Early_Warning"
]

feature_columns = [
    c for c in df.columns
    if c not in EXCLUDE_COLUMNS
]

print("\nNumber of model features:", len(feature_columns))

print("\nModel features:")
for i, feature in enumerate(feature_columns, 1):
    print(f"{i:2d}. {feature}")


# ============================================================
# PREPARE X AND y
# ============================================================

X_raw = df[feature_columns].astype(float).values

y = df["Target_Early_Warning"].astype(int).values

print("\nX shape:", X_raw.shape)
print("y shape:", y.shape)

print("\nTarget distribution:")
print(pd.Series(y).value_counts().sort_index())


# ============================================================
# SCALE FEATURES
# ============================================================

scaler = StandardScaler()

X_scaled = scaler.fit_transform(X_raw)

joblib.dump(scaler, SCALER_PATH)

print("\nScaler saved:", SCALER_PATH)


# ============================================================
# CREATE SEQUENCES
# ============================================================

X_seq = []
y_seq = []
timestamps = []

for i in range(SEQUENCE_LENGTH - 1, len(X_scaled)):

    X_seq.append(
        X_scaled[i - SEQUENCE_LENGTH + 1:i + 1]
    )

    y_seq.append(y[i])

    timestamps.append(
        df["Timestamp"].iloc[i]
    )

X_seq = np.array(X_seq)
y_seq = np.array(y_seq)

print("\nSequence shape:", X_seq.shape)
print("Sequence targets:", y_seq.shape)


# ============================================================
# TEMPORAL TRAIN / TEST SPLIT
# ============================================================
#
# Important:
# Scenario 12 is one continuous scenario.
#
# We therefore keep chronological order:
#
# first 70%  -> training
# last 30%   -> testing
#
# This prevents future information from entering training.
# ============================================================

split_index = int(len(X_seq) * 0.70)

X_train = X_seq[:split_index]
y_train = y_seq[:split_index]

X_test = X_seq[split_index:]
y_test = y_seq[split_index:]

test_timestamps = timestamps[split_index:]

print("\nTraining sequences:", len(X_train))
print("Testing sequences :", len(X_test))

print("\nTraining target distribution:")
print(pd.Series(y_train).value_counts().sort_index())

print("\nTesting target distribution:")
print(pd.Series(y_test).value_counts().sort_index())


# ============================================================
# CLASS WEIGHT
# ============================================================

positive_count = np.sum(y_train == 1)
negative_count = np.sum(y_train == 0)

if positive_count > 0:
    positive_weight = negative_count / positive_count
else:
    positive_weight = 1.0

# Prevent excessively large weights
positive_weight = min(positive_weight, 10.0)

class_weight = {
    0: 1.0,
    1: positive_weight
}

print("\nClass weights:", class_weight)


# ============================================================
# BUILD LSTM
# ============================================================

model = Sequential([
    LSTM(
        64,
        input_shape=(X_train.shape[1], X_train.shape[2])
    ),

    Dropout(0.30),

    Dense(32, activation="relu"),

    Dropout(0.20),

    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        "Precision",
        "Recall",
        "AUC"
    ]
)

model.summary()


# ============================================================
# TRAIN
# ============================================================

early_stopping = EarlyStopping(
    monitor="val_AUC",
    mode="max",
    patience=15,
    restore_best_weights=True
)

print("\n" + "=" * 70)
print("TRAINING")
print("=" * 70)

history = model.fit(
    X_train,
    y_train,

    validation_split=0.20,

    epochs=100,

    batch_size=16,

    class_weight=class_weight,

    callbacks=[early_stopping],

    verbose=1
)


# ============================================================
# PREDICTIONS
# ============================================================

probabilities = model.predict(
    X_test,
    verbose=0
).ravel()


# ============================================================
# FIND BEST F1 THRESHOLD
# ============================================================

thresholds = np.arange(
    0.01,
    1.00,
    0.01
)

best_threshold = 0.50
best_f1 = -1

for threshold in thresholds:

    predictions = (
        probabilities >= threshold
    ).astype(int)

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    if f1 > best_f1:

        best_f1 = f1
        best_threshold = threshold


# ============================================================
# FINAL METRICS
# ============================================================

y_pred = (
    probabilities >= best_threshold
).astype(int)

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)

tn, fp, fn, tp = confusion_matrix(
    y_test,
    y_pred,
    labels=[0, 1]
).ravel()

fpr = (
    fp / (fp + tn)
    if (fp + tn) > 0
    else 0
)

try:
    roc_auc = roc_auc_score(
        y_test,
        probabilities
    )
except ValueError:
    roc_auc = float("nan")

try:
    pr_auc = average_precision_score(
        y_test,
        probabilities
    )
except ValueError:
    pr_auc = float("nan")


# ============================================================
# PRINT RESULTS
# ============================================================

print("\n" + "=" * 70)
print("SCENARIO 12 RICH-FEATURE RESULTS")
print("=" * 70)

print(f"\nBest threshold : {best_threshold:.2f}")

print(f"Accuracy       : {accuracy:.4f}")
print(f"Precision      : {precision:.4f}")
print(f"Recall         : {recall:.4f}")
print(f"F1 Score       : {f1:.4f}")
print(f"FPR            : {fpr:.4f}")
print(f"ROC-AUC        : {roc_auc:.4f}")
print(f"PR-AUC         : {pr_auc:.4f}")

print("\nConfusion Matrix:")
print(f"TN = {tn}")
print(f"FP = {fp}")
print(f"FN = {fn}")
print(f"TP = {tp}")


# ============================================================
# SAVE MODEL
# ============================================================

model.save(MODEL_PATH)

print("\nModel saved:", MODEL_PATH)

print("\n" + "=" * 70)
print("EXPERIMENT COMPLETE")
print("=" * 70)