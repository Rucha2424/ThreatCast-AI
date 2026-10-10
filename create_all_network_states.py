import os
import glob
import pandas as pd
import numpy as np

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = r"E:\Projects\SIH\data\CTU13"
OUTPUT_FILE = os.path.join(BASE_DIR, "all_network_states.csv")

SCENARIOS = list(range(1, 14))

WINDOW_SECONDS = 30
WARNING_HORIZON_WINDOWS = 10   # 10 x 30 sec = 5 minutes


# ============================================================
# FEATURES
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


# ============================================================
# FIND BINETFLOW FILE
# ============================================================

def find_binetflow_file(scenario_number):

    scenario_dir = os.path.join(
        BASE_DIR,
        f"scenario{scenario_number}"
    )

    files = glob.glob(
        os.path.join(scenario_dir, "*.binetflow")
    )

    if len(files) == 0:
        raise FileNotFoundError(
            f"No .binetflow file found in {scenario_dir}"
        )

    if len(files) > 1:
        print(
            f"WARNING: Multiple .binetflow files found in "
            f"scenario{scenario_number}. Using first one."
        )

    return files[0]


# ============================================================
# PROCESS ONE SCENARIO
# ============================================================

def process_scenario(scenario_number):

    file_path = find_binetflow_file(scenario_number)

    print()
    print("=" * 70)
    print(f"PROCESSING SCENARIO {scenario_number}")
    print(f"FILE: {os.path.basename(file_path)}")
    print("=" * 70)

    # --------------------------------------------------------
    # Read CTU13 NetFlow file
    # --------------------------------------------------------

    df = pd.read_csv(
        file_path,
        sep=",",
        low_memory=False
    )

    print(f"Original flows: {len(df):,}")

    # --------------------------------------------------------
    # Required columns
    # --------------------------------------------------------

    required_columns = [
        "StartTime",
        "Dur",
        "TotPkts",
        "TotBytes",
        "SrcBytes",
        "Label",
    ]

    missing = [
        col for col in required_columns
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Scenario {scenario_number} is missing columns: {missing}"
        )

    # --------------------------------------------------------
    # Convert data types
    # --------------------------------------------------------

    df["StartTime"] = pd.to_datetime(
        df["StartTime"],
        errors="coerce"
    )

    numeric_columns = [
        "Dur",
        "TotPkts",
        "TotBytes",
        "SrcBytes",
    ]

    for col in numeric_columns:
        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )

    # Remove invalid timestamps
    df = df.dropna(subset=["StartTime"]).copy()

    # Replace missing numeric values
    for col in numeric_columns:
        df[col] = df[col].fillna(0)

    # --------------------------------------------------------
    # Attack flow
    # --------------------------------------------------------

    df["Is_Attack"] = (
        df["Label"]
        .astype(str)
        .str.contains("Botnet", case=False, na=False)
        .astype(int)
    )

    print(
        f"Attack flows: {df['Is_Attack'].sum():,}"
    )

    # --------------------------------------------------------
    # Create 30-second windows
    #
    # IMPORTANT:
    # Each scenario is processed independently.
    # Therefore sequences/targets never cross scenarios.
    # --------------------------------------------------------

    scenario_start = df["StartTime"].min()

    df["Window_Index"] = (
        (
            df["StartTime"] - scenario_start
        ).dt.total_seconds()
        // WINDOW_SECONDS
    ).astype(int)

    # --------------------------------------------------------
    # Aggregate flows into network states
    # --------------------------------------------------------

    grouped = df.groupby("Window_Index")

    states = grouped.agg(
        Timestamp=("StartTime", "min"),
        Flow_Count=("StartTime", "count"),
        Total_Packets=("TotPkts", "sum"),
        Total_Bytes=("TotBytes", "sum"),
        Total_Source_Bytes=("SrcBytes", "sum"),
        Avg_Duration=("Dur", "mean"),
        Attack_Flow_Count=("Is_Attack", "sum"),
    ).reset_index()

    # --------------------------------------------------------
    # Derived features
    # --------------------------------------------------------

    states["Avg_Packets_Per_Flow"] = (
        states["Total_Packets"]
        / states["Flow_Count"].replace(0, np.nan)
    )

    states["Avg_Bytes_Per_Flow"] = (
        states["Total_Bytes"]
        / states["Flow_Count"].replace(0, np.nan)
    )

    # Replace invalid values
    states = states.replace(
        [np.inf, -np.inf],
        np.nan
    )

    states = states.fillna(0)

    # --------------------------------------------------------
    # Attack state
    # --------------------------------------------------------

    states["Attack_State"] = (
        states["Attack_Flow_Count"] > 0
    ).astype(int)

    # --------------------------------------------------------
    # Change features
    # --------------------------------------------------------

    change_columns = [
        "Flow_Count",
        "Total_Packets",
        "Total_Bytes",
        "Total_Source_Bytes",
        "Avg_Duration",
    ]

    for col in change_columns:

        states[f"{col}_Change"] = (
            states[col]
            .diff()
            .fillna(0)
        )

    # --------------------------------------------------------
    # 5-MINUTE EARLY WARNING TARGET
    #
    # Target = 1 when:
    #
    # Current state is NORMAL
    # AND
    # an attack occurs during the next 10 states
    #
    # 10 states x 30 seconds = 5 minutes
    # --------------------------------------------------------

    attack_array = states["Attack_State"].values

    target = np.zeros(
        len(states),
        dtype=int
    )

    for i in range(len(states)):

        # Current state must be normal
        if attack_array[i] != 0:
            target[i] = 0
            continue

        future_end = min(
            i + WARNING_HORIZON_WINDOWS + 1,
            len(states)
        )

        future_attack = attack_array[
            i + 1:future_end
        ]

        if np.any(future_attack == 1):
            target[i] = 1

    states["Target_Early_Warning"] = target

    # --------------------------------------------------------
    # Remove final 10 states
    #
    # We cannot know whether an attack occurs 5 minutes
    # into the future for these states.
    # --------------------------------------------------------

    if len(states) > WARNING_HORIZON_WINDOWS:

        states = states.iloc[
            :-WARNING_HORIZON_WINDOWS
        ].copy()

    # --------------------------------------------------------
    # Scenario identifier
    # --------------------------------------------------------

    states["Scenario"] = scenario_number

    # --------------------------------------------------------
    # Select final columns
    # --------------------------------------------------------

    final_columns = [
        "Scenario",
        "Timestamp",

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

        "Attack_Flow_Count",
        "Attack_State",

        "Target_Early_Warning",
    ]

    states = states[final_columns]

    # --------------------------------------------------------
    # Print scenario statistics
    # --------------------------------------------------------

    print(
        f"30-second states: {len(states):,}"
    )

    print(
        f"Attack states: "
        f"{states['Attack_State'].sum():,}"
    )

    print(
        f"Early-warning positives: "
        f"{states['Target_Early_Warning'].sum():,}"
    )

    return states


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 70)
    print("THREATCAST - CTU13 SCENARIOS 1-9")
    print("5-MINUTE EARLY-WARNING DATASET")
    print("=" * 70)

    all_states = []

    # --------------------------------------------------------
    # Process scenarios 1-9
    # --------------------------------------------------------

    for scenario in SCENARIOS:

        try:

            states = process_scenario(
                scenario
            )

            all_states.append(states)

        except Exception as e:

            print()
            print(
                f"ERROR processing scenario {scenario}:"
            )
            print(e)
            raise

    # --------------------------------------------------------
    # Combine all scenarios
    # --------------------------------------------------------

    combined = pd.concat(
        all_states,
        ignore_index=True
    )

    # Sort by scenario and time
    combined = combined.sort_values(
        ["Scenario", "Timestamp"]
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    combined.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("FINAL DATASET")
    print("=" * 70)

    print(
        f"Shape: {combined.shape}"
    )

    print()
    print("States per scenario:")
    print(
        combined["Scenario"]
        .value_counts()
        .sort_index()
    )

    print()
    print("Early-warning positives per scenario:")
    print(
        combined.groupby("Scenario")[
            "Target_Early_Warning"
        ].sum()
    )

    print()
    print("Overall target distribution:")
    print(
        combined["Target_Early_Warning"]
        .value_counts()
        .sort_index()
    )

    print()
    print(f"Saved to:")
    print(OUTPUT_FILE)

    print()
    print("=" * 70)
    print("PREPROCESSING COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()