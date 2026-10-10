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

OUTPUT_PATH = r"local_warning_explanations.csv"

SEQUENCE_LENGTH = 5

THRESHOLD = 0.08

TARGET = "Target_Early_Warning"

# We explain the final unseen test scenarios
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


# ============================================================
# LOAD
# ============================================================

print("=" * 70)
print("THREATCAST - LOCAL SHAP WARNING EXPLANATIONS")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

df["Timestamp"] = pd.to_datetime(
    df["Timestamp"]
)

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


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

            sequence = values[
                start:i + 1
            ]

            if len(sequence) < SEQUENCE_LENGTH:

                padding = np.zeros(
                    (
                        SEQUENCE_LENGTH - len(sequence),
                        len(FEATURES)
                    )
                )

                sequence = np.vstack(
                    [
                        padding,
                        sequence
                    ]
                )

            metadata.append({
                "Scenario": int(scenario),
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

            X.append(sequence)

    return (
        np.array(
            X,
            dtype=np.float32
        ),
        pd.DataFrame(metadata)
    )


# ============================================================
# TEST DATA
# ============================================================

test_df = df[
    df["Scenario"].isin(
        TEST_SCENARIOS
    )
].copy()

X_test, metadata = create_sequences(
    test_df
)

print(
    "\nTest sequences:",
    X_test.shape
)


# ============================================================
# PREDICTIONS
# ============================================================

print("\nGenerating predictions...")

probabilities = model.predict(
    X_test,
    verbose=0
).ravel()

predictions = (
    probabilities >= THRESHOLD
).astype(int)


# ============================================================
# FIND PREDICTED WARNINGS
# ============================================================

warning_indices = np.where(
    predictions == 1
)[0]

print(
    "Predicted warning states:",
    len(warning_indices)
)

print(
    "Actual warning states:",
    int(
        metadata["Target"].sum()
    )
)

if len(warning_indices) == 0:

    print(
        "\nNo warning predictions found."
    )

    print(
        "Try lowering THRESHOLD if necessary."
    )

    raise SystemExit


# ============================================================
# LIMIT NUMBER OF SHAP EXPLANATIONS
# ============================================================

# Explain at most 20 warning predictions.

MAX_EXPLANATIONS = 20

if len(warning_indices) > MAX_EXPLANATIONS:

    # Select the highest-confidence warnings
    sorted_indices = warning_indices[
        np.argsort(
            probabilities[
                warning_indices
            ]
        )[::-1]
    ]

    warning_indices = (
        sorted_indices[
            :MAX_EXPLANATIONS
        ]
    )


X_warning = X_test[
    warning_indices
]

metadata_warning = metadata.iloc[
    warning_indices
].reset_index(drop=True)


print(
    "Warnings selected for explanation:",
    len(X_warning)
)


# ============================================================
# SHAP BACKGROUND
# ============================================================

warnings.filterwarnings(
    "ignore"
)

rng = np.random.default_rng(
    42
)

BACKGROUND_SIZE = min(
    50,
    len(X_test)
)

background_indices = rng.choice(
    len(X_test),
    BACKGROUND_SIZE,
    replace=False
)

background = X_test[
    background_indices
]


# ============================================================
# CREATE SHAP EXPLAINER
# ============================================================

print(
    "\nCreating SHAP explainer..."
)

explainer = shap.GradientExplainer(
    model,
    background
)

print(
    "SHAP explainer created."
)


# ============================================================
# CALCULATE LOCAL SHAP VALUES
# ============================================================

print(
    "\nCalculating local SHAP values..."
)

shap_values = explainer.shap_values(
    X_warning
)


# ============================================================
# HANDLE SHAP OUTPUT
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

if shap_values.ndim == 4:

    shap_values = shap_values[
        ..., 0
    ]

print(
    "Processed SHAP shape:",
    shap_values.shape
)


# ============================================================
# BUILD EXPLANATIONS
# ============================================================

rows = []

print(
    "\n" + "=" * 70
)

print(
    "LOCAL WARNING EXPLANATIONS"
)

print(
    "=" * 70
)


for sample_index in range(
    len(X_warning)
):

    original_index = (
        warning_indices[
            sample_index
        ]
    )

    scenario = metadata_warning.loc[
        sample_index,
        "Scenario"
    ]

    timestamp = metadata_warning.loc[
        sample_index,
        "Timestamp"
    ]

    actual_target = metadata_warning.loc[
        sample_index,
        "Target"
    ]

    probability = probabilities[
        original_index
    ]

    # --------------------------------------------------------
    # SHAP values:
    #
    # time × features
    #
    # Aggregate across the 5 time steps.
    # --------------------------------------------------------

    sample_shap = shap_values[
        sample_index
    ]

    feature_shap = sample_shap.mean(
        axis=0
    )

    absolute_shap = np.abs(
        feature_shap
    )

    ranked_indices = np.argsort(
        absolute_shap
    )[::-1]

    top_indices = ranked_indices[
        :3
    ]


    print(
        f"\nScenario {scenario}"
    )

    print(
        f"Timestamp : {timestamp}"
    )

    print(
        f"Probability: {probability:.4f}"
    )

    print(
        f"Actual warning: {actual_target}"
    )

    print(
        "Top contributing features:"
    )


    explanation_parts = []


    for rank, feature_index in enumerate(
        top_indices,
        start=1
    ):

        feature = FEATURES[
            feature_index
        ]

        contribution = feature_shap[
            feature_index
        ]

        magnitude = abs(
            contribution
        )

        if contribution >= 0:

            direction = (
                "increased warning probability"
            )

        else:

            direction = (
                "decreased warning probability"
            )


        print(
            f"  {rank}. "
            f"{feature}: "
            f"{contribution:+.6f} "
            f"({direction})"
        )


        explanation_parts.append(
            f"{feature} "
            f"({'+' if contribution >= 0 else '-'})"
        )


    # --------------------------------------------------------
    # SAVE TOP 3
    # --------------------------------------------------------

    row = {
        "Scenario": scenario,
        "Timestamp": timestamp,
        "Prediction_Probability": probability,
        "Predicted_Warning": 1,
        "Actual_Warning": actual_target
    }


    for rank, feature_index in enumerate(
        top_indices,
        start=1
    ):

        feature = FEATURES[
            feature_index
        ]

        contribution = feature_shap[
            feature_index
        ]

        row[
            f"Top_{rank}_Feature"
        ] = feature

        row[
            f"Top_{rank}_SHAP"
        ] = contribution

        row[
            f"Top_{rank}_Direction"
        ] = (
            "toward_warning"
            if contribution >= 0
            else "away_from_warning"
        )


    rows.append(
        row
    )


# ============================================================
# SAVE
# ============================================================

results_df = pd.DataFrame(
    rows
)

results_df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print(
    "\n" + "=" * 70
)

print(
    "EXPLANATION SUMMARY"
)

print(
    "=" * 70
)

print(
    f"Explained warnings: "
    f"{len(results_df)}"
)

print(
    "\nOutput columns:"
)

for column in results_df.columns:

    print(
        " -",
        column
    )


print(
    "\nSaved:",
    OUTPUT_PATH
)

print(
    "\n" + "=" * 70
)

print(
    "LOCAL SHAP ANALYSIS COMPLETE"
)

print(
    "=" * 70
)