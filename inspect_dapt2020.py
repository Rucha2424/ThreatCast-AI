import os
import glob
import pandas as pd


DATA_DIR = r"data\DAPT2020\archive\csv"

files = glob.glob(os.path.join(DATA_DIR, "*.csv"))

# Find a normal file to obtain the correct 85-column header
normal_file = next(
    f for f in files
    if "pvt-thursday" not in os.path.basename(f)
)

standard_columns = list(
    pd.read_csv(normal_file, nrows=0).columns
)

print("=" * 70)
print("DAPT2020 ATTACK-STAGE TIMELINE INSPECTION")
print("=" * 70)

for file in sorted(files):

    name = os.path.basename(file)

    # One downloaded CSV is missing its header.
    if "pvt-thursday" in name:
        df = pd.read_csv(
            file,
            header=None,
            names=standard_columns
        )
    else:
        df = pd.read_csv(file)

    # Clean timestamp
    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"],
        dayfirst=True,
        errors="coerce"
    )

    df = df.dropna(subset=["Timestamp"]).copy()

    # Normalize stage names
    df["Stage"] = (
        df["Stage"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    # Independent 30-second windows for EACH capture
    scenario_start = df["Timestamp"].min()

    df["Window_Index"] = (
        (df["Timestamp"] - scenario_start)
        .dt.total_seconds()
        // 30
    ).astype(int)

    # Determine dominant stage in each network state
    states = (
        df.groupby("Window_Index")
        .agg(
            Timestamp=("Timestamp", "min"),
            Stage=("Stage", lambda x: x.value_counts().index[0])
        )
        .reset_index()
        .sort_values("Timestamp")
    )

    attack_states = states[
        states["Stage"] != "BENIGN"
    ]

    print()
    print("-" * 70)
    print(name)
    print("-" * 70)

    print("Total states:", len(states))
    print("Attack states:", len(attack_states))

    if len(attack_states) == 0:
        print("No attack-stage states.")
        continue

    print()
    print("Attack-stage timeline:")

    print(
        attack_states[
            ["Timestamp", "Window_Index", "Stage"]
        ].to_string(index=False)
    )

print()
print("=" * 70)
print("INSPECTION COMPLETE")
print("=" * 70)