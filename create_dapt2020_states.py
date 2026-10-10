import os
import glob
import pandas as pd
import numpy as np


# ============================================================
# DAPT2020 NETWORK-STATE PREPROCESSING
# ============================================================

DATA_DIR = r"data\DAPT2020\archive\csv"
OUTPUT_FILE = r"data\DAPT2020\dapt2020_network_states.csv"

WINDOW_SECONDS = 30


# ============================================================
# STANDARD 85-COLUMN HEADER
# ============================================================

STANDARD_COLUMNS = [
    "Flow ID",
    "Src IP",
    "Src Port",
    "Dst IP",
    "Dst Port",
    "Protocol",
    "Timestamp",
    "Flow Duration",
    "Total Fwd Packet",
    "Total Bwd packets",
    "Total Length of Fwd Packet",
    "Total Length of Bwd Packet",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Packet Length Min",
    "Packet Length Max",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWR Flag Count",
    "ECE Flag Count",
    "Down/Up Ratio",
    "Average Packet Size",
    "Fwd Segment Size Avg",
    "Bwd Segment Size Avg",
    "Fwd Bytes/Bulk Avg",
    "Fwd Packet/Bulk Avg",
    "Fwd Bulk Rate Avg",
    "Bwd Bytes/Bulk Avg",
    "Bwd Packet/Bulk Avg",
    "Bwd Bulk Rate Avg",
    "Subflow Fwd Packets",
    "Subflow Fwd Bytes",
    "Subflow Bwd Packets",
    "Subflow Bwd Bytes",
    "FWD Init Win Bytes",
    "Bwd Init Win Bytes",
    "Fwd Act Data Pkts",
    "Fwd Seg Size Min",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
    "Activity",
    "Stage",
]


# ============================================================
# FEATURES USED FOR NETWORK STATE
# ============================================================

FEATURE_COLUMNS = [
    "Flow_Count",
    "Total_Fwd_Packets",
    "Total_Bwd_Packets",
    "Total_Fwd_Bytes",
    "Total_Bwd_Bytes",
    "Avg_Flow_Duration",
    "Avg_Fwd_Packet_Length",
    "Avg_Bwd_Packet_Length",
    "Avg_Packet_Length",
    "Avg_Flow_Bytes_per_Sec",
    "Avg_Flow_Packets_per_Sec",
    "Avg_Fwd_Packets_per_Sec",
    "Avg_Bwd_Packets_per_Sec",
    "Avg_Flow_IAT",
    "Avg_Flow_IAT_Std",
    "Avg_Flow_IAT_Max",
    "Avg_Flow_IAT_Min",
    "SYN_Flag_Count",
    "RST_Flag_Count",
]


# ============================================================
# HELPER: SAFE NUMERIC CONVERSION
# ============================================================

def numeric(series):
    return pd.to_numeric(series, errors="coerce").fillna(0)


# ============================================================
# READ ONE CSV
# ============================================================

def read_capture(file_path):

    filename = os.path.basename(file_path)

    print()
    print("Reading:", filename)

    # This file from the downloaded dataset has no header.
    if "enp0s3-pvt-thursday.pcap_Flow.csv" in filename:

        df = pd.read_csv(
            file_path,
            header=None,
            names=STANDARD_COLUMNS,
            low_memory=False
        )

        print("  Missing header handled automatically.")

    else:

        df = pd.read_csv(
            file_path,
            low_memory=False
        )

    # Verify structure
    if len(df.columns) != 85:
        raise ValueError(
            f"{filename} has {len(df.columns)} columns. "
            f"Expected 85."
        )

    return df


# ============================================================
# PROCESS ONE CAPTURE
# ============================================================

