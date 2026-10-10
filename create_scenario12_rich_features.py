import pandas as pd
import numpy as np
import glob
import os


# ============================================================
# THREATCAST - SCENARIO 12 RICH FEATURES
# EXACT SAME WINDOWING LOGIC AS ORIGINAL PIPELINE
# ============================================================

INPUT_FOLDER = r"data\CTU13\scenario12"
OUTPUT_PATH = r"data\CTU13\scenario12_rich_features.csv"

WINDOW_SECONDS = 30
WARNING_HORIZON_WINDOWS = 10


# ============================================================
# LOAD RAW DATA
# ============================================================

files = glob.glob(
    os.path.join(INPUT_FOLDER, "*.binetflow")
)

if not files:
    raise FileNotFoundError(
        "No .binetflow file found in Scenario 12."
    )

path = files[0]

print("=" * 75)
print("THREATCAST - SCENARIO 12 RICH FEATURES")
print("=" * 75)

print("\nLoading:", path)

df = pd.read_csv(
    path,
    sep=",",
    low_memory=False
)

print("Raw flows:", len(df))


# ============================================================
# CLEAN DATA
# ============================================================

df["StartTime"] = pd.to_datetime(
    df["StartTime"],
    errors="coerce"
)

numeric_columns = [
    "Dur",
    "TotPkts",
    "TotBytes",
    "SrcBytes"
]

for col in numeric_columns:

    df[col] = pd.to_numeric(
        df[col],
        errors="coerce"
    )

df = df.dropna(
    subset=["StartTime"]
).copy()

for col in numeric_columns:

    df[col] = df[col].fillna(0)


# ============================================================
# ATTACK FLOW
#
# Label is used ONLY for target generation.
# It is NOT a model feature.
# ============================================================

df["Is_Attack"] = (
    df["Label"]
    .astype(str)
    .str.contains(
        "Botnet",
        case=False,
        na=False
    )
    .astype(int)
)


# ============================================================
# EXACT ORIGINAL WINDOWING LOGIC
#
# This is copied conceptually from
# create_all_network_states.py.
#
# Each scenario starts at its earliest timestamp.
# Window_Index = elapsed_seconds // 30
# ============================================================

scenario_start = df["StartTime"].min()

df["Window_Index"] = (
    (
        df["StartTime"] - scenario_start
    ).dt.total_seconds()
    // WINDOW_SECONDS
).astype(int)


# ============================================================
# GROUP BY ORIGINAL WINDOW INDEX
# ============================================================

grouped = df.groupby(
    "Window_Index"
)


# ============================================================
# BASIC FEATURES
# ============================================================

states = grouped.agg(

    Timestamp=(
        "StartTime",
        "min"
    ),

    Flow_Count=(
        "StartTime",
        "count"
    ),

    Total_Packets=(
        "TotPkts",
        "sum"
    ),

    Total_Bytes=(
        "TotBytes",
        "sum"
    ),

    Total_Source_Bytes=(
        "SrcBytes",
        "sum"
    ),

    Avg_Duration=(
        "Dur",
        "mean"
    ),

    Attack_Flow_Count=(
        "Is_Attack",
        "sum"
    )

).reset_index()


# ============================================================
# BASIC DERIVED FEATURES
# ============================================================

states["Avg_Packets_Per_Flow"] = (
    states["Total_Packets"]
    /
    states["Flow_Count"].replace(
        0,
        np.nan
    )
)

states["Avg_Bytes_Per_Flow"] = (
    states["Total_Bytes"]
    /
    states["Flow_Count"].replace(
        0,
        np.nan
    )
)


# ============================================================
# CLEAN INVALID VALUES
# ============================================================

states = states.replace(
    [np.inf, -np.inf],
    np.nan
)

states = states.fillna(0)


# ============================================================
# ATTACK STATE
# ============================================================

states["Attack_State"] = (
    states["Attack_Flow_Count"] > 0
).astype(int)


# ============================================================
# RICH FEATURE 1
# UNIQUE SOURCE HOSTS
# ============================================================

states["Unique_Source_Hosts"] = (
    grouped["SrcAddr"]
    .nunique()
    .values
)


# ============================================================
# RICH FEATURE 2
# UNIQUE DESTINATION HOSTS
# ============================================================

states["Unique_Destination_Hosts"] = (
    grouped["DstAddr"]
    .nunique()
    .values
)


# ============================================================
# RICH FEATURE 3
# UNIQUE COMMUNICATION PAIRS
# ============================================================

pair_df = df.copy()

pair_df["Communication_Pair"] = (
    pair_df["SrcAddr"].astype(str)
    + "->"
    + pair_df["DstAddr"].astype(str)
)

pair_counts = (
    pair_df
    .groupby("Window_Index")[
        "Communication_Pair"
    ]
    .nunique()
)

states["Unique_Communication_Pairs"] = (
    states["Window_Index"]
    .map(pair_counts)
    .fillna(0)
    .values
)


# ============================================================
# RICH FEATURE 4
# UNIQUE SOURCE PORTS
# ============================================================

states["Unique_Source_Ports"] = (
    grouped["Sport"]
    .nunique()
    .values
)


# ============================================================
# RICH FEATURE 5
# UNIQUE DESTINATION PORTS
# ============================================================

states["Unique_Destination_Ports"] = (
    grouped["Dport"]
    .nunique()
    .values
)


# ============================================================
# RICH FEATURES 6-8
# PROTOCOL RATIOS
# ============================================================

def protocol_ratio(group, protocol):

    if len(group) == 0:
        return 0

    return (
        group["Proto"]
        .astype(str)
        .str.upper()
        .eq(protocol)
        .mean()
    )


states["UDP_Ratio"] = (
    grouped
    .apply(
        lambda x: protocol_ratio(
            x,
            "UDP"
        ),
        include_groups=False
    )
    .values
)

