import pandas as pd
import glob
import os


# ============================================================
# THREATCAST - SCENARIO 12 RAW TRAFFIC INSPECTION
# ============================================================

folder = r"data\CTU13\scenario12"

files = glob.glob(
    os.path.join(folder, "*.binetflow")
)

print("=" * 75)
print("THREATCAST - SCENARIO 12 RAW TRAFFIC INSPECTION")
print("=" * 75)

print()
print("Files found:")

for f in files:
    print(" -", f)


if not files:
    raise FileNotFoundError(
        "No .binetflow file found in scenario12."
    )


# ============================================================
# LOAD
# ============================================================

path = files[0]

df = pd.read_csv(
    path,
    sep=",",
    low_memory=False
)


print()
print("-" * 75)

print("File:", path)

print(
    "Shape:",
    df.shape
)


# ============================================================
# COLUMNS
# ============================================================

print()
print("-" * 75)

print("RAW COLUMNS:")

for column in df.columns:
    print(" -", column)


# ============================================================
# LABEL DISTRIBUTION
# ============================================================

print()
print("-" * 75)

print("LABEL DISTRIBUTION:")

label_candidates = [
    "Label",
    "label"
]

label_column = None

for column in label_candidates:

    if column in df.columns:
        label_column = column
        break


if label_column:

    print(
        df[label_column]
        .value_counts(dropna=False)
        .to_string()
    )

else:

    print("No Label column found.")


# ============================================================
# PROTOCOL DISTRIBUTION
# ============================================================

print()
print("-" * 75)

for column in ["Proto", "Protocol", "proto"]:

    if column in df.columns:

        print(
            f"{column.upper()} DISTRIBUTION:"
        )

        print(
            df[column]
            .value_counts(dropna=False)
            .head(20)
            .to_string()
        )


# ============================================================
# TOP SOURCE / DESTINATION
# ============================================================

print()
print("-" * 75)

for column in [
    "SrcAddr",
    "DstAddr",
    "Source",
    "Destination"
]:

    if column in df.columns:

        print()
        print(
            f"TOP VALUES - {column}:"
        )

        print(
            df[column]
            .value_counts()
            .head(15)
            .to_string()
        )


# ============================================================
# PORT INFORMATION
# ============================================================

print()
print("-" * 75)

for column in [
    "Sport",
    "Dport",
    "SrcPort",
    "DstPort"
]:

    if column in df.columns:

        print()
        print(
            f"TOP PORTS - {column}:"
        )

        print(
            df[column]
            .value_counts()
            .head(20)
            .to_string()
        )


# ============================================================
# BASIC FLOW STATISTICS
# ============================================================

print()
print("-" * 75)

numeric_candidates = [
    "Dur",
    "TotPkts",
    "TotBytes",
    "SrcBytes"
]

for column in numeric_candidates:

    if column in df.columns:

        values = pd.to_numeric(
            df[column],
            errors="coerce"
        )

        print()
        print(
            f"{column}:"
        )

        print(
            f"  Mean   : {values.mean():.3f}"
        )

        print(
            f"  Median : {values.median():.3f}"
        )

        print(
            f"  Max    : {values.max():.3f}"
        )


# ============================================================
# ATTACK VS NORMAL
# ============================================================

if label_column:

    print()
    print("-" * 75)

    print(
        "ATTACK VS NORMAL PROTOCOL BREAKDOWN:"
    )

    temp = df.copy()

    temp["_is_attack"] = (
        temp[label_column]
        .astype(str)
        .str.contains(
            "Botnet",
            case=False,
            na=False
        )
    )

    if "Proto" in temp.columns:

        table = pd.crosstab(
            temp["Proto"],
            temp["_is_attack"]
        )

        print(
            table.to_string()
        )


# ============================================================
# SAMPLE ROWS
# ============================================================

print()
print("-" * 75)

print("FIRST 5 RAW FLOWS:")

print(
    df.head(5).to_string()
)


print()
print("=" * 75)
print("SCENARIO 12 RAW INSPECTION COMPLETE")
print("=" * 75)