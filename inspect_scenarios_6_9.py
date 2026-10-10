import pandas as pd
import os
import glob

BASE_DIR = r"E:\Projects\SIH\data\CTU13"

for scenario in range(6, 10):

    folder = os.path.join(BASE_DIR, f"scenario{scenario}")
    files = glob.glob(os.path.join(folder, "*.binetflow"))

    if not files:
        print(f"\nScenario {scenario}: FILE NOT FOUND")
        continue

    file_path = files[0]

    print("\n" + "=" * 70)
    print(f"SCENARIO {scenario}")
    print(f"FILE: {os.path.basename(file_path)}")
    print("=" * 70)

    df = pd.read_csv(file_path, low_memory=False)

    df["StartTime"] = pd.to_datetime(
        df["StartTime"],
        errors="coerce"
    )

    print(f"Flows: {len(df):,}")
    print(f"First timestamp: {df['StartTime'].min()}")
    print(f"Last timestamp : {df['StartTime'].max()}")

    duration = (
        df["StartTime"].max()
        - df["StartTime"].min()
    )

    print(f"Duration: {duration}")

    attack = (
        df["Label"]
        .astype(str)
        .str.contains("Botnet", case=False, na=False)
    )

    print(f"Botnet flows: {attack.sum():,}")

    print("\nLabel distribution:")
    print(
        df["Label"]
        .astype(str)
        .str.extract(r"(Botnet|Normal|Background)", expand=False)
        .value_counts()
    )