states["TCP_Ratio"] = (
    grouped
    .apply(
        lambda x: protocol_ratio(
            x,
            "TCP"
        ),
        include_groups=False
    )
    .values
)

states["ICMP_Ratio"] = (
    grouped
    .apply(
        lambda x: protocol_ratio(
            x,
            "ICMP"
        ),
        include_groups=False
    )
    .values
)


# ============================================================
# RICH FEATURE 9
# UNIQUE CONNECTION STATES
# ============================================================

states["Unique_Connection_States"] = (
    grouped["State"]
    .nunique()
    .values
)


# ============================================================
# RICH FEATURE 10
# UNIQUE DIRECTIONS
# ============================================================

states["Unique_Directions"] = (
    grouped["Dir"]
    .nunique()
    .values
)


# ============================================================
# RICH FEATURE 11
# EXTERNAL DESTINATION FLOWS
#
# CTU13 internal network = 147.32.x.x
# ============================================================

def count_external_destinations(group):

    destinations = (
        group["DstAddr"]
        .astype(str)
    )

    return (
        ~destinations.str.startswith(
            "147.32."
        )
    ).sum()


states["External_Destination_Flow_Count"] = (
    grouped
    .apply(
        count_external_destinations,
        include_groups=False
    )
    .values
)


# ============================================================
# RICH FEATURE 12
# DESTINATION DIVERSITY
# ============================================================

states["Destination_Diversity"] = (
    states["Unique_Destination_Hosts"]
    /
    states["Flow_Count"].replace(
        0,
        1
    )
)


# ============================================================
# RICH FEATURE 13
# SOURCE DIVERSITY
# ============================================================

states["Source_Diversity"] = (
    states["Unique_Source_Hosts"]
    /
    states["Flow_Count"].replace(
        0,
        1
    )
)


# ============================================================
# RICH FEATURE 14
# COMMUNICATION DENSITY
# ============================================================

states["Communication_Density"] = (
    states["Unique_Communication_Pairs"]
    /
    states["Flow_Count"].replace(
        0,
        1
    )
)


# ============================================================
# SORT EXACTLY LIKE ORIGINAL
# ============================================================

states = states.sort_values(
    "Window_Index"
).reset_index(
    drop=True
)


# ============================================================
# CHANGE FEATURES
# ============================================================

change_columns = [

    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow",

    "Unique_Source_Hosts",
    "Unique_Destination_Hosts",
    "Unique_Communication_Pairs",

    "Unique_Source_Ports",
    "Unique_Destination_Ports",

    "UDP_Ratio",
    "TCP_Ratio",
    "ICMP_Ratio",

    "Unique_Connection_States",
    "Unique_Directions",

    "External_Destination_Flow_Count",

    "Destination_Diversity",
    "Source_Diversity",
    "Communication_Density"
]


for column in change_columns:

    states[
        column + "_Change"
    ] = (
        states[column]
        .diff()
        .fillna(0)
    )


# ============================================================
# EARLY WARNING TARGET
#
# EXACT SAME LOGIC AS ORIGINAL PIPELINE
#
# Current state = NORMAL
# AND
# attack occurs in next 10 states
# ============================================================

attack_array = (
    states["Attack_State"]
    .values
)

target = np.zeros(
    len(states),
    dtype=int
)


for i in range(
    len(states)
):

    if attack_array[i] != 0:

        target[i] = 0

        continue


    future_end = min(
        i
        + WARNING_HORIZON_WINDOWS
        + 1,
        len(states)
    )


    future_attack = (
        attack_array[
            i + 1:future_end
        ]
    )


    if np.any(
        future_attack == 1
    ):

        target[i] = 1


states[
    "Target_Early_Warning"
] = target


# ============================================================
# REMOVE FINAL 10 STATES
#
# EXACT SAME AS ORIGINAL
# ============================================================

if len(states) > WARNING_HORIZON_WINDOWS:

    states = states.iloc[
        :-WARNING_HORIZON_WINDOWS
    ].copy()


# ============================================================
# REMOVE WINDOW INDEX
#
# It is only used internally for grouping.
# ============================================================

states = states.drop(
    columns=[
        "Window_Index"
    ]
)


# ============================================================
# FINAL CLEANUP
# ============================================================

states = states.replace(
    [np.inf, -np.inf],
    np.nan
)

states = states.fillna(0)


# ============================================================
# VALIDATION
# ============================================================

print("\n" + "-" * 75)

print(
    "States BEFORE removing horizon:",
    len(attack_array)
)

print(
    "Final states:",
    len(states)
)


print("\nFirst 5 timestamps:")

for timestamp in states[
    "Timestamp"
].head(5):

    print(timestamp)


print("\nLast 5 timestamps:")

for timestamp in states[
    "Timestamp"
].tail(5):

    print(timestamp)


print("\nTarget distribution:")

print(
    states[
        "Target_Early_Warning"
    ]
    .value_counts()
    .sort_index()
)


print("\nAttack states:")

print(
    states[
        "Attack_State"
    ]
    .value_counts()
    .sort_index()
)


print(
    "\nTotal columns:",
    len(states.columns)
)


numeric = states.select_dtypes(
    include=[np.number]
)

print(
    "NaN values:",
    numeric.isna().sum().sum()
)

print(
    "Infinite values:",
    np.isinf(
        numeric.to_numpy()
    ).sum()
)


# ============================================================
# SAVE
# ============================================================

states.to_csv(
    OUTPUT_PATH,
    index=False
)


print("\n" + "=" * 75)

print(
    "Saved:",
    OUTPUT_PATH
)

print(
    "SCENARIO 12 RICH FEATURE GENERATION COMPLETE"
)

print("=" * 75)