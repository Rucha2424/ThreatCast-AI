import os
import pandas as pd
import torch

PCAP_GRAPH_FILE = "world_model/packet_graphs.pt"

SEARCH_DIRS = [
    "data/DAPT2020",
    "data"
]

GRAPH_COUNT = 930


def find_csv_files():
    files = []

    for root_dir in SEARCH_DIRS:
        if not os.path.exists(root_dir):
            continue

        for root, _, filenames in os.walk(root_dir):
            for filename in filenames:
                if filename.lower().endswith(".csv"):
                    files.append(os.path.join(root, filename))

    return sorted(set(files))


def inspect_csv(path):
    try:
        df = pd.read_csv(path, nrows=5)

        columns = [str(c) for c in df.columns]
        text = " ".join(columns).lower()

        keywords = [
            "timestamp",
            "time",
            "label",
            "class",
            "stage",
            "attack",
            "scenario"
        ]

        matches = [
            keyword for keyword in keywords
            if keyword in text
        ]

        if len(matches) >= 2:
            return columns, matches

    except Exception:
        pass

    return None, None


def main():

    print("=" * 70)
    print("THREATCAST - PCAP LABEL ALIGNMENT CHECK")
    print("=" * 70)

    print()
    print("Loading packet graph snapshots...")

    graphs = torch.load(
        PCAP_GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    print(f"PCAP graph snapshots: {len(graphs)}")
    print()

    print("Searching DAPT2020 CSV files...")
    print()

    files = find_csv_files()

    candidates = []

    for path in files:
        columns, matches = inspect_csv(path)

        if columns is not None:
            candidates.append(
                (path, columns, matches)
            )

    if not candidates:
        print("No candidate label CSV files found.")
        print()
        print("RESULT: LABEL ALIGNMENT NOT ESTABLISHED")
        return

    print(f"Candidate CSV files: {len(candidates)}")
    print()

    for path, columns, matches in candidates:

        print("-" * 70)
        print(f"FILE: {path}")
        print(f"MATCHES: {', '.join(matches)}")
        print("COLUMNS:")

        for column in columns:
            print(f"  - {column}")

    print()
    print("=" * 70)
    print("NEXT DECISION")
    print("=" * 70)
    print()
    print(
        "The files above are candidates only. "
        "Matching column names does NOT prove temporal alignment."
    )
    print()
    print(
        "We must compare actual timestamps before assigning "
        "attack/stage labels to the PCAP graphs."
    )
    print("=" * 70)


if __name__ == "__main__":
    main()