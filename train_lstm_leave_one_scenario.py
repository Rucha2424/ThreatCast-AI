import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
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
# CONFIG
# ============================================================

DATA_PATH = r"data\CTU13\all_network_states.csv"

SEQUENCE_LENGTH = 5

# Use only scenarios with enough attack/warning examples
SCENARIOS = [1, 5, 12, 13]

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


print("=" * 70)
print("LEAVE-ONE-SCENARIO-OUT LSTM")
print("=" * 70)


# ============================================================
# SCENARIO SUMMARY
# ============================================================

print("\nScenario summary:")

for scenario in SCENARIOS:

    group = df[df["Scenario"] == scenario]

    print(
        f"Scenario {scenario}: "
        f"states={len(group)}, "
        f"attacks={group['Attack_State'].sum()}, "
        f"warnings={group[TARGET].sum()}"
    )


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
# RESULTS
# ============================================================

results = []


# ============================================================
# LEAVE ONE SCENARIO OUT
# ============================================================

for test_scenario in SCENARIOS:

    print("\n" + "=" * 70)
    print(
        f"TEST SCENARIO: {test_scenario}"
    )
    print("=" * 70)

    train_scenarios = [
        s for s in SCENARIOS
        if s != test_scenario
    ]

    print(
        "Training scenarios:",
        train_scenarios
    )

    print(
        "Test scenario:",
        test_scenario
    )


    # --------------------------------------------------------
    # DATA SPLIT
    # --------------------------------------------------------

    train_df = df[
        df["Scenario"].isin(train_scenarios)
    ].copy()

    test_df = df[
        df["Scenario"] == test_scenario
    ].copy()


    print(
        "\nTraining states:",
        len(train_df)
    )

    print(
        "Test states:",
        len(test_df)
    )

    print(
        "Training warnings:",
        int(train_df[TARGET].sum())
    )

    print(
        "Test warnings:",
        int(test_df[TARGET].sum())
    )


    # --------------------------------------------------------
    # SCALE
    # --------------------------------------------------------

    scaler = StandardScaler()

    scaler.fit(
        train_df[FEATURES]
    )


    # --------------------------------------------------------
    # SEQUENCES
    # --------------------------------------------------------

    X_train, y_train = create_sequences(
        train_df,
        scaler
    )

    X_test, y_test = create_sequences(
        test_df,
        scaler
    )


    print(
        "\nX_train:",
        X_train.shape
    )

    print(
        "X_test:",
        X_test.shape
    )


    # --------------------------------------------------------
    # CLASS WEIGHT
    # --------------------------------------------------------

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


    print(
        "Class weight:",
        class_weight
    )


    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

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
        metrics=["accuracy"]
    )


    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    early_stopping = EarlyStopping(
        monitor="loss",
        patience=8,
        restore_best_weights=True
    )


    model.fit(
        X_train,
        y_train,
        epochs=40,
        batch_size=32,
        class_weight=class_weight,
        callbacks=[early_stopping],
        verbose=0
    )


    # --------------------------------------------------------
    # TEST
    # --------------------------------------------------------

    test_prob = model.predict(
        X_test,
        verbose=0
    ).ravel()


    # --------------------------------------------------------
    # THRESHOLD
    #
    # No validation scenario exists in pure LOSO.
    # Use 0.50 here and report ranking metrics separately.
    # --------------------------------------------------------

    threshold = 0.50

    test_pred = (
        test_prob >= threshold
    ).astype(int)


    # --------------------------------------------------------
    # METRICS
    # --------------------------------------------------------

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

    try:
        roc_auc = roc_auc_score(
            y_test,
            test_prob
        )
    except ValueError:
        roc_auc = np.nan

    try:
        pr_auc = average_precision_score(
            y_test,
            test_prob
        )
    except ValueError:
        pr_auc = np.nan


    print("\nResults:")

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


    results.append({
        "Test_Scenario": test_scenario,
        "Precision": precision,
        "Recall": recall,
        "F1": f1,
        "FPR": fpr,
        "ROC_AUC": roc_auc,
        "PR_AUC": pr_auc,
        "TN": tn,
        "FP": fp,
        "FN": fn,
        "TP": tp
    })


# ============================================================
# FINAL SUMMARY
# ============================================================

results_df = pd.DataFrame(results)

print("\n" + "=" * 70)
print("LEAVE-ONE-SCENARIO-OUT SUMMARY")
print("=" * 70)

print(
    results_df.to_string(index=False)
)

print("\nAverage metrics:")

print(
    results_df[
        [
            "Precision",
            "Recall",
            "F1",
            "FPR",
            "ROC_AUC",
            "PR_AUC"
        ]
    ].mean()
)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)