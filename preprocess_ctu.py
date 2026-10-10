import os
import numpy as np
import pandas as pd

from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.impute import SimpleImputer


# ============================================================
# PATHS
# ============================================================

INPUT_FILE = r"E:\Projects\SIH\data\CTU13\scenario5\capture20110815-2.binetflow"

OUTPUT_DIR = r"E:\Projects\SIH\data\CTU13\scenario5\processed"

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# LOAD RAW DATA
# ============================================================

print("=" * 60)
print("THREATCAST - SCENARIO 5 PREPROCESSING")
print("=" * 60)

print("\nLoading raw dataset...")

df = pd.read_csv(INPUT_FILE)

print(f"Raw rows: {len(df):,}")
print(f"Raw columns: {len(df.columns)}")


# ============================================================
# CLEAN COLUMN NAMES
# ============================================================

df.columns = df.columns.str.strip()


# ============================================================
# KEEP ONLY BOTNET-V46 AND NORMAL-V46
# ============================================================

print("\nFiltering V46 traffic...")

label = df["Label"].astype(str)

is_botnet = label.str.contains(
    "Botnet-V46",
    case=False,
    na=False
)

is_normal = label.str.contains(
    "Normal-V46",
    case=False,
    na=False
)

df = df[is_botnet | is_normal].copy()

print(f"V46 rows: {len(df):,}")


# ============================================================
# CREATE BINARY TARGET
# ============================================================

df["Target"] = (
    df["Label"]
    .astype(str)
    .str.contains("Botnet-V46", case=False, na=False)
    .astype(int)
)

print("\nClass distribution:")
print("Normal (0):", int((df["Target"] == 0).sum()))
print("Botnet (1):", int((df["Target"] == 1).sum()))


# ============================================================
# PARSE TIMESTAMP
# ============================================================

df["StartTime"] = pd.to_datetime(
    df["StartTime"],
    errors="coerce"
)

# Remove rows where timestamp could not be parsed
df = df.dropna(subset=["StartTime"]).copy()

# Sort chronologically
df = df.sort_values("StartTime").reset_index(drop=True)


# ============================================================
# FEATURE SELECTION
# ============================================================

# Numerical network-flow features
NUMERIC_FEATURES = [
    "Dur",
    "Sport",
    "Dport",
    "sTos",
    "dTos",
    "TotPkts",
    "TotBytes",
    "SrcBytes",
]

