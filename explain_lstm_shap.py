import os
import warnings

import numpy as np
import pandas as pd
import joblib
import shap

from tensorflow.keras.models import load_model


# ============================================================
# CONFIG
# ============================================================

DATA_PATH = r"data\CTU13\all_network_states.csv"

MODEL_PATH = r"lstm_early_warning_multiscenario.keras"

SCALER_PATH = r"lstm_early_warning_scaler.pkl"

OUTPUT_CSV = r"shap_feature_importance.csv"

SEQUENCE_LENGTH = 5

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
# LOAD DATA
# ============================================================

print("=" * 70)
print("THREATCAST - LSTM SHAP EXPLAINABILITY")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(
    df["Timestamp"]
)

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


# ============================================================
# LOAD MODEL + SCALER
# ============================================================

print("\nLoading model...")

model = load_model(
    MODEL_PATH
)

scaler = joblib.load(
    SCALER_PATH
)

print("Model loaded.")
print("Scaler loaded.")


# ============================================================
# CREATE SEQUENCES
# ============================================================

def create_sequences(dataframe):

    X = []
    metadata = []

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

            metadata.append({
                "Scenario": scenario,
                "Timestamp": group.loc[
                    i,
                    "Timestamp"
                ],
                "Target": int(
                    group.loc[
                        i,
                        TARGET
                    ]
                )
            })

    return (
        np.array(
            X,
            dtype=np.float32
        ),
        pd.DataFrame(metadata)
    )


# ============================================================
# BUILD DATA
# ============================================================

X, metadata = create_sequences(
    df
)

print(
    "\nSequence shape:",
    X.shape
)

print(
    "Total sequences:",
    len(X)
)


# ============================================================
# SELECT IMPORTANT SAMPLES
# ============================================================

# We explain:
# 1. Warning states
# 2. A sample of normal states
#
# This keeps SHAP computation manageable.

warning_indices = np.where(
    metadata["Target"].values == 1
)[0]

normal_indices = np.where(
    metadata["Target"].values == 0
)[0]


rng = np.random.default_rng(
    42
)

MAX_WARNING = 50
MAX_NORMAL = 100

if len(warning_indices) > MAX_WARNING:

    warning_indices = rng.choice(
        warning_indices,
        MAX_WARNING,
        replace=False
    )

if len(normal_indices) > MAX_NORMAL:

    normal_indices = rng.choice(
        normal_indices,
        MAX_NORMAL,
        replace=False
    )


selected_indices = np.concatenate(
    [
        warning_indices,
        normal_indices
    ]
)


X_selected = X[
    selected_indices
]

metadata_selected = metadata.iloc[
    selected_indices
].reset_index(drop=True)


print(
    "\nSelected samples:",
    len(X_selected)
)

print(
    "Warning samples:",
    int(
        metadata_selected[
            "Target"
        ].sum()
    )
)

print(
    "Normal samples:",
    len(
        metadata_selected
    )
    -
    int(
        metadata_selected[
            "Target"
        ].sum()
    )
)


# ============================================================
# SHAP EXPLAINER
# ============================================================

print("\nCreating SHAP explainer...")

warnings.filterwarnings(
    "ignore"
)

background_count = min(
    50,
    len(X)
)

background_indices = rng.choice(
    len(X),
    background_count,
    replace=False
)

background = X[
    background_indices
]


explainer = shap.GradientExplainer(
    model,
    background
)

print(
    "SHAP explainer created."
)


# ============================================================
# CALCULATE SHAP VALUES
# ============================================================

print("\nCalculating SHAP values...")

shap_values = explainer.shap_values(
    X_selected
)


# ============================================================
# HANDLE SHAP OUTPUT FORMAT
# ============================================================

if isinstance(
    shap_values,
    list
):

    shap_values = shap_values[0]

shap_values = np.asarray(
    shap_values
)

print(
    "Raw SHAP shape:",
    shap_values.shape
)


# Some SHAP/TensorFlow versions may return
# an additional output dimension.

if shap_values.ndim == 4:

    shap_values = shap_values[
        ..., 0
    ]


print(
    "Processed SHAP shape:",
    shap_values.shape
)


# ============================================================
# AGGREGATE OVER TIME
# ============================================================

# X shape:
#
# samples × time × features
#
# We calculate the absolute SHAP contribution
# for each feature across all 5 time steps.

absolute_shap = np.abs(
    shap_values
)

feature_importance = (
    absolute_shap
    .mean(axis=(0, 1))
)


# ============================================================
# CREATE IMPORTANCE TABLE
# ============================================================

importance_df = pd.DataFrame({
    "Feature": FEATURES,
    "Mean_Absolute_SHAP": feature_importance
})

importance_df = (
    importance_df
    .sort_values(
        "Mean_Absolute_SHAP",
        ascending=False
    )
    .reset_index(drop=True)
)


# ============================================================
# NORMALIZED IMPORTANCE
# ============================================================

total_importance = (
    importance_df[
        "Mean_Absolute_SHAP"
    ].sum()
)

if total_importance > 0:

    importance_df[
        "Relative_Importance"
    ] = (
        importance_df[
            "Mean_Absolute_SHAP"
        ]
        /
        total_importance
    )


# ============================================================
# PRINT RESULTS
# ============================================================

print("\n" + "=" * 70)
print("GLOBAL SHAP FEATURE IMPORTANCE")
print("=" * 70)

print(
    importance_df.to_string(
        index=False
    )
)


# ============================================================
# SAVE
# ============================================================

importance_df.to_csv(
    OUTPUT_CSV,
    index=False
)

print(
    "\nSaved:",
    OUTPUT_CSV
)


# ============================================================
# TOP FEATURES
# ============================================================

print("\n" + "=" * 70)
print("TOP 5 FEATURES")
print("=" * 70)

for i, row in importance_df.head(
    5
).iterrows():

    print(
        f"{i + 1}. "
        f"{row['Feature']} "
        f"-> "
        f"{row['Mean_Absolute_SHAP']:.6f}"
    )


print("\n" + "=" * 70)
print("SHAP ANALYSIS COMPLETE")
print("=" * 70)