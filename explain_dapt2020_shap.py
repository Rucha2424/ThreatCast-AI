import numpy as np
import pandas as pd
import shap
import tensorflow as tf
import pickle

from sklearn.model_selection import train_test_split


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_FILE = "dapt2020_lstm.keras"
SCALER_FILE = "dapt2020_lstm_scaler.pkl"

X_FILE = r"data\DAPT2020\X_sequences.npy"
Y_FILE = r"data\DAPT2020\y_sequences.npy"

OUTPUT_FILE = "dapt2020_shap_feature_importance.csv"

SEQUENCE_LENGTH = 5
NUM_FEATURES = 19

CLASS_NAMES = [
    "BENIGN",
    "DATA EXFILTRATION",
    "ESTABLISH FOOTHOLD",
    "LATERAL MOVEMENT",
    "RECONNAISSANCE"
]

FEATURE_NAMES = [
    "Flow_Count",
    "Total_Fwd_Packets",
    "Total_Bwd_Packets",
    "Total_Fwd_Bytes",
    "Total_Bwd_Bytes",
    "Avg_Flow_Duration",
    "Avg_Fwd_Packet_Length",
    "Avg_Bwd_Packet_Length",
    "Avg_Packet_Length",
    "Avg_Flow_Bytes_per_Sec",
    "Avg_Flow_Packets_per_Sec",
    "Avg_Fwd_Packets_per_Sec",
    "Avg_Bwd_Packets_per_Sec",
    "Avg_Flow_IAT",
    "Avg_Flow_IAT_Std",
    "Avg_Flow_IAT_Max",
    "Avg_Flow_IAT_Min",
    "SYN_Flag_Count",
    "RST_Flag_Count"
]


# ============================================================
# START
# ============================================================

print("=" * 70)
print("DAPT2020 - SHAP EXPLAINABILITY")
print("=" * 70)


# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading LSTM model...")

model = tf.keras.models.load_model(
    MODEL_FILE
)

print("Model loaded successfully.")

print(
    "Model input shape:",
    model.input_shape
)

print(
    "Model output shape:",
    model.output_shape
)


# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading sequence data...")

X_scaled = np.load(
    X_FILE
)

y = np.load(
    Y_FILE
)

print(
    "X shape:",
    X_scaled.shape
)

print(
    "y shape:",
    y.shape
)


# ============================================================
# LOAD DEPLOYMENT SCALER
# ============================================================

print("\nLoading scaler...")

with open(
    SCALER_FILE,
    "rb"
) as f:

    scaler = pickle.load(f)

print("Scaler loaded.")


# ============================================================
# CHECK DATA
# ============================================================

if X_scaled.ndim != 3:
    raise ValueError(
        "X must have shape "
        "(samples, timesteps, features)."
    )

if X_scaled.shape[1] != SEQUENCE_LENGTH:
    raise ValueError(
        f"Expected {SEQUENCE_LENGTH} timesteps, "
        f"got {X_scaled.shape[1]}"
    )

if X_scaled.shape[2] != NUM_FEATURES:
    raise ValueError(
        f"Expected {NUM_FEATURES} features, "
        f"got {X_scaled.shape[2]}"
    )

if len(y) != len(X_scaled):
    raise ValueError(
        "X and y sample counts do not match."
    )


# ============================================================
# RECOVER RAW VALUES
#
# The original sequence file was generated using the
# preprocessing scaler.
#
# Recover raw values first.
# Then apply the final deployment scaler used by the trained
# LSTM.
# ============================================================

print("\nRecovering original feature values...")

X_raw = scaler.inverse_transform(
    X_scaled.reshape(-1, NUM_FEATURES)
).reshape(
    X_scaled.shape
)

X_raw = X_raw.astype(np.float32)

print(
    "Raw X shape:",
    X_raw.shape
)


# ============================================================
# RE-SCALE FOR THE DEPLOYMENT MODEL
# ============================================================

print("\nScaling data for LSTM...")

X_model = scaler.transform(
    X_raw.reshape(-1, NUM_FEATURES)
).reshape(
    X_raw.shape
).astype(np.float32)

print(
    "Model input shape:",
    X_model.shape
)


# ============================================================
# IMPORTANT
#
# The scaler saved with the deployment model may already be
# the correct scaler for raw features.
#
# If the inverse/transform round-trip produces the original
# scaled data, continue normally.
# ============================================================

round_trip_error = np.mean(
    np.abs(
        X_model.astype(np.float64)
        - X_scaled.astype(np.float64)
    )
)

