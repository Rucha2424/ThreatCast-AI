import pandas as pd

FILE = r"E:\Projects\SIH\data\CTU13\all_network_states.csv"

df = pd.read_csv(FILE)

df["TimeWindow"] = pd.to_datetime(df["TimeWindow"])

df = df.sort_values(
    ["Scenario", "TimeWindow"]
).reset_index(drop=True)

df["Attack"] = (
    df["Attack_Flow_Count"] > 0
).astype(int)


print("=" * 60)
print("PRE-ATTACK WARNING HORIZON ANALYSIS")
print("=" * 60)

print("\nHorizon:")
print("1  = next 30 seconds")
print("2  = next 1 minute")
print("4  = next 2 minutes")
print("6  = next 3 minutes")
print("10 = next 5 minutes")


for horizon in [1, 2, 4, 6, 10]:

    total_normal = 0
    positive_warning = 0

    print("\n" + "-" * 60)
    print(f"HORIZON = {horizon}")

    for scenario in df["Scenario"].unique():

        part = df[
            df["Scenario"] == scenario
        ].sort_values("TimeWindow").reset_index(drop=True)

        normal_count = 0
        warning_count = 0

        for i in range(len(part)):

            # Only currently-normal windows are eligible
            if part.loc[i, "Attack"] != 0:
                continue

            normal_count += 1

            future_end = min(
                i + horizon + 1,
                len(part)
            )

            future_attacks = part.loc[
                i + 1:future_end - 1,
                "Attack"
            ]

            if future_attacks.sum() > 0:
                warning_count += 1

        total_normal += normal_count
        positive_warning += warning_count

        print(
            f"{scenario}: "
            f"{warning_count} positive / "
            f"{normal_count} normal"
        )

    print(
        f"TOTAL: {positive_warning} positive / "
        f"{total_normal} normal"
    )