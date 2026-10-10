from __future__ import annotations

from typing import Any

import pandas as pd


FLOW_COLUMNS = [
    "StartTime",
    "Dur",
    "Proto",
    "SrcAddr",
    "Sport",
    "Dir",
    "DstAddr",
    "Dport",
    "State",
    "TotPkts",
    "TotBytes",
    "SrcBytes",
    "Label",
]


def load_binetflow(path: str) -> pd.DataFrame:
    df = pd.read_csv(
        path,
        low_memory=False,
    )

    return df


def get_flagged_flows(
    path: str,
    limit: int = 100,
) -> list[dict[str, Any]]:
    df = load_binetflow(path)

    existing = [
        column
        for column in FLOW_COLUMNS
        if column in df.columns
    ]

    df = df[existing].copy()

    if "Label" in df.columns:
        label = (
            df["Label"]
            .astype(str)
            .str.lower()
        )

        suspicious = df[
            label.str.contains(
                "botnet|c&c|cc|attack",
                regex=True,
                na=False,
            )
        ]

        if len(suspicious) > 0:
            df = suspicious

    return (
        df.head(limit)
        .where(pd.notnull(df.head(limit)), None)
        .to_dict(orient="records")
    )