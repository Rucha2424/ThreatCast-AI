import pandas as pd
import torch

FLOW_FILE = "data/DAPT2020/archive/csv/enp0s3-monday.pcap_Flow.csv"
STATE_FILE = "data/DAPT2020/dapt2020_network_states.csv"
GRAPH_FILE = "world_model/packet_graphs.pt"


def find_time_column(df):
    for column in ["Timestamp", "timestamp", "Time", "time"]:
        if column in df.columns:
            return column
    return None


def inspect_file(path):
    df = pd.read_csv(path)

    time_column = find_time_column(df)

    print()
    print("=" * 70)
    print(path)
    print("=" * 70)

    print(f"Rows: {len(df)}")
    print(f"Time column: {time_column}")

    if time_column is None:
        return None

    timestamps = pd.to_datetime(
        df[time_column],
        errors="coerce"
    )

    valid = timestamps.dropna()

    print(f"Valid timestamps: {len(valid)}")

    if len(valid) > 0:
        print(f"First timestamp: {valid.min()}")
        print(f"Last timestamp:  {valid.max()}")

    if "Stage" in df.columns:
        print()
        print("Stage distribution:")
        print(df["Stage"].value_counts(dropna=False).to_string())

    return timestamps


def main():

    print("=" * 70)
    print("THREATCAST - DAPT2020 TEMPORAL ALIGNMENT")
    print("=" * 70)

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    print()
    print(f"PCAP graph snapshots: {len(graphs)}")
    print("Expected duration at 30 seconds/window:")
    print(f"{len(graphs) * 30 / 60:.2f} minutes")

    flow_times = inspect_file(FLOW_FILE)
    state_times = inspect_file(STATE_FILE)

    print()
    print("=" * 70)
    print("ALIGNMENT ANALYSIS")
    print("=" * 70)

    if flow_times is None or state_times is None:
        print("Could not determine timestamps.")
        print("RESULT: ALIGNMENT NOT ESTABLISHED")
        return

    flow_valid = flow_times.dropna()
    state_valid = state_times.dropna()

    if len(flow_valid) == 0 or len(state_valid) == 0:
        print("No valid timestamps available.")
        print("RESULT: ALIGNMENT NOT ESTABLISHED")
        return

    flow_start = flow_valid.min()
    flow_end = flow_valid.max()

    state_start = state_valid.min()
    state_end = state_valid.max()

    overlap_start = max(flow_start, state_start)
    overlap_end = min(flow_end, state_end)

    print()
    print(f"Flow interval:")
    print(f"  {flow_start} → {flow_end}")

    print()
    print(f"Network-state interval:")
    print(f"  {state_start} → {state_end}")

    print()

    if overlap_start <= overlap_end:

        overlap_seconds = (
            overlap_end - overlap_start
        ).total_seconds()

        print("Timestamp overlap: YES")
        print(f"Overlap duration: {overlap_seconds:.2f} seconds")

        print()
        print("RESULT:")
        print(
            "The flow-level and network-state datasets "
            "share a real temporal interval."
        )

    else:

        print("Timestamp overlap: NO")

        print()
        print("RESULT:")
        print(
            "The flow-level and network-state datasets "
            "cannot be directly aligned."
        )

    print()
    print("=" * 70)
    print("PCAP → LABEL DECISION")
    print("=" * 70)
    print()
    print(
        "This test establishes dataset-level temporal overlap."
    )
    print(
        "It does NOT yet assign labels to individual graph windows."
    )
    print(
        "Individual 30-second window alignment is the next step."
    )
    print("=" * 70)


if __name__ == "__main__":
    main()