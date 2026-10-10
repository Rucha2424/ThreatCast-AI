import pandas as pd
import numpy as np

CSV_PATH = r"data\CTU13\all_network_states.csv"

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

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]

df = pd.read_csv(CSV_PATH)

print("=" * 70)
print("DATASET")
print("=" * 70)

print("Shape:", df.shape)
print("Columns:")
print(df.columns.tolist())

print("\nScenario counts:")
print(df["Scenario"].value_counts().sort_index())

print("\nTarget counts by scenario:")
print(
    df.groupby("Scenario")["Target_Early_Warning"]
    .agg(["count", "sum", "mean"])
    .rename(columns={
        "count": "States",
        "sum": "Positive",
        "mean": "Positive_Rate"
    })
)

# ---------------------------------------------------------
# 1. FEATURE MEANS BY SCENARIO
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("FEATURE MEANS BY SCENARIO")
print("=" * 70)

means = df.groupby("Scenario")[FEATURES].mean()

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 220)

print(means.round(3).to_string())

# ---------------------------------------------------------
# 2. TRAIN VS TEST MEANS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("TRAIN VS TEST FEATURE MEANS")
print("=" * 70)

train_df = df[df["Scenario"].isin(TRAIN_SCENARIOS)]
test_df = df[df["Scenario"].isin(TEST_SCENARIOS)]

comparison = pd.DataFrame({
    "Train_Mean": train_df[FEATURES].mean(),
    "Test_Mean": test_df[FEATURES].mean(),
})

comparison["Test_vs_Train_Ratio"] = (
    comparison["Test_Mean"] /
    comparison["Train_Mean"].replace(0, np.nan)
)

print(comparison.round(3).to_string())

# ---------------------------------------------------------
# 3. MEDIANS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("TRAIN VS TEST MEDIANS")
print("=" * 70)

median_comparison = pd.DataFrame({
    "Train_Median": train_df[FEATURES].median(),
    "Test_Median": test_df[FEATURES].median(),
})

median_comparison["Test_vs_Train_Ratio"] = (
    median_comparison["Test_Median"] /
    median_comparison["Train_Median"].replace(0, np.nan)
)

print(median_comparison.round(3).to_string())

# ---------------------------------------------------------
# 4. MIN / MAX
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("TRAIN VS TEST RANGES")
print("=" * 70)

range_rows = []

for feature in FEATURES:
    range_rows.append({
        "Feature": feature,
        "Train_Min": train_df[feature].min(),
        "Train_Max": train_df[feature].max(),
        "Test_Min": test_df[feature].min(),
        "Test_Max": test_df[feature].max(),
    })

ranges = pd.DataFrame(range_rows)

print(ranges.round(3).to_string(index=False))

# ---------------------------------------------------------
# 5. STANDARDIZED DISTRIBUTION SHIFT
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("STANDARDIZED TRAIN VS TEST DIFFERENCE")
print("=" * 70)

shift_rows = []

for feature in FEATURES:
    train_mean = train_df[feature].mean()
    train_std = train_df[feature].std()

    if train_std == 0 or pd.isna(train_std):
        shift = np.nan
    else:
        shift = abs(test_df[feature].mean() - train_mean) / train_std

    shift_rows.append({
        "Feature": feature,
        "Absolute_Mean_Shift_in_Train_SD": shift
    })

shift = pd.DataFrame(shift_rows)

print(
    shift.sort_values(
        "Absolute_Mean_Shift_in_Train_SD",
        ascending=False
    ).round(3).to_string(index=False)
)

# ---------------------------------------------------------
# 6. SCENARIO 12/13 VS TRAIN
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SCENARIO 12 AND 13 SEPARATELY")
print("=" * 70)

for scenario in TEST_SCENARIOS:
    s = df[df["Scenario"] == scenario]

    print(f"\n--- Scenario {scenario} ---")
    print("States:", len(s))
    print(
        "Positive targets:",
        int(s["Target_Early_Warning"].sum())
    )
    print(
        "Positive rate:",
        round(s["Target_Early_Warning"].mean(), 4)
    )

    print("\nFeature means:")
    print(s[FEATURES].mean().round(3).to_string())

# ---------------------------------------------------------
# 7. CORRELATION WITH TARGET
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("FEATURE/TARGET CORRELATION")
print("=" * 70)

corr = (
    train_df[FEATURES + ["Target_Early_Warning"]]
    .corr()["Target_Early_Warning"]
    .drop("Target_Early_Warning")
    .sort_values(key=abs, ascending=False)
)

print(corr.round(3).to_string())

# ---------------------------------------------------------
# 8. FINAL SUMMARY
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)

print("Train scenarios:", TRAIN_SCENARIOS)
print("Validation scenarios:", VAL_SCENARIOS)
print("Test scenarios:", TEST_SCENARIOS)

print("\nTrain states:", len(train_df))
print("Train positives:", int(train_df["Target_Early_Warning"].sum()))

print("\nTest states:", len(test_df))
print("Test positives:", int(test_df["Target_Early_Warning"].sum()))

print("\nAnalysis complete.")