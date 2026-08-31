"""Batch CSV Processor and Excel/CSV Exporter for UniHack pipeline.

Takes a raw input CSV file (e.g. data/sample_input.csv), runs each row through
the 252-column enrichment pipeline, and outputs a complete delivery-format CSV
matching data/expected_output_delivery_format.csv.
"""

from typing import Any, Dict, List, Optional
import csv
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.pipeline.orchestrator import run_pipeline, load_output_schema_columns


def process_csv(
    input_csv_path: str,
    output_csv_path: str,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """Process a batch input CSV and export full 252-column delivery CSV."""
    if not os.path.exists(input_csv_path):
        raise FileNotFoundError(f"Input CSV not found: {input_csv_path}")

    output_columns = load_output_schema_columns()
    os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)

    records_processed = 0
    start_time = time.time()

    with open(input_csv_path, encoding="utf-8-sig") as f_in, open(
        output_csv_path, "w", encoding="utf-8-sig", newline=""
    ) as f_out:
        reader = csv.DictReader(f_in)
        writer = csv.DictWriter(f_out, fieldnames=output_columns)
        writer.writeheader()

        for idx, row in enumerate(reader):
            if limit is not None and idx >= limit:
                break

            mfg_part_num = row.get("Mfg_Part_Num", "").strip()
            part_desc = row.get("Part_Desc", "").strip()
            e1_brand = row.get("E1_Brand", "").strip() or None
            unilog_brand = row.get("Unilog_Brand", "").strip() or None
            dib_brand = row.get("DIB_Brand", "").strip() or None
            part_manuf = row.get("Part_Manuf", "").strip() or None

            # Execute the same source-backed pipeline used by the API.  Offline
            # fixtures are intentionally not supported for production exports.
            res = run_pipeline(
                mfg_part_num=mfg_part_num,
                part_desc=part_desc,
                e1_brand=e1_brand,
                unilog_brand=unilog_brand,
                dib_brand=dib_brand,
                part_manuf=part_manuf,
            )

            # Ensure all 252 delivery format keys are present
            enriched_row = {}
            for col in output_columns:
                val = res["record"].get(col)
                enriched_row[col] = val if val is not None else ""

            # Surface Human Review / Confidence Flag directly in the CSV output
            summary = res.get("summary", {})
            confidence = summary.get("confidence", 0.85)
            classpath = summary.get("classpath", "")
            if classpath == "NO_CONFIDENT_MATCH" or not summary.get("resolved_brand"):
                if not enriched_row.get("Technical Bulletin"):
                    enriched_row["Technical Bulletin"] = "FLAG: NEEDS_MANUAL_REVIEW (Low Confidence / Unmapped Taxonomy)"

            writer.writerow(enriched_row)
            records_processed += 1

            if records_processed % 100 == 0:
                print(f"Processed {records_processed} rows...")

    duration = round(time.time() - start_time, 2)
    return {
        "status": "SUCCESS",
        "input_file": input_csv_path,
        "output_file": output_csv_path,
        "records_processed": records_processed,
        "total_columns": len(output_columns),
        "duration_seconds": duration,
    }


if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    input_file = os.path.join(base_dir, "data", "sample_input.csv")
    output_file = os.path.join(base_dir, "data", "enriched_output_delivery_format.csv")

    # Default to all 1,000 rows
    limit_rows = 1000 if len(sys.argv) < 2 else int(sys.argv[1])

    print("==========================================================================================")
    print("                    UNIHACK BATCH CSV TO 252-COLUMN DELIVERY EXPORTER                      ")
    print("==========================================================================================")
    print(f"Input File:  {input_file}")
    print(f"Output File: {output_file}")
    print(f"Processing Rows: {limit_rows} rows\n")

    res = process_csv(input_file, output_file, limit=limit_rows)
    print(f"\n[OK] Enriched delivery format CSV created successfully!")
    print(f"Location: {res['output_file']}")
    print(f"Total Rows: {res['records_processed']} | Duration: {res['duration_seconds']}s")
