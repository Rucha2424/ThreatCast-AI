"""Evaluate the pipeline without fixtures or model-specific test data.

The evaluator derives its inputs from ``sample_input.csv`` by manufacturer part
number, then runs normal source discovery.  It deliberately reports populated
field precision/recall separately from empty-cell agreement: a sparse delivery
record must not look accurate merely because many template fields are empty.
"""

from __future__ import annotations

import csv
import os
import sys
from typing import Dict, Iterable

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.pipeline.orchestrator import load_output_schema_columns, run_pipeline


def _value(row: Dict[str, str], column: str) -> str:
    value = (row.get(column) or "").strip()
    return "" if value == "-" or value.startswith("--") else value


def _matches(expected: str, actual: str) -> bool:
    """Allow only a narrow URL filename equivalence used by delivery sheets."""
    return expected.casefold() == actual.casefold() or (
        bool(expected and actual) and os.path.basename(expected) == os.path.basename(actual)
    )


def score_pipeline_accuracy() -> None:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    expected_path = os.path.join(base_dir, "data", "expected_output_delivery_format.csv")
    input_path = os.path.join(base_dir, "data", "sample_input.csv")
    columns = load_output_schema_columns(expected_path)

    with open(expected_path, encoding="utf-8-sig", newline="") as expected_file:
        expected_rows = list(csv.DictReader(expected_file))
    with open(input_path, encoding="utf-8-sig", newline="") as input_file:
        input_by_mpn = {
            (row.get("Mfg_Part_Num") or "").strip(): row
            for row in csv.DictReader(input_file)
        }

    matched_populated = generated_populated = expected_populated = null_agreement = 0
    evaluated_rows = 0
    for expected in expected_rows:
        mpn = _value(expected, "Mfg_Part_Num")
        source_row = input_by_mpn.get(mpn)
        if not source_row:
            print(f"SKIP {mpn or '<missing MPN>'}: absent from sample_input.csv")
            continue

        result = run_pipeline(
            mfg_part_num=source_row.get("Mfg_Part_Num", ""),
            part_desc=source_row.get("Part_Desc", ""),
            e1_brand=source_row.get("E1_Brand") or None,
            unilog_brand=source_row.get("Unilog_Brand") or None,
            dib_brand=source_row.get("DIB_Brand") or None,
            part_manuf=source_row.get("Part_Manuf") or None,
        )
        actual = result["record"]
        row_matches = row_expected = row_generated = 0
        for column in columns:
            expected_value = _value(expected, column)
            actual_value = _value(actual, column)
            if expected_value:
                expected_populated += 1
                row_expected += 1
            if actual_value:
                generated_populated += 1
                row_generated += 1
            if expected_value and actual_value and _matches(expected_value, actual_value):
                matched_populated += 1
                row_matches += 1
            if not expected_value and not actual_value:
                null_agreement += 1

        evaluated_rows += 1
        precision = 100 * row_matches / row_generated if row_generated else 0.0
        recall = 100 * row_matches / row_expected if row_expected else 0.0
        print(
            f"{mpn}: populated-field precision {precision:.1f}% "
            f"({row_matches}/{row_generated}), recall {recall:.1f}% "
            f"({row_matches}/{row_expected}); source={result['summary']['source_url']}"
        )

    precision = 100 * matched_populated / generated_populated if generated_populated else 0.0
    recall = 100 * matched_populated / expected_populated if expected_populated else 0.0
    empty_total = evaluated_rows * len(columns) - expected_populated
    null_rate = 100 * null_agreement / empty_total if empty_total else 0.0
    print("\nUNFIXTURED EVALUATION RESULTS")
    print(f"Rows evaluated: {evaluated_rows}")
    print(f"Populated-field precision: {precision:.2f}% ({matched_populated}/{generated_populated})")
    print(f"Populated-field recall: {recall:.2f}% ({matched_populated}/{expected_populated})")
    print(f"Empty-cell agreement (reported separately): {null_rate:.2f}% ({null_agreement}/{empty_total})")


if __name__ == "__main__":
    score_pipeline_accuracy()
