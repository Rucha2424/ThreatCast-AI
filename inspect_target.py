import pandas as pd

CSV_PATH = r"data\CTU13\all_network_states.csv"

df = pd.read_csv(CSV_PATH)
df["Timestamp"] = pd.to_datetime(df["Timestamp"])

print("=" * 70)
print("1. DATASET")
print("=" * 70)
print("Shape:", df.shape)
print("Columns:")
print(df.columns.tolist())


print("\n" + "=" * 70)
print("2. ATTACK_STATE VALUES")
print("=" * 70)

print(df["Attack_State"].value_counts(dropna=False))


print("\n" + "=" * 70)
print("3. ATTACK_FLOW_COUNT")
print("=" * 70)

print(df["Attack_Flow_Count"].describe())

print("\nAttack_Flow_Count > 0:")
print((df["Attack_Flow_Count"] > 0).value_counts())


print("\n" + "=" * 70)
print("4. ATTACK_STATE vs ATTACK_FLOW_COUNT")
print("=" * 70)

attack_by_count = df["Attack_Flow_Count"] > 0
attack_by_state = df["Attack_State"].astype(str).str.contains(
    "Botnet",
    case=False,
    na=False
)

comparison = pd.crosstab(
    attack_by_count,
    attack_by_state,
    rownames=["Attack_Flow_Count > 0"],
    colnames=["Attack_State contains Botnet"]
)

print(comparison)


print("\n" + "=" * 70)
print("5. TARGET_EARLY_WARNING")
print("=" * 70)

print(df["Target_Early_Warning"].value_counts())

print("\nTarget rate by scenario:")

target_summary = (
    df.groupby("Scenario")["Target_Early_Warning"]
    .agg(["count", "sum"])
)

target_summary["rate"] = (
    target_summary["sum"] / target_summary["count"]
)

print(target_summary)


print("\n" + "=" * 70)
print("6. VERIFY EVERY POSITIVE TARGET")
print("=" * 70)

mismatches = []

for scenario, group in df.groupby("Scenario"):
    group = group.sort_values("Timestamp").reset_index(drop=True)

    for i in range(len(group)):

        if group.loc[i, "Target_Early_Warning"] != 1:
            continue

        # Look at the next 10 states = 5 minutes
        future = group.iloc[i + 1:i + 11]

        future_attack_count = (
            future["Attack_Flow_Count"] > 0
        ).any()

        future_attack_state = (
            future["Attack_State"]
            .astype(str)
            .str.contains("Botnet", case=False, na=False)
            .any()
        )

        if not future_attack_count or not future_attack_state:

            mismatches.append({
                "Scenario": scenario,
                "Index": i,
                "Timestamp": group.loc[i, "Timestamp"],
                "Target": group.loc[i, "Target_Early_Warning"],
                "Current_Attack_Flow_Count":
                    group.loc[i, "Attack_Flow_Count"],
                "Current_Attack_State":
                    group.loc[i, "Attack_State"],
                "Future_Attack_By_Count":
                    future_attack_count,
                "Future_Attack_By_State":
                    future_attack_state,
            })


print("Positive targets checked:",
      int(df["Target_Early_Warning"].sum()))

print("Potential mismatches:",
      len(mismatches))


if mismatches:

    mismatch_df = pd.DataFrame(mismatches)

    print("\nFIRST 30 MISMATCHES:")
    print(mismatch_df.head(30).to_string(index=False))

    print("\nMISMATCHES BY SCENARIO:")
    print(
        mismatch_df["Scenario"]
        .value_counts()
        .sort_index()
    )

else:
    print("\nNo mismatches found.")


print("\n" + "=" * 70)
print("7. RAW POSITIVE TARGET EXAMPLES")
print("=" * 70)

positive = df[df["Target_Early_Warning"] == 1]

for scenario in positive["Scenario"].unique():

    print(f"\n--- Scenario {scenario} ---")

    sample = positive[
        positive["Scenario"] == scenario
    ].head(5)

    print(
        sample[
            [
                "Scenario",
                "Timestamp",
                "Flow_Count",
                "Attack_Flow_Count",
                "Attack_State",
                "Target_Early_Warning",
            ]
        ].to_string(index=False)
    )


print("\n" + "=" * 70)
print("DONE")
print("=" * 70)