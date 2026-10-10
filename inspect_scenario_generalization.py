import pandas as pd
import numpy as np

PATH = r"data\CTU13\all_network_states.csv"

df = pd.read_csv(PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


print("=" * 70)
print("SCENARIO GENERALIZATION ANALYSIS")
print("=" * 70)


# ============================================================
# 1. ATTACK / WARNING DISTRIBUTION
# ============================================================

summary = (
    df.groupby("Scenario")
    .agg(
        States=("Scenario", "size"),
        Attack_States=("Attack_State", "sum"),
        Warning_States=("Target_Early_Warning", "sum")
    )
)

summary["Attack_Rate"] = (
    summary["Attack_States"] /
    summary["States"]
)

summary["Warning_Rate"] = (
    summary["Warning_States"] /
    summary["States"]
)

print("\nSCENARIO SUMMARY")
print(summary)


# ============================================================
# 2. ATTACK-CONTAINING SCENARIOS
# ============================================================

attack_scenarios = summary[
    summary["Attack_States"] > 0
].index.tolist()

print("\nAttack-containing scenarios:")
print(attack_scenarios)


# ============================================================
# 3. POSITIVE WARNING FEATURE PROFILE
# ============================================================

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


print("\n" + "=" * 70)
print("WARNING FEATURE MEANS BY SCENARIO")
print("=" * 70)

for scenario in attack_scenarios:

    group = df[
        (df["Scenario"] == scenario) &
        (df["Target_Early_Warning"] == 1)
    ]

    if len(group) == 0:
        continue

    print(f"\n--- Scenario {scenario} ---")
    print("Warning states:", len(group))

    for feature in FEATURES:

        print(
            f"{feature:30s}: "
            f"{group[feature].mean():.4f}"
        )


# ============================================================
# 4. NORMAL VS WARNING PROFILE
# ============================================================

print("\n" + "=" * 70)
print("WARNING / NORMAL RATIO BY SCENARIO")
print("=" * 70)

for scenario in attack_scenarios:

    group = df[
        df["Scenario"] == scenario
    ]

    warning = group[
        group["Target_Early_Warning"] == 1
    ]

    normal = group[
        group["Target_Early_Warning"] == 0
    ]

    if len(warning) == 0:
        continue

    print(f"\n--- Scenario {scenario} ---")

    for feature in FEATURES:

        warning_mean = warning[feature].mean()
        normal_mean = normal[feature].mean()

        ratio = (
            warning_mean /
            (abs(normal_mean) + 1e-9)
        )

        print(
            f"{feature:30s}: "
            f"warning={warning_mean:12.3f} "
            f"normal={normal_mean:12.3f} "
            f"ratio={ratio:8.3f}"
        )


# ============================================================
# 5. CROSS-SCENARIO POSITIVE COUNTS
# ============================================================

print("\n" + "=" * 70)
print("POSITIVE EXAMPLES AVAILABLE FOR LEARNING")
print("=" * 70)

for scenario in range(1, 14):

    positives = int(
        df[
            df["Scenario"] == scenario
        ]["Target_Early_Warning"].sum()
    )

    attacks = int(
        df[
            df["Scenario"] == scenario
        ]["Attack_State"].sum()
    )

    print(
        f"Scenario {scenario:2d}: "
        f"attack states={attacks:4d}, "
        f"warning states={positives:3d}"
    )


# ============================================================
# 6. TRAINING-DIVERSITY EXPERIMENT
# ============================================================

print("\n" + "=" * 70)
print("TRAINING DIVERSITY")
print("=" * 70)

for test_scenario in attack_scenarios:

    train_scenarios = [
        s for s in attack_scenarios
        if s != test_scenario
    ]

    train = df[
        df["Scenario"].isin(train_scenarios)
    ]

    test = df[
        df["Scenario"] == test_scenario
    ]

    train_positive = int(
        train["Target_Early_Warning"].sum()
    )

    test_positive = int(
        test["Target_Early_Warning"].sum()
    )

    train_attack_states = int(
        train["Attack_State"].sum()
    )

    test_attack_states = int(
        test["Attack_State"].sum()
    )

    print(
        f"\nTest scenario {test_scenario}:"
    )

    print(
        "  Training scenarios:",
        train_scenarios
    )

    print(
        "  Training attack states:",
        train_attack_states
    )

    print(
        "  Training warning states:",
        train_positive
    )

    print(
        "  Test attack states:",
        test_attack_states
    )

    print(
        "  Test warning states:",
        test_positive
    )


print("\n" + "=" * 70)
print("DONE")
print("=" * 70)