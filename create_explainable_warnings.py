import pandas as pd
import numpy as np


# ============================================================
# THREATCAST - EXPLAINABLE WARNING OUTPUT
# ============================================================

SHAP_PATH = r"local_warning_explanations.csv"
PROGRESSION_PATH = r"attack_progression.csv"
MITRE_PATH = r"mitre_attack_mapping.csv"

OUTPUT_PATH = r"explainable_warning_output.csv"


# ============================================================
# LOAD
# ============================================================

print("=" * 75)
print("THREATCAST - EXPLAINABLE WARNING OUTPUT")
print("=" * 75)

shap_df = pd.read_csv(SHAP_PATH)
progression_df = pd.read_csv(PROGRESSION_PATH)
mitre_df = pd.read_csv(MITRE_PATH)


# ============================================================
# TIMESTAMPS
# ============================================================

shap_df["Timestamp"] = pd.to_datetime(
    shap_df["Timestamp"],
    errors="coerce"
)

progression_df["Timestamp"] = pd.to_datetime(
    progression_df["Timestamp"],
    errors="coerce"
)


# ============================================================
# ONLY MODEL-PREDICTED WARNINGS
# ============================================================

warning_df = shap_df[
    shap_df["Predicted_Warning"] == 1
].copy()

warning_df = warning_df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


print()
print(
    f"Model-predicted warning records: "
    f"{len(warning_df)}"
)


# ============================================================
# MERGE ACTUAL PROGRESSION
# ============================================================

progression_columns = [
    "Scenario",
    "Timestamp",
    "Attack_Progression",
    "Attack_State",
    "Target_Early_Warning",
    "Next_Attack_Time",
    "States_To_Next_Attack",
    "Minutes_To_Next_Attack",
    "Progression_Explanation"
]

progression_small = progression_df[
    progression_columns
].copy()


warning_df = warning_df.merge(
    progression_small,
    on=["Scenario", "Timestamp"],
    how="left"
)


# ============================================================
# CLASSIFY MODEL RESULT
# ============================================================

def classify_result(row):

    predicted = row["Predicted_Warning"]
    actual = row["Actual_Warning"]

    if predicted == 1 and actual == 1:
        return "True Positive"

    if predicted == 1 and actual == 0:
        return "False Positive"

    if predicted == 0 and actual == 1:
        return "False Negative"

    return "True Negative"


warning_df["Prediction_Result"] = warning_df.apply(
    classify_result,
    axis=1
)


# ============================================================
# MODEL-BASED SEVERITY
#
# Severity is based on MODEL CONFIDENCE, not future attack
# distance. This avoids mixing prediction with ground truth.
# ============================================================

def get_severity(probability):

    if probability >= 0.50:
        return "HIGH"

    if probability >= 0.20:
        return "MEDIUM"

    return "LOW"


warning_df["Warning_Severity"] = warning_df[
    "Prediction_Probability"
].apply(get_severity)


# ============================================================
# ACTUAL STATE DESCRIPTION
# ============================================================

def actual_status(row):

    if row["Actual_Warning"] == 1:
        return "Actual Early Warning"

    if row["Attack_State"] == 1:
        return "Actual Attack"

    return "Normal / No Ground-Truth Warning"


warning_df["Actual_Status"] = warning_df.apply(
    actual_status,
    axis=1
)


# ============================================================
# MITRE CONTEXT
# ============================================================

primary_mitre = mitre_df[
    mitre_df["Technique_ID"] == "T1071"
].copy()


if not primary_mitre.empty:

    mitre_row = primary_mitre.iloc[0]

    warning_df["MITRE_Tactic"] = (
        mitre_row["Tactic"]
    )

    warning_df["MITRE_Technique_ID"] = (
        mitre_row["Technique_ID"]
    )

    warning_df["MITRE_Technique"] = (
        mitre_row["Technique"]
    )

    warning_df["MITRE_Confidence"] = (
        mitre_row["Confidence"]
    )

else:

    warning_df["MITRE_Tactic"] = (
        "Command and Control"
    )

    warning_df["MITRE_Technique_ID"] = "T1071"

    warning_df["MITRE_Technique"] = (
        "Application Layer Protocol"
    )

    warning_df["MITRE_Confidence"] = (
        "Contextual"
    )


# ============================================================
# SHAP EXPLANATION
# ============================================================