def process_capture(file_path):

    filename = os.path.basename(file_path)

    df = read_capture(file_path)

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"],
        format="%d/%m/%Y %I:%M:%S %p",
        errors="coerce"
    )

    df = df.dropna(subset=["Timestamp"]).copy()

    if df.empty:
        print("  WARNING: No valid timestamps.")
        return pd.DataFrame()

    # --------------------------------------------------------
    # Normalize Stage
    # --------------------------------------------------------

    df["Stage"] = (
        df["Stage"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    df["Stage"] = df["Stage"].replace({
        "BENIGN": "BENIGN",
        "RECONNAISSANCE": "RECONNAISSANCE",
        "ESTABLISH FOOTHOLD": "ESTABLISH FOOTHOLD",
        "LATERAL MOVEMENT": "LATERAL MOVEMENT",
        "DATA EXFILTRATION": "DATA EXFILTRATION",
    })

    # --------------------------------------------------------
    # Convert required flow features to numeric
    # --------------------------------------------------------

    numeric_columns = [
        "Flow Duration",
        "Total Fwd Packet",
        "Total Bwd packets",
        "Total Length of Fwd Packet",
        "Total Length of Bwd Packet",
        "Fwd Packet Length Mean",
        "Bwd Packet Length Mean",
        "Packet Length Mean",
        "Flow Bytes/s",
        "Flow Packets/s",
        "Fwd Packets/s",
        "Bwd Packets/s",
        "Flow IAT Mean",
        "Flow IAT Std",
        "Flow IAT Max",
        "Flow IAT Min",
        "SYN Flag Count",
        "RST Flag Count",
    ]

    for col in numeric_columns:
        df[col] = numeric(df[col])

    # --------------------------------------------------------
    # Sort by time
    # --------------------------------------------------------

    df = df.sort_values("Timestamp").reset_index(drop=True)

    # --------------------------------------------------------
    # 30-second windows
    #
    # IMPORTANT:
    # Each capture starts its own clock.
    # --------------------------------------------------------

    capture_start = df["Timestamp"].min()

    df["Window_Index"] = (
        (
            df["Timestamp"] - capture_start
        ).dt.total_seconds()
        // WINDOW_SECONDS
    ).astype(int)

    # --------------------------------------------------------
    # Aggregate each network state
    # --------------------------------------------------------

    states = []

    for window_index, group in df.groupby("Window_Index"):

        if group.empty:
            continue

        state_timestamp = group["Timestamp"].min()

        # ----------------------------------------------------
        # Determine dominant Stage
        # ----------------------------------------------------

        stage_counts = group["Stage"].value_counts()

        stage = stage_counts.index[0]

        # ----------------------------------------------------
        # Network-state features
        # ----------------------------------------------------

        state = {
            "Capture": filename,
            "Window_Index": int(window_index),
            "Timestamp": state_timestamp,

            "Flow_Count": len(group),

            "Total_Fwd_Packets": group["Total Fwd Packet"].sum(),
            "Total_Bwd_Packets": group["Total Bwd packets"].sum(),

            "Total_Fwd_Bytes": group[
                "Total Length of Fwd Packet"
            ].sum(),

            "Total_Bwd_Bytes": group[
                "Total Length of Bwd Packet"
            ].sum(),

            "Avg_Flow_Duration": group[
                "Flow Duration"
            ].mean(),

            "Avg_Fwd_Packet_Length": group[
                "Fwd Packet Length Mean"
            ].mean(),

            "Avg_Bwd_Packet_Length": group[
                "Bwd Packet Length Mean"
            ].mean(),

            "Avg_Packet_Length": group[
                "Packet Length Mean"
            ].mean(),

            "Avg_Flow_Bytes_per_Sec": group[
                "Flow Bytes/s"
            ].mean(),

            "Avg_Flow_Packets_per_Sec": group[
                "Flow Packets/s"
            ].mean(),

            "Avg_Fwd_Packets_per_Sec": group[
                "Fwd Packets/s"
            ].mean(),

            "Avg_Bwd_Packets_per_Sec": group[
                "Bwd Packets/s"
            ].mean(),

            "Avg_Flow_IAT": group[
                "Flow IAT Mean"
            ].mean(),

            "Avg_Flow_IAT_Std": group[
                "Flow IAT Std"
            ].mean(),

            "Avg_Flow_IAT_Max": group[
                "Flow IAT Max"
            ].mean(),

            "Avg_Flow_IAT_Min": group[
                "Flow IAT Min"
            ].mean(),

            "SYN_Flag_Count": group[
                "SYN Flag Count"
            ].sum(),

            "RST_Flag_Count": group[
                "RST Flag Count"
            ].sum(),

            "SYN_Per_Flow": group[
                "SYN Flag Count"
            ].sum() / max(len(group), 1),

            "RST_Per_Flow": group[
                "RST Flag Count"
            ].sum() / max(len(group), 1),

            "Stage": stage,
        }

        states.append(state)

    result = pd.DataFrame(states)

    print("  States generated:", len(result))

    return result


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("DAPT2020 NETWORK-STATE PREPROCESSING")
    print("=" * 70)

    files = sorted(
        glob.glob(
            os.path.join(DATA_DIR, "*.csv")
        )
    )

    if not files:
        raise FileNotFoundError(
            f"No CSV files found in: {DATA_DIR}"
        )

    print()
    print("CSV files found:", len(files))

    all_states = []

    for file_path in files:

        # Ignore non-dataset CSV files if any appear later
        if os.path.basename(file_path).startswith("."):
            continue

        states = process_capture(file_path)

        if not states.empty:
            all_states.append(states)

    # --------------------------------------------------------
    # Combine captures
    # --------------------------------------------------------

    if not all_states:
        raise RuntimeError(
            "No network states were generated."
        )

    result = pd.concat(
        all_states,
        ignore_index=True
    )

    # --------------------------------------------------------
    # Sort
    # --------------------------------------------------------

    result = result.sort_values(
        ["Capture", "Window_Index"]
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Replace invalid numeric values
    # --------------------------------------------------------

    numeric_feature_columns = [
        col for col in FEATURE_COLUMNS
        if col in result.columns
    ]

    result[numeric_feature_columns] = (
        result[numeric_feature_columns]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    os.makedirs(
        os.path.dirname(OUTPUT_FILE),
        exist_ok=True
    )

    result.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # --------------------------------------------------------
    # Final report
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("PREPROCESSING COMPLETE")
    print("=" * 70)

    print()
    print("Output:")
    print(OUTPUT_FILE)

    print()
    print("Shape:", result.shape)

    print()
    print("States per capture:")
    print(
        result["Capture"]
        .value_counts()
        .sort_index()
        .to_string()
    )

    print()
    print("Stage distribution:")
    print(
        result["Stage"]
        .value_counts()
        .to_string()
    )

    print()
    print("Missing values:")
    print(
        int(result.isna().sum().sum())
    )

    print()
    print("Infinite values:")

    numeric_values = result.select_dtypes(
        include=[np.number]
    )

    print(
        int(
            np.isinf(
                numeric_values.to_numpy()
            ).sum()
        )
    )

    print()
    print("Features used:", len(FEATURE_COLUMNS))

    print()
    print("Feature columns:")

    for i, feature in enumerate(FEATURE_COLUMNS, 1):
        print(f"{i:2d}. {feature}")

    print()
    print("=" * 70)


if __name__ == "__main__":
    main()