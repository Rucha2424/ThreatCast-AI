import pandas as pd
import numpy as np


# ============================================================
# CONFIG
# ============================================================

INPUT_PATH = r"data\CTU13\all_network_states.csv"
OUTPUT_PATH = r"data\CTU13\scenario_relative_network_states.csv"

BASE_FEATURES = [
    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow",
]

CHANGE_FEATURES = [
    "Flow_Count_Change",
    "Total_Packets_Change",
    "Total_Bytes_Change",
    "Total_Source_Bytes_Change",
    "Avg_Duration_Change",
]

WINDOW = 5


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("CREATING SCENARIO-RELATIVE FEATURES")
print("=" * 70)

df = pd.read_csv(INPUT_PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)

print("\nOriginal shape:", df.shape)


# ============================================================
# CREATE FEATURES SCENARIO BY SCENARIO
# ============================================================

feature_frames = []

for scenario, group in df.groupby(
    "Scenario",
    sort=False
):

    group = group.sort_values(
        "Timestamp"
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # IMPORTANT:
    # Shift first so rolling statistics contain ONLY PAST data.
    # The current state is never used to calculate its baseline.
    # --------------------------------------------------------

    for feature in BASE_FEATURES:

        past = group[feature].shift(1)

        rolling_mean = (
            past
            .rolling(
                WINDOW,
                min_periods=1
            )
            .mean()
        )

        rolling_std = (
            past
            .rolling(
                WINDOW,
                min_periods=2
            )
            .std()
        )

        rolling_std = rolling_std.fillna(0)

        # ----------------------------------------------------
        # Relative ratio
        # ----------------------------------------------------

        denominator = rolling_mean.replace(
            0,
            np.nan
        )

        ratio = (
            group[feature] /
            denominator
        )

        ratio = ratio.replace(
            [np.inf, -np.inf],
            np.nan
        )

        ratio = ratio.fillna(1.0)

        # ----------------------------------------------------
        # Difference from recent baseline
        # ----------------------------------------------------

        relative_change = (
            group[feature] -
            rolling_mean
        ) / (
            denominator.abs()
        )

        relative_change = relative_change.replace(
            [np.inf, -np.inf],
            np.nan
        )

        relative_change = relative_change.fillna(0.0)

        # ----------------------------------------------------
        # Z-score relative to recent history
        # ----------------------------------------------------

        safe_std = rolling_std.replace(
            0,
            np.nan
        )

        zscore = (
            group[feature] -
            rolling_mean
        ) / safe_std

        zscore = zscore.replace(
            [np.inf, -np.inf],
            np.nan
        )

        zscore = zscore.fillna(0.0)

        # ----------------------------------------------------
        # Clip extreme values
        # ----------------------------------------------------

        ratio = ratio.clip(
            -10,
            10
        )

        relative_change = relative_change.clip(
            -10,
            10
        )

        zscore = zscore.clip(
            -10,
            10
        )

        # ----------------------------------------------------
        # Store
        # ----------------------------------------------------

        group[
            feature + "_Recent_Ratio"
        ] = ratio

        group[
            feature + "_Recent_Relative_Change"
        ] = relative_change

        group[
            feature + "_Recent_ZScore"
        ] = zscore


    # ========================================================
    # CHANGE-FEATURE RELATIVE SIGNALS
    # ========================================================

    for feature in CHANGE_FEATURES:

        past = group[feature].shift(1)

        rolling_mean = (
            past
            .rolling(
                WINDOW,
                min_periods=1
            )
            .mean()
        )

        denominator = (
            rolling_mean.abs()
            .replace(0, np.nan)
        )

        relative = (
            group[feature] -
            rolling_mean
        ) / denominator

        relative = relative.replace(
            [np.inf, -np.inf],
            np.nan
        )

        relative = relative.fillna(0.0)

        relative = relative.clip(
            -10,
            10
        )

        group[
            feature + "_Recent_Relative"
        ] = relative


    feature_frames.append(group)


# ============================================================
# COMBINE
# ============================================================

enhanced = pd.concat(
    feature_frames,
    ignore_index=True
)

enhanced = enhanced.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


# ============================================================
# SAFETY CHECKS
# ============================================================

print("\nEnhanced shape:", enhanced.shape)

print(
    "New columns:",
    len(enhanced.columns) - len(df.columns)
)

nan_count = int(
    enhanced.isna().sum().sum()
)

infinite_count = int(
    np.isinf(
        enhanced.select_dtypes(
            include=[np.number]
        )
    ).sum().sum()
)

print(
    "NaN count:",
    nan_count
)

print(
    "Infinite values:",
    infinite_count
)


# ============================================================
# VERIFY TARGET WAS NOT CHANGED
# ============================================================

original_target = df[
    "Target_Early_Warning"
].values

new_target = enhanced[
    "Target_Early_Warning"
].values

target_same = np.array_equal(
    original_target,
    new_target
)

print(
    "Target unchanged:",
    target_same
)


# ============================================================
# VERIFY SCENARIO COUNTS
# ============================================================

print("\nStates per scenario:")

print(
    enhanced["Scenario"]
    .value_counts()
    .sort_index()
)


# ============================================================
# SAVE
# ============================================================

enhanced.to_csv(
    OUTPUT_PATH,
    index=False
)

print(
    "\nSaved to:",
    OUTPUT_PATH
)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)