import pandas as pd
import torch
from datetime import timedelta

GRAPH_FILE = "world_model/packet_graphs.pt"
STATE_FILE = "data/DAPT2020/dapt2020_network_states.csv"

WINDOW_SECONDS = 30


def main():

    print("=" * 70)
    print("THREATCAST - GRAPH WINDOW / ATTACK STAGE ALIGNMENT")
    print("=" * 70)

    graphs = torch.load(
        GRAPH_FILE,
        map_location="cpu",
        weights_only=False
    )

    states = pd.read_csv(STATE_FILE)

    states["Timestamp"] = pd.to_datetime(
        states["Timestamp"],
        errors="coerce"
    )

    states = states.dropna(
        subset=["Timestamp"]
    ).sort_values("Timestamp").reset_index(drop=True)

    print()
    print(f"Graph snapshots: {len(graphs)}")
    print(f"Network states: {len(states)}")

    # The graph builder starts at the first packet timestamp.
    graph_start = states["Timestamp"].min()

    graph_times = [
        graph_start + timedelta(
            seconds=i * WINDOW_SECONDS
        )
        for i in range(len(graphs))
    ]

    graph_df = pd.DataFrame({
        "Graph_Index": range(len(graphs)),
        "Timestamp": graph_times
    })

    # Assign every network-state record to its corresponding
    # 30-second graph window.
    states["Graph_Index"] = (
        (
            states["Timestamp"] - graph_start
        ).dt.total_seconds()
        // WINDOW_SECONDS
    ).astype(int)

    # Keep only states falling inside our 930 graph windows.
    states = states[
        (states["Graph_Index"] >= 0) &
        (states["Graph_Index"] < len(graphs))
    ].copy()

    print()
    print(
        f"Network-state records inside PCAP range: "
        f"{len(states)}"
    )

    # Determine the dominant stage in each graph window.
    stage_table = (
        states
        .groupby("Graph_Index")["Stage"]
        .agg(
            lambda x: x.value_counts().index[0]
        )
        .reset_index()
    )

    stage_table.columns = [
        "Graph_Index",
        "Stage"
    ]

    result = graph_df.merge(
        stage_table,
        on="Graph_Index",
        how="left"
    )

    result["Stage"] = result["Stage"].fillna(
        "UNLABELED"
    )

    print()
    print("=" * 70)
    print("GRAPH WINDOW STAGE DISTRIBUTION")
    print("=" * 70)

    print(
        result["Stage"]
        .value_counts()
        .to_string()
    )

    print()
    print("=" * 70)
    print("STAGE TRANSITIONS")
    print("=" * 70)

    previous_stage = None

    for _, row in result.iterrows():

        stage = row["Stage"]

        if stage != previous_stage:

            print(
                f"Graph {row['Graph_Index']:03d} | "
                f"{row['Timestamp']} | "
                f"{stage}"
            )

            previous_stage = stage

    print()
    print("=" * 70)
    print("ATTACK WINDOWS")
    print("=" * 70)

    attack_stages = [
        "RECONNAISSANCE",
        "ESTABLISH FOOTHOLD",
        "LATERAL MOVEMENT",
        "DATA EXFILTRATION"
    ]

    attack_windows = result[
        result["Stage"].isin(attack_stages)
    ]

    print(
        f"Attack-labeled graph windows: "
        f"{len(attack_windows)}"
    )

    if len(attack_windows) > 0:

        print()
        print(
            attack_windows[
                [
                    "Graph_Index",
                    "Timestamp",
                    "Stage"
                ]
            ].to_string(index=False)
        )

    print()
    print("=" * 70)
    print("LABEL COVERAGE")
    print("=" * 70)

    labeled = (
        result["Stage"] != "UNLABELED"
    ).sum()

    unlabeled = (
        result["Stage"] == "UNLABELED"
    ).sum()

    print(f"Labeled windows:   {labeled}")
    print(f"Unlabeled windows: {unlabeled}")
    print(
        f"Coverage: "
        f"{100 * labeled / len(result):.2f}%"
    )

    output_file = (
        "world_model/graph_window_labels.csv"
    )

    result.to_csv(
        output_file,
        index=False
    )

    print()
    print(f"Saved: {output_file}")

    print()
    print("=" * 70)
    print("ALIGNMENT CHECK COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()