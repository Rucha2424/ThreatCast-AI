import pandas as pd

FILE = r"E:\Projects\SIH\data\CTU13\all_network_states.csv"

df = pd.read_csv(FILE)

df["TimeWindow"] = pd.to_datetime(df["TimeWindow"])

df = df[
    df["Scenario"] == "scenario5"
].sort_values("TimeWindow").reset_index(drop=True)

df["Attack"] = (
    df["Attack_Flow_Count"] > 0
).astype(int)

HORIZON = 10

warning_rows = []

for i in range(len(df)):

    if df.loc[i, "Attack"] != 0:
        continue

    end = min(
        i + HORIZON + 1,
        len(df)
    )

    future = df.loc[
        i + 1:end - 1,
        "Attack"
    ]

    if future.sum() > 0:
        warning_rows.append(i)

print("=" * 70)
print("SCENARIO 5 — 5-MINUTE EARLY WARNING WINDOWS")
print("=" * 70)

print()
print("Total Scenario 5 states:", len(df))
print("Normal states:", int((df["Attack"] == 0).sum()))
print("Early-warning positive states:", len(warning_rows))

print()
print("WARNING WINDOWS:")

for i in warning_rows:

    print(
        df.loc[i, "TimeWindow"],
        "| Attack_Flow_Count =",
        df.loc[i, "Attack_Flow_Count"]
    )

print()
print("FIRST ATTACK WINDOW:")

attack_rows = df.index[
    df["Attack"] == 1
]

if len(attack_rows) > 0:

    first_attack = attack_rows[0]

    print(
        df.loc[first_attack, "TimeWindow"],
        "| Attack_Flow_Count =",
        df.loc[first_attack, "Attack_Flow_Count"]
    )

print()
print("DONE.")