print(
    f"\nScaler round-trip mean absolute error: "
    f"{round_trip_error:.8f}"
)


# ============================================================
# SELECT EXPLANATION SAMPLES
#
# SHAP on thousands of LSTM sequences can be expensive.
#
# We use a representative subset.
# ============================================================

MAX_BACKGROUND = 50
MAX_EXPLAIN = 100

rng = np.random.default_rng(
    42
)

n_samples = len(X_model)

background_count = min(
    MAX_BACKGROUND,
    n_samples
)

explain_count = min(
    MAX_EXPLAIN,
    n_samples
)

background_indices = rng.choice(
    n_samples,
    size=background_count,
    replace=False
)

explain_indices = rng.choice(
    n_samples,
    size=explain_count,
    replace=False
)

background = X_model[
    background_indices
]

X_explain = X_model[
    explain_indices
]

y_explain = y[
    explain_indices
]


print(
    "\nSHAP background samples:",
    background.shape
)

print(
    "SHAP explanation samples:",
    X_explain.shape
)


# ============================================================
# MODEL PREDICTION CHECK
# ============================================================

print("\nGenerating model predictions...")

pred_prob = model.predict(
    X_explain,
    verbose=0
)

pred_class = np.argmax(
    pred_prob,
    axis=1
)

print(
    "Predictions generated."
)

print("\nPredicted class distribution:")

pred_counts = np.bincount(
    pred_class,
    minlength=len(CLASS_NAMES)
)

for class_id, count in enumerate(
    pred_counts
):

    print(
        f"{CLASS_NAMES[class_id]:25s}: "
        f"{count}"
    )


# ============================================================
# SHAP EXPLAINER
#
# GradientExplainer is appropriate for a differentiable
# TensorFlow/Keras neural network.
# ============================================================

print("\nCreating SHAP GradientExplainer...")

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
    X_explain
)

print(
    "SHAP calculation complete."
)


# ============================================================
# HANDLE SHAP OUTPUT FORMAT
#
# Depending on SHAP/TensorFlow versions, the output can be:
#
#   list[class] -> array(samples,time,features)
#
# or:
#
#   array(samples,time,features,classes)
# ============================================================

if isinstance(
    shap_values,
    list
):

    print(
        "SHAP output format: list"
    )

    # Each class has:
    # samples × timesteps × features

    class_arrays = []

    for class_id, values in enumerate(
        shap_values
    ):

        values = np.asarray(
            values
        )

        print(
            f"Class {class_id} "
            f"({CLASS_NAMES[class_id]}) "
            f"SHAP shape:",
            values.shape
        )

        class_arrays.append(
            values
        )

    # Convert:
    #
    # classes × samples × time × features
    #
    shap_array = np.stack(
        class_arrays,
        axis=-1
    )

else:

    print(
        "SHAP output format: array"
    )

    shap_array = np.asarray(
        shap_values
    )

    print(
        "SHAP array shape:",
        shap_array.shape
    )


# ============================================================
# NORMALIZE SHAP SHAPE
# ============================================================

print(
    "\nNormalizing SHAP dimensions..."
)

expected_without_classes = (
    explain_count,
    SEQUENCE_LENGTH,
    NUM_FEATURES
)

if shap_array.ndim != 4:

    raise ValueError(
        "Unexpected SHAP shape: "
        f"{shap_array.shape}"
    )


# Possible shape:
#
# samples × timesteps × features × classes
#
if (
    shap_array.shape[0] == explain_count
    and shap_array.shape[1] == SEQUENCE_LENGTH
    and shap_array.shape[2] == NUM_FEATURES
):

    shap_by_class = shap_array

# Possible shape:
#
# classes × samples × timesteps × features
#
elif (
    shap_array.shape[0] == len(CLASS_NAMES)
    and shap_array.shape[1] == explain_count
    and shap_array.shape[2] == SEQUENCE_LENGTH
    and shap_array.shape[3] == NUM_FEATURES
):

    shap_by_class = np.moveaxis(
        shap_array,
        0,
        -1
    )

else:

    raise ValueError(
        "Unable to interpret SHAP dimensions: "
        f"{shap_array.shape}"
    )


print(
    "Normalized SHAP shape:",
    shap_by_class.shape
)


# ============================================================
# GLOBAL FEATURE IMPORTANCE
#
# For each class:
#
# mean(|SHAP|)
#
# across:
#   samples
#   timesteps
#
# This gives the overall influence of each network feature.
# ============================================================

