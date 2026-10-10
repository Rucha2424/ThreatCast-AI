import pandas as pd
import numpy as np
import pickle

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

DATA_PATH = r"data\CTU13\enhanced_network_states.csv"

MODEL_PATH = r"lstm_early_warning_enhanced.keras"

SCALER_PATH = r"lstm_early_warning_enhanced_scaler.pkl"

SEQUENCE_LENGTH = 5

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


# ============================================================
# FEATURES
#
# Exclude:
# - Scenario
# - Timestamp
# - Attack_Flow_Count
# - Attack_State
# - Target_Early_Warning
#
# These must not enter the model.
# ============================================================

EXCLUDED = [
    "Scenario",
    "Timestamp",
    "Attack_Flow_Count",
    "Attack_State",
    "Target_Early_Warning",
]

FEATURES = [
    column
    for column in df.columns
    if column not in EXCLUDED
]


TARGET = "Target_Early_Warning"


print("=" * 70)
print("ENHANCED LSTM")
print("=" * 70)

print("\nNumber of features:", len(FEATURES))

print("\nFeatures:")

for feature in FEATURES:
    print(" ", feature)


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


print("\n" + "=" * 70)
print("SCENARIO SPLIT")
print("=" * 70)

print("Train scenarios:", TRAIN_SCENARIOS)
print("Validation scenarios:", VAL_SCENARIOS)
print("Test scenarios:", TEST_SCENARIOS)

print("\nTrain states:", len(train_df))
print("Validation states:", len(val_df))
print("Test states:", len(test_df))

print("\nTrain targets:")
print(train_df[TARGET].value_counts())

print("\nValidation targets:")
print(val_df[TARGET].value_counts())

print("\nTest targets:")
print(test_df[TARGET].value_counts())


# ============================================================
# SCALE FEATURES
#
# Fit ONLY on training data.
# ============================================================

scaler = StandardScaler()

scaler.fit(
    train_df[FEATURES]
)

train_df[FEATURES] = scaler.transform(
    train_df[FEATURES]
)

val_df[FEATURES] = scaler.transform(
    val_df[FEATURES]
)

test_df[FEATURES] = scaler.transform(
    test_df[FEATURES]
)


# ============================================================
# SEQUENCE CREATION
# ============================================================

def create_sequences(dataframe):

    X = []
    y = []
    scenarios = []
    timestamps = []

    for scenario, group in dataframe.groupby(
        "Scenario",
        sort=False
    ):

        group = group.sort_values(
            "Timestamp"
        ).reset_index(drop=True)

        values = group[FEATURES].values
        targets = group[TARGET].values

        for i in range(len(group)):

            start = max(
                0,
                i - SEQUENCE_LENGTH + 1
            )

            sequence = values[start:i + 1]

            # Pad at beginning if necessary
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

            timestamps.append(
                group.loc[i, "Timestamp"]
            )

    return (
        np.array(X, dtype=np.float32),
        np.array(y, dtype=np.int32),
        scenarios,
        timestamps
    )


X_train, y_train, _, _ = create_sequences(train_df)

X_val, y_val, val_scenarios, val_timestamps = create_sequences(
    val_df
)

X_test, y_test, test_scenarios, test_timestamps = create_sequences(
    test_df
)


print("\n" + "=" * 70)
print("SEQUENCES")
print("=" * 70)

print("X_train:", X_train.shape)
print("X_val:", X_val.shape)
print("X_test:", X_test.shape)


# ============================================================
# CLASS WEIGHTS
# ============================================================

positive_count = np.sum(y_train == 1)
negative_count = np.sum(y_train == 0)

raw_weight = negative_count / max(
    positive_count,
    1
)

positive_weight = min(
    raw_weight,
    10.0
)

class_weight = {
    0: 1.0,
    1: positive_weight
}

print("\nClass weight:")
print(class_weight)


# ============================================================
# MODEL
# ============================================================

model = Sequential([
    LSTM(
        64,
        input_shape=(
            SEQUENCE_LENGTH,
            len(FEATURES)
        )
    ),

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
    restore_best_weights=True,
    verbose=1
)


history = model.fit(
    X_train,
    y_train,
    validation_data=(
        X_val,
        y_val
    ),
    epochs=60,
    batch_size=32,
    class_weight=class_weight,
    callbacks=[early_stopping],
    verbose=1
)


# ============================================================
# THRESHOLD SELECTION
# ============================================================

val_prob = model.predict(
    X_val,
    verbose=0
).ravel()


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
print("VALIDATION THRESHOLD")
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
# FINAL TEST
# ============================================================

test_prob = model.predict(
    X_test,
    verbose=0
).ravel()

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


print("\n" + "=" * 70)
print("FINAL TEST RESULTS")
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

print("\nConfusion Matrix:")

print(
    f"TN={tn}  FP={fp}"
)

print(
    f"FN={fn}  TP={tp}"
)


# ============================================================
# SAVE MODEL + SCALER
# ============================================================

model.save(
    MODEL_PATH
)

with open(
    SCALER_PATH,
    "wb"
) as file:

    pickle.dump(
        scaler,
        file
    )


print("\n" + "=" * 70)
print("SAVED")
print("=" * 70)

print("Model:")
print(MODEL_PATH)

print("\nScaler:")
print(SCALER_PATH)

print("\nDONE")
print("=" * 70)