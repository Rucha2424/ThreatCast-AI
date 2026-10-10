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

TRAIN = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL = [4, 5]
TEST = [12, 13]

df = pd.read_csv(CSV_PATH)

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 220)

def analyze(name, scenarios):

    data = df[df["Scenario"].isin(scenarios)].copy()

    normal = data[data["Target_Early_Warning"] == 0]
    warning = data[data["Target_Early_Warning"] == 1]

    print("\n" + "=" * 80)
    print(name)
    print("=" * 80)

    print("Scenarios:", scenarios)
    print("States:", len(data))
    print("Normal:", len(normal))
    print("Warning:", len(warning))

    if len(warning) == 0:
        print("No warning states.")
        return

    rows = []

    for feature in FEATURES:

        normal_mean = normal[feature].mean()
        warning_mean = warning[feature].mean()

        normal_median = normal[feature].median()
        warning_median = warning[feature].median()

        normal_std = normal[feature].std()

        if normal_std == 0 or pd.isna(normal_std):
            effect = np.nan
        else:
            effect = (
                warning_mean - normal_mean
            ) / normal_std

        rows.append({
            "Feature": feature,
            "Normal_Mean": normal_mean,
            "Warning_Mean": warning_mean,
            "Normal_Median": normal_median,
            "Warning_Median": warning_median,
            "Difference": warning_mean - normal_mean,
            "Effect_Size": effect
        })

    result = pd.DataFrame(rows)

    print("\nFeature comparison:")
    print(result.round(3).to_string(index=False))

    print("\nLargest absolute effects:")

    print(
        result.assign(
            Abs_Effect=lambda x: x["Effect_Size"].abs()
        )
        .sort_values("Abs_Effect", ascending=False)
        [["Feature", "Effect_Size"]]
        .round(3)
        .to_string(index=False)
    )


analyze("TRAIN", TRAIN)
analyze("VALIDATION", VAL)
analyze("TEST", TEST)

print("\n" + "=" * 80)
print("WARNING STATES BY SCENARIO")
print("=" * 80)

warning_counts = (
    df.groupby("Scenario")["Target_Early_Warning"]
    .agg(
        States="count",
        Warning_States="sum"
    )
)

warning_counts["Warning_Rate"] = (
    warning_counts["Warning_States"] /
    warning_counts["States"]
)

print(warning_counts.round(4).to_string())

print("\nAnalysis complete.")