import pandas as pd
import numpy as np

PATH = r"data\CTU13\all_network_states.csv"

df = pd.read_csv(PATH)
df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(
    ["Scenario", "Timestamp"]
).reset_index(drop=True)


print("=" * 70)
print("ATTACK TIMELINE / EARLY WARNING ANALYSIS")
print("=" * 70)


# ============================================================
# 1. ATTACK STATES BY SCENARIO
# ============================================================

print("\nATTACK STATES BY SCENARIO")

for scenario, group in df.groupby("Scenario"):

    group = group.reset_index(drop=True)

    attack_indices = np.where(
        group["Attack_State"].values == 1
    )[0]

    print(
        f"\nScenario {scenario}: "
        f"{len(attack_indices)} attack states"
    )

    if len(attack_indices) == 0:
        continue

    # Find starts of attack periods
    starts = []

    for idx in attack_indices:

        if idx == 0 or group.loc[
            idx - 1, "Attack_State"
        ] == 0:

            starts.append(idx)

    print("Attack episode starts:", starts)

    for start in starts:

        print(
            "  Start:",
            group.loc[start, "Timestamp"],
            "| index:",
            start,
            "| Flow_Count:",
            group.loc[start, "Flow_Count"]
        )


# ============================================================
# 2. WARNING STATES AND DISTANCE TO NEXT ATTACK
# ============================================================

print("\n" + "=" * 70)
print("WARNING LEAD TIMES")
print("=" * 70)

records = []

for scenario, group in df.groupby("Scenario"):

    group = group.sort_values(
        "Timestamp"
    ).reset_index(drop=True)

    attack_indices = np.where(
        group["Attack_State"].values == 1
    )[0]

    for i in range(len(group)):

        if group.loc[
            i, "Target_Early_Warning"
        ] != 1:
            continue

        future_attacks = attack_indices[
            attack_indices > i
        ]

        if len(future_attacks) == 0:
            records.append({
                "Scenario": scenario,
                "Index": i,
                "Timestamp": group.loc[i, "Timestamp"],
                "States_To_Attack": None,
                "Minutes_To_Attack": None,
                "Valid_Future_Attack": False
            })
            continue

        next_attack = future_attacks[0]

        states_to_attack = next_attack - i

        records.append({
            "Scenario": scenario,
            "Index": i,
            "Timestamp": group.loc[i, "Timestamp"],
            "States_To_Attack": states_to_attack,
            "Minutes_To_Attack":
                states_to_attack * 0.5,
            "Valid_Future_Attack": True
        })


warnings = pd.DataFrame(records)

print(
    "\nTotal positive targets:",
    len(warnings)
)

print(
    "Positive targets with a future attack:",
    warnings["Valid_Future_Attack"].sum()
)

print(
    "Positive targets WITHOUT future attack:",
    (~warnings["Valid_Future_Attack"]).sum()
)


# ============================================================
# 3. LEAD-TIME DISTRIBUTION
# ============================================================

valid = warnings[
    warnings["Valid_Future_Attack"] == True
].copy()

if len(valid) > 0:

    print("\nStates before attack:")
    print(
        valid["States_To_Attack"]
        .value_counts()
        .sort_index()
    )

    print("\nMinutes before attack:")
    print(
        valid["Minutes_To_Attack"]
        .describe()
    )


# ============================================================
# 4. WARNING COUNT BY SCENARIO
# ============================================================

print("\n" + "=" * 70)
print("WARNING COUNT BY SCENARIO")
print("=" * 70)

if len(warnings) > 0:

    print(
        warnings.groupby("Scenario")
        .size()
        .sort_index()
    )


# ============================================================
# 5. ATTACK EPISODE SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("ATTACK EPISODES")
print("=" * 70)

episodes = []

for scenario, group in df.groupby("Scenario"):

    group = group.sort_values(
        "Timestamp"
    ).reset_index(drop=True)

    attack = group["Attack_State"].values

    starts = []

    for i in range(len(group)):

        if attack[i] == 1:

            if i == 0 or attack[i - 1] == 0:
                starts.append(i)

    for start in starts:

        end = start

        while (
            end + 1 < len(group)
            and attack[end + 1] == 1
        ):
            end += 1

        episodes.append({
            "Scenario": scenario,
            "Start_Index": start,
            "End_Index": end,
            "Duration_States": end - start + 1,
            "Duration_Minutes":
                (end - start + 1) * 0.5,
            "Start_Time":
                group.loc[start, "Timestamp"],
            "End_Time":
                group.loc[end, "Timestamp"],
        })


episodes_df = pd.DataFrame(episodes)

if len(episodes_df) > 0:

    print(
        episodes_df.to_string(index=False)
    )

else:

    print("No attack episodes found.")


print("\n" + "=" * 70)
print("DONE")
print("=" * 70)