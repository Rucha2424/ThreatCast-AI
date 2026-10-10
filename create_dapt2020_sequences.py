import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import StandardScaler

# ============================================================
# DAPT2020 SEQUENCE GENERATION
# ============================================================

INPUT_FILE = r"data\DAPT2020\dapt2020_network_states.csv"

OUTPUT_X = r"data\DAPT2020\X_sequences.npy"
OUTPUT_Y = r"data\DAPT2020\y_sequences.npy"
OUTPUT_CAPTURES = r"data\DAPT2020\sequence_captures.npy"
OUTPUT_SCALER = r"data\DAPT2020\dapt2020_scaler.pkl"

SEQUENCE_LENGTH = 5

# Exactly the 19 features used for the DAPT2020 network states
FEATURES = [
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
    "RST_Flag_Count"
]

# ============================================================
# LOAD
# ============================================================

print("=" * 65)
print("DAPT2020 SEQUENCE GENERATION")
print("=" * 65)

df = pd.read_csv(INPUT_FILE)

print("\nLoaded dataset:", df.shape)

# ============================================================
# VALIDATE REQUIRED COLUMNS
# ============================================================

required_columns = [
    "Capture",
    "Timestamp",
    "Stage"
] + FEATURES

missing_columns = [
    column for column in required_columns
    if column not in df.columns
]

if missing_columns:
    print("\nERROR: Missing columns:")
    for column in missing_columns:
        print(" -", column)

    raise SystemExit(1)

# ============================================================
# NORMALIZE STAGE NAMES
# ============================================================

df["Stage"] = (
    df["Stage"]
    .astype(str)
    .str.strip()
    .str.upper()
)

EXPECTED_STAGES = [
    "BENIGN",
    "DATA EXFILTRATION",
    "ESTABLISH FOOTHOLD",
    "LATERAL MOVEMENT",
    "RECONNAISSANCE"
]

unexpected_stages = sorted(
    set(df["Stage"].unique()) - set(EXPECTED_STAGES)
)

if unexpected_stages:
    print("\nERROR: Unexpected stage values:")
    for stage in unexpected_stages:
        print(" -", stage)

    raise SystemExit(1)

# Fixed encoding
STAGE_TO_ID = {
    "BENIGN": 0,
    "DATA EXFILTRATION": 1,
    "ESTABLISH FOOTHOLD": 2,
    "LATERAL MOVEMENT": 3,
    "RECONNAISSANCE": 4
}

ID_TO_STAGE = {
    value: key
    for key, value in STAGE_TO_ID.items()
}

print("\nStage encoding:")

for stage, idx in STAGE_TO_ID.items():
    print(f" {idx} -> {stage}")

# ============================================================
# SORT WITHIN CAPTURE
# ============================================================

df["Timestamp"] = pd.to_datetime(
    df["Timestamp"],
    errors="coerce"
)

if df["Timestamp"].isna().any():
    print("\nERROR: Invalid timestamps found.")
    raise SystemExit(1)

df = df.sort_values(
    ["Capture", "Timestamp"]
).reset_index(drop=True)

# ============================================================
# NUMERIC FEATURES
# ============================================================

X_data = df[FEATURES].copy()

for feature in FEATURES:
    X_data[feature] = pd.to_numeric(
        X_data[feature],
        errors="coerce"
    )

X_data = X_data.replace(
    [np.inf, -np.inf],
    np.nan
)

X_data = X_data.fillna(0)

# ============================================================
# SCALE FEATURES
# ============================================================

scaler = StandardScaler()

X_scaled = scaler.fit_transform(X_data)

X_scaled = X_scaled.astype(np.float32)

print("\nFeature matrix:", X_scaled.shape)

# Save scaler
with open(OUTPUT_SCALER, "wb") as file:
    pickle.dump(scaler, file)

# ============================================================
# GENERATE SEQUENCES
# ============================================================

X_sequences = []
y_sequences = []
sequence_captures = []

captures = df["Capture"].unique()

print("\nCaptures:", len(captures))

for capture in captures:

    capture_mask = (
        df["Capture"].values == capture
    )

    capture_indices = np.where(
        capture_mask
    )[0]

    capture_length = len(capture_indices)

    print(
        f"{capture}: "
        f"{capture_length} states"
    )

    if capture_length < SEQUENCE_LENGTH:
        print("  Skipped: fewer than 5 states")
        continue

    capture_X = X_scaled[capture_indices]

    capture_stages = df.iloc[
        capture_indices
    ]["Stage"].values

    # Sliding window INSIDE this capture only
    for i in range(
        capture_length - SEQUENCE_LENGTH + 1
    ):

        sequence = capture_X[
            i:i + SEQUENCE_LENGTH
        ]

        # Target is the stage of the final state
        target_stage = capture_stages[
            i + SEQUENCE_LENGTH - 1
        ]

        X_sequences.append(sequence)

        y_sequences.append(
            STAGE_TO_ID[target_stage]
        )

        sequence_captures.append(
            capture
        )

# ============================================================
# NUMPY ARRAYS
# ============================================================

X_sequences = np.asarray(
    X_sequences,
    dtype=np.float32
)

y_sequences = np.asarray(
    y_sequences,
    dtype=np.int64
)

sequence_captures = np.asarray(
    sequence_captures,
    dtype=str
)

# ============================================================
# BASIC VALIDATION
# ============================================================

print("\nSequence generation complete.")

print("\nX shape:", X_sequences.shape)
print("y shape:", y_sequences.shape)
print(
    "Capture IDs shape:",
    sequence_captures.shape
)

if len(X_sequences) != len(y_sequences):
    raise RuntimeError(
        "X and y lengths do not match."
    )

if len(X_sequences) != len(sequence_captures):
    raise RuntimeError(
        "X and capture-ID lengths do not match."
    )

if X_sequences.ndim != 3:
    raise RuntimeError(
        "X must be a 3-dimensional array."
    )

if X_sequences.shape[1] != SEQUENCE_LENGTH:
    raise RuntimeError(
        "Incorrect sequence length."
    )

if X_sequences.shape[2] != len(FEATURES):
    raise RuntimeError(
        "Incorrect number of features."
    )

# ============================================================
# TARGET DISTRIBUTION
# ============================================================

print("\nSequence target distribution:")

for class_id in range(len(ID_TO_STAGE)):

    stage = ID_TO_STAGE[class_id]

    count = np.sum(
        y_sequences == class_id
    )

    print(
        f"{stage:25s} -> {count}"
    )

# ============================================================
# CAPTURE DISTRIBUTION
# ============================================================

print("\nSequences per capture:")

capture_counts = pd.Series(
    sequence_captures
).value_counts()

for capture, count in capture_counts.items():

    print(
        f"{capture}: {count}"
    )

# ============================================================
# DATA QUALITY CHECKS
# ============================================================

has_nan = np.isnan(
    X_sequences
).any()

has_inf = np.isinf(
    X_sequences
).any()

print("\nFinal checks:")

print("X contains NaN:", has_nan)
print("X contains Inf:", has_inf)

if has_nan or has_inf:
    raise RuntimeError(
        "Invalid values found in X."
    )

# ============================================================
# SAVE
# ============================================================

np.save(
    OUTPUT_X,
    X_sequences
)

np.save(
    OUTPUT_Y,
    y_sequences
)

np.save(
    OUTPUT_CAPTURES,
    sequence_captures
)

print("\nSaved files:")

print(OUTPUT_X)
print(OUTPUT_Y)
print(OUTPUT_CAPTURES)
print(OUTPUT_SCALER)

# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 65)
print("DONE")
print("=" * 65)