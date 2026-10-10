import pandas as pd
import numpy as np

INPUT = r"data\CTU13\all_network_states.csv"
OUTPUT = r"data\CTU13\enhanced_network_states.csv"

# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(INPUT)
df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


# ============================================================
# BASE FEATURES
# ============================================================

BASE_FEATURES = [
    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow",
]


# ============================================================
# CREATE TEMPORAL FEATURES
# ============================================================

NEW_FEATURES = []

for feature in BASE_FEATURES:

    prev_col = f"{feature}_Prev"
    mean_col = f"{feature}_RollMean5"
    std_col = f"{feature}_RollStd5"
    ratio_col = f"{feature}_Ratio5"
    z_col = f"{feature}_Z5"

    # Previous state
    df[prev_col] = (
        df.groupby("Scenario")[feature]
        .shift(1)
    )

    # Initialize rolling columns
    df[mean_col] = np.nan
    df[std_col] = np.nan

    NEW_FEATURES.extend([
        prev_col,
        mean_col,
        std_col,
        ratio_col,
        z_col,
    ])


# ============================================================
# ROLLING HISTORY
# ONLY PREVIOUS 5 STATES ARE USED
# ============================================================

for scenario in df["Scenario"].unique():

    mask = df["Scenario"] == scenario

    scenario_data = df.loc[mask].copy()

    for feature in BASE_FEATURES:

        historical = scenario_data[feature].shift(1)

        mean_values = (
            historical
            .rolling(
                window=5,
                min_periods=2
            )
            .mean()
        )

        std_values = (
            historical
            .rolling(
                window=5,
                min_periods=2
            )
            .std()
        )

        df.loc[mask, f"{feature}_RollMean5"] = (
            mean_values.values
        )

        df.loc[mask, f"{feature}_RollStd5"] = (
            std_values.values
        )


# ============================================================
# RELATIVE FEATURES
# ============================================================

EPS = 1e-9

for feature in BASE_FEATURES:

    mean_col = f"{feature}_RollMean5"
    std_col = f"{feature}_RollStd5"

    ratio_col = f"{feature}_Ratio5"
    z_col = f"{feature}_Z5"

    # Current value / recent historical average
    df[ratio_col] = (
        df[feature] /
        (df[mean_col] + EPS)
    )

    # Current value relative to historical variation
    df[z_col] = (
        (df[feature] - df[mean_col]) /
        (df[std_col] + EPS)
    )


# ============================================================
# HANDLE NaN / INFINITY
# ============================================================

df = df.replace(
    [np.inf, -np.inf],
    np.nan
)


# ============================================================
# FILL MISSING TEMPORAL VALUES
# ============================================================

# Explicit mapping prevents the previous "Flow" bug.

for feature in BASE_FEATURES:

    temporal_columns = [
        f"{feature}_Prev",
        f"{feature}_RollMean5",
        f"{feature}_RollStd5",
        f"{feature}_Ratio5",
        f"{feature}_Z5",
    ]

    for column in temporal_columns:

        df[column] = df[column].fillna(
            df[feature]
        )

        df[column] = df[column].fillna(0)


# ============================================================
# LIMIT EXTREME VALUES
# ============================================================

for feature in BASE_FEATURES:

    df[f"{feature}_Ratio5"] = (
        df[f"{feature}_Ratio5"]
        .clip(lower=0, upper=10)
    )

    df[f"{feature}_Z5"] = (
        df[f"{feature}_Z5"]
        .clip(lower=-10, upper=10)
    )


# ============================================================
# FINAL VALIDATION
# ============================================================

print("=" * 70)
print("ENHANCED FEATURE DATASET")
print("=" * 70)

print("\nOriginal shape:")
print(pd.read_csv(INPUT).shape)

print("\nEnhanced shape:")
print(df.shape)

print("\nNumber of new temporal features:")
print(len(NEW_FEATURES))

print("\nTarget distribution:")
print(
    df["Target_Early_Warning"]
    .value_counts()
    .sort_index()
)

print("\nNaN count:")
print(df.isna().sum().sum())

print("\nInfinite values:")
print(
    np.isinf(
        df.select_dtypes(include=np.number)
    ).sum().sum()
)

print("\nScenario counts:")
print(
    df["Scenario"]
    .value_counts()
    .sort_index()
)

print("\nNew temporal features:")

for feature in NEW_FEATURES:
    print(" ", feature)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT,
    index=False
)

print("\nSaved to:")
print(OUTPUT)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)