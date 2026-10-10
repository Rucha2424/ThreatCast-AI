import os
import numpy as np
import pandas as pd


# ============================================================
# CONFIG
# ============================================================

INPUT_FILE = r"E:\Projects\SIH\data\CTU13\scenario5\capture20110815-2.binetflow"

OUTPUT_DIR = r"E:\Projects\SIH\data\CTU13\scenario5"

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "network_states.csv"
)

WINDOW_SECONDS = 30


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("THREATCAST - CREATE NETWORK STATES")
print("=" * 70)

print("\nLoading raw CTU13 Scenario 5...")

df = pd.read_csv(INPUT_FILE)

print("Raw flows:", len(df))


# ============================================================
# CLEAN COLUMN NAMES
# ============================================================

df.columns = df.columns.str.strip()


# ============================================================
# PARSE TIMESTAMP
# ============================================================

df["StartTime"] = pd.to_datetime(
    df["StartTime"],
    errors="coerce"
)

df = df.dropna(subset=["StartTime"]).copy()

df = df.sort_values("StartTime").reset_index(drop=True)


# ============================================================
# CONVERT NUMERIC COLUMNS
# ============================================================

NUMERIC_COLUMNS = [
    "Dur",
    "Sport",
    "Dport",
    "sTos",
    "dTos",
    "TotPkts",
    "TotBytes",
    "SrcBytes"
]

for col in NUMERIC_COLUMNS:
    df[col] = pd.to_numeric(
        df[col],
        errors="coerce"
    )

df[NUMERIC_COLUMNS] = df[NUMERIC_COLUMNS].replace(
    [np.inf, -np.inf],
    np.nan
)


def process_network_states(df, window_seconds=30, include_packet_flags=False):
    df["TimeWindow"] = df["StartTime"].dt.floor(f"{window_seconds}s")
    df["IsAttack"] = (
        df["Label"]
        .astype(str)
        .str.contains("Botnet-V46", case=False, na=False)
        .astype(int)
    )
    
    grouped = df.groupby("TimeWindow", sort=True)
    states = []
    
    for timestamp, group in grouped:
        flow_count = len(group)
        total_packets = group["TotPkts"].sum()
        total_bytes = group["TotBytes"].sum()
        total_source_bytes = group["SrcBytes"].sum()
        avg_duration = group["Dur"].mean()
        avg_packets_per_flow = total_packets / flow_count if flow_count > 0 else 0
        avg_bytes_per_flow = total_bytes / flow_count if flow_count > 0 else 0
        attack_flow_count = int(group["IsAttack"].sum())
        attack_ratio = attack_flow_count / flow_count if flow_count > 0 else 0
        
        row_dict = {
            "TimeWindow": timestamp,
            "Flow_Count": flow_count,
            "Total_Packets": total_packets,
            "Total_Bytes": total_bytes,
            "Total_Source_Bytes": total_source_bytes,
            "Avg_Duration": avg_duration,
            "Avg_Packets_Per_Flow": avg_packets_per_flow,
            "Avg_Bytes_Per_Flow": avg_bytes_per_flow,
            "Attack_Flow_Count": attack_flow_count,
            "Attack_Ratio": attack_ratio
        }
        
        if include_packet_flags and "State" in group.columns:
            state_str = group["State"].astype(str).str.upper()
            syn_count = state_str.str.contains("S", na=False).sum()
            fin_count = state_str.str.contains("F", na=False).sum()
            rst_count = state_str.str.contains("R", na=False).sum()
            syn_no_ack = (state_str.str.contains("S", na=False) & ~state_str.str.contains("A", na=False)).sum()
            
            row_dict["syn_ratio"] = syn_count / max(flow_count, 1)
            row_dict["fin_ratio"] = fin_count / max(flow_count, 1)
            row_dict["rst_ratio"] = rst_count / max(flow_count, 1)
            row_dict["syn_without_ack_count"] = int(syn_no_ack)
            
        states.append(row_dict)
        
    return pd.DataFrame(states)


states = process_network_states(df, WINDOW_SECONDS, include_packet_flags=False)


# ============================================================
# FILL MISSING AGGREGATES
# ============================================================

states = states.replace(
    [np.inf, -np.inf],
    np.nan
)

states = states.fillna(0)


# ============================================================
# CREATE CHANGE FEATURES
# ============================================================

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


# First state has no previous state
change_columns = [
    "Flow_Count_Change",
    "Total_Packets_Change",
    "Total_Bytes_Change",
    "Total_Source_Bytes_Change",
    "Avg_Duration_Change"
]

states[change_columns] = (
    states[change_columns]
    .replace([np.inf, -np.inf], np.nan)
    .fillna(0)
)


# ============================================================
# CREATE NEXT-WINDOW ATTACK TARGET
# ============================================================

# IMPORTANT:
#
# Current window features
#          ↓
# predict
#          ↓
# whether NEXT window contains Botnet-V46 traffic
#
# Attack_Flow_Count itself is NOT used as an input feature.

states["Target_Next_Attack"] = (
    states["Attack_Flow_Count"]
    .shift(-1)
    .gt(0)
    .astype(int)
)


# Last window has no future window.
states = states.iloc[:-1].copy()


# ============================================================
# SAVE
# ============================================================

states.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# REPORT
# ============================================================

print("\n" + "=" * 70)
print("NETWORK STATE CREATION COMPLETE")
print("=" * 70)

print("\nOutput:")
print(OUTPUT_FILE)

print("\nNumber of states:")
print(len(states))

print("\nTime range:")
print(states["TimeWindow"].min())
print("to")
print(states["TimeWindow"].max())

print("\nAttack-flow states:")
print(
    (states["Attack_Flow_Count"] > 0).sum()
)

print("\nNext-attack targets:")
print(
    states["Target_Next_Attack"]
    .value_counts()
    .sort_index()
)

print("\nColumns:")
for i, col in enumerate(states.columns):
    print(f"{i}: {col}")

print("\nFirst 5 states:")
print(states.head().to_string(index=False))

print("\nSaved successfully.")