def create_shap_text(row):

    features = []

    for i in range(1, 4):

        feature_col = f"Top_{i}_Feature"
        shap_col = f"Top_{i}_SHAP"
        direction_col = f"Top_{i}_Direction"

        if feature_col not in row.index:
            continue

        feature = row[feature_col]

        if pd.isna(feature):
            continue

        shap_value = row[shap_col]
        direction = row[direction_col]

        features.append(
            f"{feature} "
            f"({direction}, SHAP={shap_value:.4f})"
        )

    if not features:
        return "SHAP feature contribution unavailable."

    return (
        "Top model contributors: "
        + "; ".join(features)
        + "."
    )


warning_df["SHAP_Explanation"] = warning_df.apply(
    create_shap_text,
    axis=1
)


# ============================================================
# HUMAN-READABLE WARNING
# ============================================================

def create_explanation(row):

    probability = row["Prediction_Probability"]

    severity = row["Warning_Severity"]

    result = row["Prediction_Result"]

    actual_status_value = row["Actual_Status"]

    progression = row["Attack_Progression"]

    states = row["States_To_Next_Attack"]

    shap_text = row["SHAP_Explanation"]

    if pd.notna(states):

        distance_text = (
            f"The next observed attack is "
            f"{int(states)} network state(s) away."
        )

    else:

        distance_text = (
            "No future attack distance is available."
        )

    return (
        f"ThreatCast generated a {severity} model warning "
        f"with probability {probability:.3f}. "
        f"Prediction result: {result}. "
        f"Ground-truth status: {actual_status_value}. "
        f"Observed progression: {progression}. "
        f"{distance_text} "
        f"{shap_text}"
    )


warning_df["Explainable_Warning"] = warning_df.apply(
    create_explanation,
    axis=1
)


# ============================================================
# FINAL OUTPUT
# ============================================================

final_columns = [
    "Scenario",
    "Timestamp",
    "Prediction_Probability",
    "Warning_Severity",
    "Predicted_Warning",
    "Actual_Warning",
    "Prediction_Result",
    "Actual_Status",
    "Attack_Progression",
    "States_To_Next_Attack",
    "Minutes_To_Next_Attack",
    "Top_1_Feature",
    "Top_1_SHAP",
    "Top_1_Direction",
    "Top_2_Feature",
    "Top_2_SHAP",
    "Top_2_Direction",
    "Top_3_Feature",
    "Top_3_SHAP",
    "Top_3_Direction",
    "MITRE_Tactic",
    "MITRE_Technique_ID",
    "MITRE_Technique",
    "MITRE_Confidence",
    "Progression_Explanation",
    "SHAP_Explanation",
    "Explainable_Warning"
]


final_columns = [
    column
    for column in final_columns
    if column in warning_df.columns
]


output_df = warning_df[
    final_columns
].copy()


# ============================================================
# SAVE
# ============================================================

output_df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print()
print("-" * 75)

print("Prediction result:")

print(
    output_df[
        "Prediction_Result"
    ]
    .value_counts()
    .to_string()
)


print()
print("Severity distribution:")

print(
    output_df[
        "Warning_Severity"
    ]
    .value_counts()
    .to_string()
)


print()
print("Actual ground-truth status:")

print(
    output_df[
        "Actual_Status"
    ]
    .value_counts()
    .to_string()
)


print()
print("-" * 75)

print("MITRE context:")

print(
    output_df[
        [
            "MITRE_Technique_ID",
            "MITRE_Technique",
            "MITRE_Confidence"
        ]
    ]
    .drop_duplicates()
    .to_string(index=False)
)


print()
print("-" * 75)

print("Example explainable warning:")

if not output_df.empty:

    example = output_df.iloc[0]

    print(
        "Scenario:",
        example["Scenario"]
    )

    print(
        "Timestamp:",
        example["Timestamp"]
    )

    print(
        "Probability:",
        example["Prediction_Probability"]
    )

    print(
        "Severity:",
        example["Warning_Severity"]
    )

    print(
        "Prediction result:",
        example["Prediction_Result"]
    )

    print(
        "Actual status:",
        example["Actual_Status"]
    )

    print(
        "Progression:",
        example["Attack_Progression"]
    )

    print(
        "SHAP explanation:",
        example["SHAP_Explanation"]
    )

    print(
        "Full explanation:"
    )

    print(
        example["Explainable_Warning"]
    )


print()
print("=" * 75)
print("Saved:", OUTPUT_PATH)
print("EXPLAINABLE WARNING OUTPUT COMPLETE")
print("=" * 75)