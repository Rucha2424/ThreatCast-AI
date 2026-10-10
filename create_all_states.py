import os
import numpy as np
import pandas as pd


# ============================================================
# CONFIG
# ============================================================

BASE_DIR = r"E:\Projects\SIH\data\CTU13"

SCENARIOS = {
    "scenario1": "capture20110810.binetflow",
    "scenario2": "capture20110811.binetflow",
    "scenario3": "capture20110812.binetflow",
    "scenario4": "capture20110815.binetflow",
    "scenario5": "capture20110815-2.binetflow",
}

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "all_network_states.csv"
)

WINDOW_SECONDS = 30


# ============================================================
# CREATE STATES FOR ONE SCENARIO
# ============================================================

def create_states(scenario_name, filename):

    input_file = os.path.join(
        BASE_DIR,
        scenario_name,
        filename
    )

    print("\n" + "=" * 70)
    print(f"PROCESSING {scenario_name.upper()}")
    print("=" * 70)

    print("File:", input_file)

    df = pd.read_csv(input_file)

    print("Raw flows:", len(df))

    # --------------------------------------------------------
    # Clean column names
    # --------------------------------------------------------

    df.columns = df.columns.str.strip()

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    df["StartTime"] = pd.to_datetime(
        df["StartTime"],
        errors="coerce"
    )

    df = df.dropna(
        subset=["StartTime"]
    ).copy()

    df = df.sort_values(
        "StartTime"
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Numeric columns
    # --------------------------------------------------------

    numeric_columns = [
        "Dur",
        "Sport",
        "Dport",
        "sTos",
        "dTos",
        "TotPkts",
        "TotBytes",
        "SrcBytes",
    ]

    for col in numeric_columns:
        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )

    df[numeric_columns] = df[
        numeric_columns
    ].replace(
        [np.inf, -np.inf],
        np.nan
    )

    # --------------------------------------------------------
    # 30-second windows
    # --------------------------------------------------------

    df["TimeWindow"] = (
        df["StartTime"]
        .dt.floor(f"{WINDOW_SECONDS}s")
    )

    # --------------------------------------------------------
    # Attack definition
    #
    # Any CTU13 Botnet flow = attack
    #
    # This lets us use multiple scenarios for training.
    # --------------------------------------------------------

    df["IsAttack"] = (
        df["Label"]
        .astype(str)
        .str.contains(
            "Botnet",
            case=False,
            na=False
        )
        .astype(int)
    )

    # --------------------------------------------------------
    # Aggregate
    # --------------------------------------------------------

    states = []

    for timestamp, group in df.groupby(
        "TimeWindow",
        sort=True
    ):

        flow_count = len(group)

        total_packets = group[
            "TotPkts"
        ].sum()

        total_bytes = group[
            "TotBytes"
        ].sum()

        total_source_bytes = group[
            "SrcBytes"
        ].sum()

        avg_duration = group[
            "Dur"
        ].mean()

        avg_packets_per_flow = (
            total_packets / flow_count
            if flow_count > 0
            else 0
        )

        avg_bytes_per_flow = (
            total_bytes / flow_count
            if flow_count > 0
            else 0
        )

        attack_flow_count = int(
            group["IsAttack"].sum()
        )

        attack_ratio = (
            attack_flow_count / flow_count
            if flow_count > 0
            else 0
        )

        states.append({
            "Scenario": scenario_name,
            "TimeWindow": timestamp,

            "Flow_Count": flow_count,

            "Total_Packets": total_packets,

            "Total_Bytes": total_bytes,

            "Total_Source_Bytes":
                total_source_bytes,

            "Avg_Duration":
                avg_duration,

            "Avg_Packets_Per_Flow":
                avg_packets_per_flow,

            "Avg_Bytes_Per_Flow":
                avg_bytes_per_flow,

            # Target construction only
            "Attack_Flow_Count":
                attack_flow_count,

            "Attack_Ratio":
                attack_ratio,
        })

    states = pd.DataFrame(states)

    # --------------------------------------------------------
    # Clean aggregate values
    # --------------------------------------------------------

    states = states.replace(
        [np.inf, -np.inf],
        np.nan
    )

    states = states.fillna(0)

    # --------------------------------------------------------
    # Change features
    #
    # IMPORTANT:
    # Calculate changes INSIDE each scenario only.
    # --------------------------------------------------------

    states["Flow_Count_Change"] = (
        states["Flow_Count"].diff()
    )

    states["Total_Packets_Change"] = (
        states["Total_Packets"].diff()
    )

    states["Total_Bytes_Change"] = (
        states["Total_Bytes"].diff()
    )

    states["Total_Source_Bytes_Change"] = (
        states["Total_Source_Bytes"].diff()
    )

    states["Avg_Duration_Change"] = (
        states["Avg_Duration"].diff()
    )

    change_columns = [
        "Flow_Count_Change",
        "Total_Packets_Change",
        "Total_Bytes_Change",
        "Total_Source_Bytes_Change",
        "Avg_Duration_Change",
    ]

    states[change_columns] = (
        states[change_columns]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    # --------------------------------------------------------
    # NEXT ATTACK TARGET
    #
    # Current state -> next state attack?
    # --------------------------------------------------------

    states["Target_Next_Attack"] = (
        states["Attack_Flow_Count"]
        .shift(-1)
        .gt(0)
        .astype(int)
    )

    # Last state has no future state
    states = states.iloc[:-1].copy()

    print("Network states:", len(states))

    print(
        "Attack states:",
        int(
            (states["Attack_Flow_Count"] > 0)
            .sum()
        )
    )

    print(
        "Next-attack targets:",
        states["Target_Next_Attack"]
        .value_counts()
        .sort_index()
        .to_dict()
    )

    return states


# ============================================================
# PROCESS ALL SCENARIOS
# ============================================================

all_states = []

for scenario, filename in SCENARIOS.items():

    states = create_states(
        scenario,
        filename
    )

    all_states.append(states)


# ============================================================
# COMBINE
# ============================================================

combined = pd.concat(
    all_states,
    ignore_index=True
)


# ============================================================
# SORT
#
# Scenario remains available so we never confuse
# scenario boundaries.
# ============================================================

combined = combined.sort_values(
    ["Scenario", "TimeWindow"]
).reset_index(drop=True)


# ============================================================
# SAVE
# ============================================================

combined.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# FINAL REPORT
# ============================================================

print("\n" + "=" * 70)
print("ALL NETWORK STATES CREATED")
print("=" * 70)

print(
    "\nOutput:",
    OUTPUT_FILE
)

print(
    "\nTotal states:",
    len(combined)
)

print("\nStates by scenario:")

print(
    combined["Scenario"]
    .value_counts()
    .sort_index()
)

print("\nTarget distribution:")

print(
    combined["Target_Next_Attack"]
    .value_counts()
    .sort_index()
)

print("\nColumns:")

for i, column in enumerate(
    combined.columns
):
    print(
        f"{i}: {column}"
    )

print("\nSaved successfully.")
