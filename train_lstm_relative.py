import pandas as pd
import numpy as np

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
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.optimizers import Adam


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = r"data\CTU13\scenario_relative_network_states.csv"

SEQUENCE_LENGTH = 5

# Same scenario split used for our previous 13-scenario model
TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]

TARGET = "Target_Early_Warning"

# These are NEVER allowed as model inputs
EXCLUDED_COLUMNS = [
    "Scenario",
    "Timestamp",
    "Attack_Flow_Count",
    "Attack_State",
    TARGET
]


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("SCENARIO-RELATIVE LSTM")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)

print("\nDataset shape:", df.shape)


# ============================================================
# SELECT FEATURES
# ============================================================

FEATURES = [
    column
    for column in df.columns
    if column not in EXCLUDED_COLUMNS
]

print("\nNumber of features:", len(FEATURES))

print("\nFeatures used:")

for feature in FEATURES:
    print(" -", feature)


# ============================================================
# VERIFY NO LEAKAGE FEATURES
# ============================================================

for forbidden in EXCLUDED_COLUMNS:

    if forbidden in FEATURES:

        raise ValueError(
            f"LEAKAGE ERROR: {forbidden} "
            f"is being used as a feature!"
        )


print("\nLeakage check: PASSED")


# ============================================================
# SCENARIO SUMMARY
# ============================================================

print("\nScenario split:")

print("Training:", TRAIN_SCENARIOS)
print("Validation:", VAL_SCENARIOS)
print("Test:", TEST_SCENARIOS)


# ============================================================
# SEQUENCE CREATION
# ============================================================

def create_sequences(dataframe, scaler):

    X = []
    y = []

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

            # Padding is done only inside this scenario
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

    return (
        np.array(X, dtype=np.float32),
        np.array(y, dtype=np.int32)
    )


# ============================================================
# SPLIT DATA
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


print("\nStates:")
print("Train:", len(train_df))
print("Validation:", len(val_df))
print("Test:", len(test_df))


print("\nWarning targets:")
print(
    "Train:",
    int(train_df[TARGET].sum())
)

print(
    "Validation:",
    int(val_df[TARGET].sum())
)

print(
    "Test:",
    int(test_df[TARGET].sum())
)


# ============================================================
# SCALE
#
# IMPORTANT:
# Scaler is fitted ONLY on training scenarios.
# ============================================================

scaler = StandardScaler()

scaler.fit(
    train_df[FEATURES]
)


# ============================================================
# CREATE SEQUENCES
# ============================================================

X_train, y_train = create_sequences(
    train_df,
    scaler
)

X_val, y_val = create_sequences(
    val_df,
    scaler
)

X_test, y_test = create_sequences(
    test_df,
    scaler
)


print("\nSequence shapes:")

print("X_train:", X_train.shape)
print("X_val  :", X_val.shape)
print("X_test :", X_test.shape)


# ============================================================
# CLASS WEIGHT
# ============================================================

positive_count = np.sum(
    y_train == 1
)

negative_count = np.sum(
    y_train == 0
)

raw_weight = (
    negative_count /
    max(positive_count, 1)
)

positive_weight = min(
    raw_weight,
    10.0
)

class_weight = {
    0: 1.0,
    1: positive_weight
}

print("\nClass weights:")
print(class_weight)


# ============================================================
# MODEL
# ============================================================

model = Sequential([
    Input(
        shape=(
            SEQUENCE_LENGTH,
            len(FEATURES)
        )
    ),

    LSTM(64),

    Dropout(0.30),

    Dense(
        32,
        activation="relu"
    ),

    Dropout(0.20),

    Dense(
        1,
        activation="sigmoid"
    )
])


model.compile(
    optimizer=Adam(
        learning_rate=0.001
    ),
    loss="binary_crossentropy",
    metrics=[
        "accuracy"
    ]
)


model.summary()


# ============================================================
# TRAIN
# ============================================================

early_stopping = EarlyStopping(
    monitor="val_loss",
    patience=10,
    restore_best_weights=True
)


print("\nTraining...")

history = model.fit(
    X_train,
    y_train,

    validation_data=(
        X_val,
        y_val
    ),

    epochs=50,

    batch_size=32,

    class_weight=class_weight,

    callbacks=[
        early_stopping
    ],

    verbose=1
)


# ============================================================
# VALIDATION PREDICTIONS
# ============================================================

val_prob = model.predict(
    X_val,
    verbose=0
).ravel()


# ============================================================
# SELECT THRESHOLD USING VALIDATION ONLY
# ============================================================

best_threshold = 0.50
best_f1 = -1

for threshold in np.arange(
    0.05,
    0.96,
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


print("\nValidation threshold:")
print(
    f"{best_threshold:.2f}"
)

print(
    f"Validation F1: {best_f1:.4f}"
)


# ============================================================
# TEST PREDICTIONS
# ============================================================

test_prob = model.predict(
    X_test,
    verbose=0
).ravel()

test_pred = (
    test_prob >= best_threshold
).astype(int)


# ============================================================
# TEST METRICS
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
# PRINT RESULTS
# ============================================================

print("\n" + "=" * 70)
print("SCENARIO-RELATIVE LSTM RESULTS")
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
# SAVE MODEL
# ============================================================

MODEL_PATH = (
    "lstm_early_warning_relative.keras"
)

SCALER_PATH = (
    "lstm_early_warning_relative_scaler.pkl"
)

import joblib

model.save(
    MODEL_PATH
)

joblib.dump(
    scaler,
    SCALER_PATH
)


print("\nSaved model:")
print(MODEL_PATH)

print("\nSaved scaler:")
print(SCALER_PATH)


print("\n" + "=" * 70)
print("DONE")
print("=" * 70)