# Categorical network-flow features
CATEGORICAL_FEATURES = [
    "Proto",
    "Dir",
    "State",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


# Check that all expected columns exist
missing_features = [
    col for col in FEATURES
    if col not in df.columns
]

if missing_features:
    raise ValueError(
        f"Missing expected columns: {missing_features}"
    )


# ============================================================
# SELECT FEATURES
# ============================================================

X = df[FEATURES].copy()
y = df["Target"].astype(np.int64).to_numpy()

timestamps = df["StartTime"].copy()


# ============================================================
# HANDLE NUMERIC VALUES
# ============================================================

print("\nCleaning numerical features...")

# Convert numeric columns safely
for col in NUMERIC_FEATURES:
    X[col] = pd.to_numeric(
        X[col],
        errors="coerce"
    )

# Replace +/- infinity
X[NUMERIC_FEATURES] = X[NUMERIC_FEATURES].replace(
    [np.inf, -np.inf],
    np.nan
)

# Median imputation
numeric_imputer = SimpleImputer(
    strategy="median"
)

X_numeric = numeric_imputer.fit_transform(
    X[NUMERIC_FEATURES]
)


# ============================================================
# HANDLE CATEGORICAL FEATURES
# ============================================================

print("Encoding categorical features...")

# Convert categorical columns to strings
X_cat = X[CATEGORICAL_FEATURES].fillna("UNKNOWN").astype(str)

# Ordinal encoding.
# Unknown categories can safely be handled later.
categorical_encoder = OrdinalEncoder(
    handle_unknown="use_encoded_value",
    unknown_value=-1
)

X_categorical = categorical_encoder.fit_transform(
    X_cat
)


# ============================================================
# COMBINE FEATURES
# ============================================================

X_processed = np.hstack([
    X_numeric,
    X_categorical
]).astype(np.float32)


# ============================================================
# CHRONOLOGICAL TRAIN/TEST SPLIT
# ============================================================

print("\nCreating chronological train/test split...")

split_index = int(len(X_processed) * 0.80)

X_train = X_processed[:split_index]
X_test = X_processed[split_index:]

y_train = y[:split_index]
y_test = y[split_index:]

timestamps_train = timestamps.iloc[:split_index]
timestamps_test = timestamps.iloc[split_index:]


# ============================================================
# SCALE NUMERICAL FEATURES
# ============================================================

print("Scaling numerical features...")

scaler = StandardScaler()

X_train[:, :len(NUMERIC_FEATURES)] = scaler.fit_transform(
    X_train[:, :len(NUMERIC_FEATURES)]
)

X_test[:, :len(NUMERIC_FEATURES)] = scaler.transform(
    X_test[:, :len(NUMERIC_FEATURES)]
)


# ============================================================
# SAVE PROCESSED DATA
# ============================================================

print("\nSaving processed dataset...")

np.save(
    os.path.join(OUTPUT_DIR, "X_train.npy"),
    X_train
)

np.save(
    os.path.join(OUTPUT_DIR, "X_test.npy"),
    X_test
)

np.save(
    os.path.join(OUTPUT_DIR, "y_train.npy"),
    y_train
)

np.save(
    os.path.join(OUTPUT_DIR, "y_test.npy"),
    y_test
)

timestamps_train.to_csv(
    os.path.join(OUTPUT_DIR, "timestamps_train.csv"),
    index=False
)

timestamps_test.to_csv(
    os.path.join(OUTPUT_DIR, "timestamps_test.csv"),
    index=False
)


# ============================================================
# SAVE FEATURE INFORMATION
# ============================================================

feature_names = NUMERIC_FEATURES + CATEGORICAL_FEATURES

with open(
    os.path.join(OUTPUT_DIR, "features.txt"),
    "w",
    encoding="utf-8"
) as f:
    for i, feature in enumerate(feature_names):
        f.write(f"{i}: {feature}\n")


# ============================================================
# SAVE PREPROCESSING OBJECTS
# ============================================================

import joblib

joblib.dump(
    numeric_imputer,
    os.path.join(OUTPUT_DIR, "numeric_imputer.pkl")
)

joblib.dump(
    categorical_encoder,
    os.path.join(OUTPUT_DIR, "categorical_encoder.pkl")
)

joblib.dump(
    scaler,
    os.path.join(OUTPUT_DIR, "scaler.pkl")
)


# ============================================================
# FINAL REPORT
# ============================================================

print("\n" + "=" * 60)
print("PREPROCESSING COMPLETE")
print("=" * 60)

print(f"\nFinal V46 rows : {len(X_processed):,}")
print(f"Features       : {X_processed.shape[1]}")
print(f"Train samples  : {len(X_train):,}")
print(f"Test samples   : {len(X_test):,}")

print("\nTraining classes:")
print(
    "Normal (0):",
    int((y_train == 0).sum())
)
print(
    "Botnet (1):",
    int((y_train == 1).sum())
)

print("\nTesting classes:")
print(
    "Normal (0):",
    int((y_test == 0).sum())
)
print(
    "Botnet (1):",
    int((y_test == 1).sum())
)

print("\nFeature order:")
for i, feature in enumerate(feature_names):
    print(f"{i}: {feature}")

print(f"\nOutput directory:")
print(OUTPUT_DIR)

print("\nFiles created:")
for filename in sorted(os.listdir(OUTPUT_DIR)):
    print(" -", filename)

print("\nDone.")