import pandas as pd
import numpy as np


INPUT_PATH = r"data\CTU13\all_network_states.csv"
OUTPUT_PATH = r"attack_progression.csv"


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(INPUT_PATH)

df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = (
    df.sort_values(["Scenario", "Timestamp"])
    .reset_index(drop=True)
)


# ============================================================
# FIND NEXT ATTACK
#
# IMPORTANT:
# ThreatCast target = attack within the NEXT 10 STATES.
# We therefore use state distance as the primary measure.
# ============================================================

df["Next_Attack_Time"] = pd.NaT
df["States_To_Next_Attack"] = np.nan
df["Minutes_To_Next_Attack"] = np.nan


for scenario in df["Scenario"].unique():

    scenario_df = (
        df[df["Scenario"] == scenario]
        .sort_values("Timestamp")
        .copy()
    )

    attack_indices = scenario_df.index[
        scenario_df["Attack_State"] == 1
    ].tolist()

    for current_position, index in enumerate(
        scenario_df.index
    ):

        future_attacks = [
            attack_index
            for attack_index in attack_indices
            if attack_index >= index
        ]

        if not future_attacks:
            continue

        next_attack_index = future_attacks[0]

        current_time = df.loc[index, "Timestamp"]
        attack_time = df.loc[
            next_attack_index,
            "Timestamp"
        ]

        # Position difference = number of states until attack
        states_to_attack = (
            scenario_df.index.get_loc(next_attack_index)
            - scenario_df.index.get_loc(index)
        )

        df.loc[
            index,
            "Next_Attack_Time"
        ] = attack_time

        df.loc[
            index,
            "States_To_Next_Attack"
        ] = states_to_attack

        df.loc[
            index,
            "Minutes_To_Next_Attack"
        ] = (
            attack_time - current_time
        ).total_seconds() / 60


# ============================================================
# PROGRESSION CLASSIFICATION
# ============================================================

def classify_progression(row):

    if row["Attack_State"] == 1:
        return "Attack State"

    if row["Target_Early_Warning"] == 1:

        states = row["States_To_Next_Attack"]

        if pd.notna(states):

            if states <= 2:
                return "Immediate Pre-Attack"

            elif states <= 6:
                return "Near-Term Early Warning"

            else:
                return "Early Warning"

        return "Early Warning"

    return "Normal Baseline"


df["Attack_Progression"] = df.apply(
    classify_progression,
    axis=1
)


# ============================================================
# EXPLANATION
# ============================================================

def create_explanation(row):

    stage = row["Attack_Progression"]

    if stage == "Normal Baseline":
        return (
            "Network activity is in a normal baseline state."
        )

    if stage == "Early Warning":
        return (
            "The current state is normal, but an attack "
            "is observed within the early-warning horizon."
        )

    if stage == "Near-Term Early Warning":
        return (
            "The network is approaching an attack state "
            "within the next few network states."
        )

    if stage == "Immediate Pre-Attack":
        return (
            "The network is immediately before an observed "
            "attack state."
        )

    if stage == "Attack State":
        return (
            "Attack-related network activity is currently "
            "observed in the CTU13 labels."
        )

    return "Unknown"


df["Progression_Explanation"] = df.apply(
    create_explanation,
    axis=1
)


# ============================================================
# OUTPUT
# ============================================================

columns = [
    "Scenario",
    "Timestamp",
    "Attack_Progression",
    "Attack_State",
    "Target_Early_Warning",
    "Next_Attack_Time",
    "States_To_Next_Attack",
    "Minutes_To_Next_Attack",
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
    "Progression_Explanation"
]

output_df = df[columns].copy()

output_df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("=" * 75)
print("THREATCAST - ATTACK PROGRESSION ANALYSIS")
print("=" * 75)

print()

print("Overall progression:")

print(
    output_df["Attack_Progression"]
    .value_counts()
    .to_string()
)


print()
print("-" * 75)

print("Early-warning validation:")

warnings = output_df[
    output_df["Target_Early_Warning"] == 1
].copy()

print(
    f"Warning states: {len(warnings)}"
)


valid = warnings[
    warnings["States_To_Next_Attack"].notna()
]

print(
    f"Valid warning states: {len(valid)}"
)


if not valid.empty:

    print(
        f"Minimum states to attack: "
        f"{valid['States_To_Next_Attack'].min():.0f}"
    )

    print(
        f"Maximum states to attack: "
        f"{valid['States_To_Next_Attack'].max():.0f}"
    )

    print(
        f"Mean states to attack: "
        f"{valid['States_To_Next_Attack'].mean():.2f}"
    )

    print(
        f"Median states to attack: "
        f"{valid['States_To_Next_Attack'].median():.2f}"
    )

    invalid = valid[
        (valid["States_To_Next_Attack"] < 1)
        |
        (valid["States_To_Next_Attack"] > 10)
    ]

    print()

    if invalid.empty:

        print("SANITY CHECK: PASS")

        print(
            "All warning states lead to an attack "
            "within the defined 10-state horizon."
        )

    else:

        print("SANITY CHECK: WARNING")

        print(
            f"Warning rows outside 10-state horizon: "
            f"{len(invalid)}"
        )


print()
print("-" * 75)

print("Example progression:")

example = output_df[
    output_df["Target_Early_Warning"] == 1
].head(5)

print(
    example[
        [
            "Scenario",
            "Timestamp",
            "Attack_Progression",
            "States_To_Next_Attack",
            "Minutes_To_Next_Attack",
            "Progression_Explanation"
        ]
    ].to_string(index=False)
)


print()
print("=" * 75)
print("Saved:", OUTPUT_PATH)
print("ATTACK PROGRESSION ANALYSIS COMPLETE")
print("=" * 75)