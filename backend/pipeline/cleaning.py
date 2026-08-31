"""Cleaning layer for UniHack product data enrichment pipeline.

Handles:
1. General mojibake and encoding artifact repair across all text fields (using ftfy + unicode normalization).
2. Detection and nulling of distributor placeholder values ('-- Unbranded --', '-- No Unilog Brand --', etc.)
   into true None values.
3. Whitespace cleanup and normalization.
4. Granular provenance logging of all transformations applied to each field.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import unicodedata
import re
import ftfy


# Regex pattern to identify placeholders across brands and general text fields.
# Handles variations like:
#   '-- Unbranded --', '--Unbranded--', '-- UNBRANDED --'
#   '-- No Unilog Brand --', '-- No DIB Brand --', '-- No Brand --'
#   '-', 'N/A', 'n/a', 'null', 'None', 'undefined', ''
PLACEHOLDER_REGEX = re.compile(
    r"^(?:"
    r"--\s*(?:unbranded|no\s+[\w\s.-]+brand|no\s+brand|unassigned|none|null|n/a)\s*--"
    r"|--\s*--"
    r"|-"
    r"|n/?a"
    r"|null"
    r"|none"
    r"|undefined"
    r")$",
    re.IGNORECASE,
)

# Known input schema columns from /data/sample_input.csv
INPUT_COLUMNS = [
    "Mfg_Part_Num",
    "Part_Desc",
    "E1_Brand",
    "Unilog_Brand",
    "DIB_Brand",
    "Part_Manuf",
]

# Fields where placeholder text represents a missing/null entity
BRAND_AND_ENTITY_FIELDS = {
    "E1_Brand",
    "Unilog_Brand",
    "DIB_Brand",
    "Part_Manuf",
}


def is_placeholder(value: Optional[str]) -> bool:
    """Check if a string value represents a null/placeholder value."""
    if value is None:
        return True
    
    stripped = value.strip()
    if not stripped:
        return True
    
    return bool(PLACEHOLDER_REGEX.match(stripped))


def fix_mojibake(text: str) -> str:
    """Fix mojibake, mixed encoding, and broken UTF-8/CP1252 artifacts generally.
    
    Uses ftfy to detect and reverse multi-encoding bugs (e.g. UTF-8 decoded as CP1252
    or Latin-1) without hardcoding specific character replacements.
    Also normalizes Unicode characters to standard NFC form.
    """
    if not text:
        return text
    
    # 1. Apply ftfy's generalized heuristics
    fixed = ftfy.fix_text(text, normalization="NFC")
    
    # 2. Ensure clean standard spaces (replace non-breaking space / zero-width space)
    fixed = fixed.replace("\xa0", " ").replace("\u200b", "").replace("\ufeff", "")
    
    return fixed


def normalize_whitespace(text: str) -> str:
    """Normalize repeated whitespace and trim ends."""
    if not text:
        return ""
    # Collapse multiple whitespace characters into a single space
    return re.sub(r"\s+", " ", text).strip()


def clean_field(
    field_name: str,
    raw_value: Any,
) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    """Clean an individual field value and generate audit logs for any modifications.
    
    Args:
        field_name: The column name being cleaned.
        raw_value: The original raw value.
        
    Returns:
        Tuple of (cleaned_value, logs_for_this_field)
    """
    field_logs: List[Dict[str, Any]] = []
    
    if raw_value is None:
        return None, field_logs
    
    # Ensure value is string
    val_str = str(raw_value)
    
    # Check 1: Initial empty / whitespace check
    if not val_str.strip():
        if field_name in BRAND_AND_ENTITY_FIELDS:
            if val_str != "":
                field_logs.append({
                    "field": field_name,
                    "action": "placeholder_nulled",
                    "original": raw_value,
                    "cleaned": None,
                    "reason": "Empty/whitespace string converted to None",
                })
            return None, field_logs
        return "", field_logs
    
    # Check 2: Mojibake repair
    mojibake_fixed = fix_mojibake(val_str)
    if mojibake_fixed != val_str:
        field_logs.append({
            "field": field_name,
            "action": "mojibake_fixed",
            "original": val_str,
            "cleaned": mojibake_fixed,
            "reason": "Resolved encoding artifact via generalized Unicode/ftfy heuristics",
        })
    
    # Check 3: Placeholder detection (especially for brand and entity fields)
    if is_placeholder(mojibake_fixed):
        if field_name in BRAND_AND_ENTITY_FIELDS or field_name.endswith("_Brand"):
            field_logs.append({
                "field": field_name,
                "action": "placeholder_nulled",
                "original": raw_value,
                "cleaned": None,
                "reason": f"Placeholder '{mojibake_fixed.strip()}' nulled per AGENTS.md rules",
            })
            return None, field_logs
        elif mojibake_fixed.strip() in ["-", "N/A", "n/a", "null", "None"]:
            # General text fields that contain pure '-' or 'N/A'
            field_logs.append({
                "field": field_name,
                "action": "placeholder_nulled",
                "original": raw_value,
                "cleaned": None,
                "reason": f"Placeholder '{mojibake_fixed.strip()}' nulled",
            })
            return None, field_logs
    
    # Check 4: Whitespace normalization
    cleaned_val = normalize_whitespace(mojibake_fixed)
    if cleaned_val != mojibake_fixed:
        field_logs.append({
            "field": field_name,
            "action": "whitespace_normalized",
            "original": mojibake_fixed,
            "cleaned": cleaned_val,
            "reason": "Trimmed leading/trailing whitespace and collapsed multiple spaces",
        })
    
    return cleaned_val, field_logs


def clean_record(raw_record: Dict[str, Any]) -> Tuple[Dict[str, Optional[str]], List[Dict[str, Any]]]:
    """Clean a single raw product record from the input schema.
    
    Args:
        raw_record: Dict containing raw input fields (Mfg_Part_Num, Part_Desc, E1_Brand,
                    Unilog_Brand, DIB_Brand, Part_Manuf).
                    
    Returns:
        Tuple of (cleaned_record_dict, cleaning_log_list)
    """
    cleaned_record: Dict[str, Optional[str]] = {}
    cleaning_log: List[Dict[str, Any]] = []
    
    for key, value in raw_record.items():
        cleaned_value, logs = clean_field(key, value)
        cleaned_record[key] = cleaned_value
        cleaning_log.extend(logs)
    
    return cleaned_record, cleaning_log


def clean_dataset(
    records: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Optional[str]]], List[List[Dict[str, Any]]], Dict[str, Any]]:
    """Clean a batch of raw records and generate overall dataset cleaning metrics.
    
    Args:
        records: List of raw record dictionaries.
        
    Returns:
        Tuple of (cleaned_records, list_of_record_logs, summary_stats)
    """
    cleaned_records: List[Dict[str, Optional[str]]] = []
    all_logs: List[List[Dict[str, Any]]] = []
    
    total_rows = len(records)
    rows_with_placeholder_nulled = 0
    rows_with_mojibake_fixed = 0
    total_placeholders_nulled = 0
    total_mojibake_fixes = 0
    
    for record in records:
        cleaned, logs = clean_record(record)
        cleaned_records.append(cleaned)
        all_logs.append(logs)
        
        has_placeholder_nulled = any(log["action"] == "placeholder_nulled" for log in logs)
        has_mojibake_fixed = any(log["action"] == "mojibake_fixed" for log in logs)
        
        if has_placeholder_nulled:
            rows_with_placeholder_nulled += 1
        if has_mojibake_fixed:
            rows_with_mojibake_fixed += 1
            
        total_placeholders_nulled += sum(1 for log in logs if log["action"] == "placeholder_nulled")
        total_mojibake_fixes += sum(1 for log in logs if log["action"] == "mojibake_fixed")
    
    stats = {
        "total_rows_processed": total_rows,
        "rows_with_placeholder_nulled": rows_with_placeholder_nulled,
        "rows_with_mojibake_fixed": rows_with_mojibake_fixed,
        "total_placeholders_nulled_count": total_placeholders_nulled,
        "total_mojibake_fixes_count": total_mojibake_fixes,
    }
    
    return cleaned_records, all_logs, stats