print(
    "\nCalculating global feature importance..."
)

rows = []


for class_id in range(
    len(CLASS_NAMES)
):

    class_shap = shap_by_class[
        :, :, :, class_id
    ]

    # Absolute SHAP
    absolute_shap = np.abs(
        class_shap
    )

    # Mean across samples and timesteps
    feature_importance = np.mean(
        absolute_shap,
        axis=(0, 1)
    )

    for feature_id in range(
        NUM_FEATURES
    ):

        rows.append({
            "Class_ID": class_id,
            "Class": CLASS_NAMES[class_id],
            "Feature": FEATURE_NAMES[feature_id],
            "Mean_Absolute_SHAP":
                float(
                    feature_importance[
                        feature_id
                    ]
                )
        })


# ============================================================
# CREATE DATAFRAME
# ============================================================

importance_df = pd.DataFrame(
    rows
)


# ============================================================
# OVERALL FEATURE IMPORTANCE
#
# Average feature importance across classes.
# ============================================================

overall_df = (
    importance_df
    .groupby("Feature")[
        "Mean_Absolute_SHAP"
    ]
    .mean()
    .reset_index()
    .sort_values(
        "Mean_Absolute_SHAP",
        ascending=False
    )
)

overall_df[
    "Rank"
] = np.arange(
    1,
    len(overall_df) + 1
)


# ============================================================
# PRINT OVERALL RESULTS
# ============================================================

print("\n" + "=" * 70)
print("GLOBAL DAPT2020 SHAP FEATURE IMPORTANCE")
print("=" * 70)

print(
    "\nFeatures ranked by mean absolute SHAP value:\n"
)

for _, row in overall_df.iterrows():

    print(
        f"{int(row['Rank']):2d}. "
        f"{row['Feature']:35s} "
        f"{row['Mean_Absolute_SHAP']:.8f}"
    )


# ============================================================
# CLASS-SPECIFIC RESULTS
# ============================================================

print("\n" + "=" * 70)
print("CLASS-SPECIFIC SHAP IMPORTANCE")
print("=" * 70)


for class_id in range(
    len(CLASS_NAMES)
):

    class_name = CLASS_NAMES[
        class_id
    ]

    class_df = (
        importance_df[
            importance_df["Class_ID"]
            == class_id
        ]
        .sort_values(
            "Mean_Absolute_SHAP",
            ascending=False
        )
        .head(10)
    )

    print(
        f"\n{class_name}:"
    )

    for _, row in class_df.iterrows():

        print(
            f"  {row['Feature']:35s} "
            f"{row['Mean_Absolute_SHAP']:.8f}"
        )


# ============================================================
# SAVE RESULTS
# ============================================================

importance_df.to_csv(
    OUTPUT_FILE,
    index=False
)

print(
    f"\nSaved detailed SHAP results to:"
)

print(
    OUTPUT_FILE
)


# ============================================================
# SAVE OVERALL RANKING
# ============================================================

overall_output = (
    "dapt2020_shap_overall.csv"
)

overall_df.to_csv(
    overall_output,
    index=False
)

print(
    "Saved overall SHAP ranking to:"
)

print(
    overall_output
)


# ============================================================
# SAVE SAMPLE PREDICTIONS
# ============================================================

prediction_df = pd.DataFrame({
    "Sample_Index": explain_indices,
    "Actual_Class_ID": y_explain,
    "Actual_Class": [
        CLASS_NAMES[int(v)]
        for v in y_explain
    ],
    "Predicted_Class_ID": pred_class,
    "Predicted_Class": [
        CLASS_NAMES[int(v)]
        for v in pred_class
    ],
    "Prediction_Confidence": np.max(
        pred_prob,
        axis=1
    )
})

prediction_output = (
    "dapt2020_shap_predictions.csv"
)

prediction_df.to_csv(
    prediction_output,
    index=False
)

print(
    "Saved SHAP prediction samples to:"
)

print(
    prediction_output
)


# ============================================================
# FINISH
# ============================================================

print("\n" + "=" * 70)
print("DAPT2020 SHAP EXPLAINABILITY COMPLETE")
print("=" * 70)

print(
    "\nGenerated files:"
)

print(
    "1.",
    OUTPUT_FILE
)

print(
    "2.",
    overall_output
)

print(
    "3.",
    prediction_output
)

print(
    "\nIMPORTANT:"
)

print(
    "SHAP importance shows which features influence "
    "the model's predictions."
)

print(
    "It does NOT prove that a feature is the causal "
    "reason for an attack."
)