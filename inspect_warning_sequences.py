import pandas as pd

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

df = pd.read_csv(CSV_PATH)
df["Timestamp"] = pd.to_datetime(df["Timestamp"])

df = df.sort_values(["Scenario", "Timestamp"]).reset_index(drop=True)

# Scenarios containing warning states
scenarios = [1, 3, 4, 5, 8, 12, 13]

for scenario in scenarios:

    s = df[df["Scenario"] == scenario].copy().reset_index(drop=True)

    warning_indices = s.index[
        s["Target_Early_Warning"] == 1
    ].tolist()

    print("\n" + "=" * 90)
    print(f"SCENARIO {scenario}")
    print(f"Total states: {len(s)}")
    print(f"Warning states: {len(warning_indices)}")
    print("=" * 90)

    for idx in warning_indices:

        print("\n" + "-" * 90)
        print(f"WARNING STATE INDEX: {idx}")
        print(f"Warning timestamp: {s.loc[idx, 'Timestamp']}")
        print("-" * 90)

        # Show 5 states before + warning state
        start = max(0, idx - 5)
        end = min(len(s), idx + 1)

        cols = [
            "Timestamp",
            "Flow_Count",
            "Total_Packets",
            "Total_Bytes",
            "Avg_Packets_Per_Flow",
            "Avg_Bytes_Per_Flow",
            "Flow_Count_Change",
            "Total_Packets_Change",
            "Total_Bytes_Change",
            "Target_Early_Warning",
        ]

        print(
            s.loc[start:end-1, cols]
            .to_string(index=True)
        )

        # Find first actual attack after this warning
        future = s.loc[idx + 1:]

        attack_rows = future[
            future["Attack_State"].astype(str).str.contains(
                "Botnet",
                case=False,
                na=False
            )
        ]

        if len(attack_rows) > 0:

            first_attack_idx = attack_rows.index[0]

            warning_time = s.loc[idx, "Timestamp"]
            attack_time = s.loc[first_attack_idx, "Timestamp"]

            delay = attack_time - warning_time

            print(
                f"\nFIRST ATTACK AFTER WARNING:"
                f"\n  Attack index: {first_attack_idx}"
                f"\n  Attack timestamp: {attack_time}"
                f"\n  Warning lead time: {delay}"
            )

        else:
            print("\nNo Botnet attack found after this warning.")

print("\n" + "=" * 90)
print("DONE")
print("=" * 90)