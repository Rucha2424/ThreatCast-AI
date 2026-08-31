"""Cleansing and Normalization layer for UniHack product data enrichment pipeline.

Capabilities:
1. normalize_uom: Normalizes raw units against shared/uom_standards.csv.
2. convert_decimal_fraction: Converts fractions/decimals using shared/decimal_fraction_lookup.csv,
   flagging unlisted calculations as COMPUTED_NOT_TABLE_MATCHED.
3. apply_house_style: Extensible rule engine enforcing spacing, hyphenation, and symbol conventions.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import csv
import os
import re
from fractions import Fraction


# ----------------------------------------------------
# 1. Unit of Measure Normalization
# ----------------------------------------------------
class UOMNormalizer:
    def __init__(self, uom_csv_path: Optional[str] = None):
        if uom_csv_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            uom_csv_path = os.path.join(base_dir, "shared", "uom_standards.csv")
            
        self.uom_csv_path = uom_csv_path
        self.uom_patterns: List[Tuple[re.Pattern, str, str]] = []
        self._load_uom_table()

    def _load_uom_table(self):
        if not os.path.exists(self.uom_csv_path):
            return

        with open(self.uom_csv_path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("#") or not line.strip():
                    continue
                reader = csv.DictReader([line], fieldnames=["category", "raw_unit_pattern", "standard_uom", "description"])
                row = next(reader)
                if row["category"] == "category":
                    continue

                pattern_str = row["raw_unit_pattern"].strip()
                std_uom = row["standard_uom"].strip()
                cat = row["category"].strip()

                # Compile regex
                regex = re.compile(r"^(?:" + pattern_str + r")$", re.IGNORECASE)
                self.uom_patterns.append((regex, std_uom, cat))

    def normalize(self, raw_uom: Optional[str]) -> Tuple[Optional[str], str]:
        """Normalize raw unit string to controlled standard UOM.
        
        Returns:
            Tuple of (standardized_uom, status: 'TABLE_MATCHED' | 'ORIGINAL_PRESERVED' | 'EMPTY')
        """
        if not raw_uom or not raw_uom.strip():
            return None, "EMPTY"

        u_clean = raw_uom.strip()

        for pattern, std_uom, _ in self.uom_patterns:
            if pattern.match(u_clean):
                return std_uom, "TABLE_MATCHED"

        return u_clean, "ORIGINAL_PRESERVED"


# ----------------------------------------------------
# 2. Decimal / Fraction Conversion
# ----------------------------------------------------
class DecimalFractionConverter:
    def __init__(self, lookup_csv_path: Optional[str] = None):
        if lookup_csv_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            lookup_csv_path = os.path.join(base_dir, "shared", "decimal_fraction_lookup.csv")

        self.lookup_csv_path = lookup_csv_path
        self.fraction_to_decimal: Dict[str, float] = {}
        self.decimal_to_fraction: Dict[float, str] = {}
        self._load_table()

    def _load_table(self):
        if not os.path.exists(self.lookup_csv_path):
            return

        with open(self.lookup_csv_path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("#") or not line.strip():
                    continue
                reader = csv.DictReader([line], fieldnames=["fraction_string", "decimal_value", "normalized_fraction"])
                row = next(reader)
                if row["fraction_string"] == "fraction_string":
                    continue

                frac = row["fraction_string"].strip()
                try:
                    dec = float(row["decimal_value"].strip())
                    norm_frac = row["normalized_fraction"].strip()
                    self.fraction_to_decimal[frac] = dec
                    self.decimal_to_fraction[dec] = norm_frac
                except ValueError:
                    continue

    def fraction_to_dec(self, val_str: str) -> Tuple[Optional[float], str]:
        """Convert fraction/mixed fraction string to float decimal.
        
        Returns:
            Tuple of (decimal_value, status: 'TABLE_MATCHED' | 'COMPUTED_NOT_TABLE_MATCHED' | 'INVALID')
        """
        if not val_str or not val_str.strip():
            return None, "EMPTY"

        clean_str = val_str.strip()

        # Check table match first
        if clean_str in self.fraction_to_decimal:
            return self.fraction_to_decimal[clean_str], "TABLE_MATCHED"

        # Algorithmic calculation
        try:
            # Match mixed fractions like "33-7/16", "33 7/16", "1/2"
            m = re.match(r"^(\d+)?[\s\-]?(\d+)\/(\d+)$", clean_str)
            if m:
                whole = int(m.group(1)) if m.group(1) else 0
                num = int(m.group(2))
                denom = int(m.group(3))
                if denom != 0:
                    dec_val = round(whole + (num / denom), 6)
                    return dec_val, "COMPUTED_NOT_TABLE_MATCHED"
            # Plain decimal number
            dec_val = float(clean_str)
            return dec_val, "TABLE_MATCHED"
        except Exception:
            return None, "INVALID"


# ----------------------------------------------------
# 3. House Style Rules Engine
# ----------------------------------------------------
HOUSE_STYLE_RULES: List[Tuple[re.Pattern, str, str]] = [
    # Rule 1: Trademark & registered symbol spacing (eliminate space before ® / ™)
    (
        re.compile(r"\s+([®™])"),
        r"\1",
        "Strip space before trademark and registered symbols (e.g. 'FRIGIDAIRE ®' -> 'FRIGIDAIRE®')",
    ),
    # Rule 2: Standardize hyphenated cycle count modifiers (e.g. '5 Wash Cycle' -> '5-Wash Cycle')
    (
        re.compile(r"\b(\d+)\s+Wash\s+Cycle\b", re.IGNORECASE),
        r"\1-Wash Cycle",
        "Hyphenate numeric wash cycle compound modifier",
    ),
    # Rule 3: Normalize dimension unit spacing (e.g. '24in' -> '24 in', '24-1/4in' -> '24-1/4 in')
    (
        re.compile(r"(\d+(?:[\-\/]\d+)?)\s*(in|ft|mm|cm)\b(?!\s+(?:W|H|D|Depth|Height|Width))", re.IGNORECASE),
        r"\1 \2",
        "Standardize unit spacing after numeric dimensions",
    ),
    # Rule 4: Normalize dimension orientation format (e.g. '24 in W x 24-1/4 in D')
    (
        re.compile(r"\b(\d+(?:[\-\/]\d+)?\s*in)\s*([WwHhDd])\b"),
        r"\1 \2",
        "Normalize dimension orientation spacing",
    ),
    # Rule 5: Electrical ratings formatting (e.g. '120v' -> '120 V', '15a' -> '15 A')
    (
        re.compile(r"\b(\d+)\s*(?:V|VAC|Volts)\b", re.IGNORECASE),
        r"\1 V",
        "Normalize voltage unit format to '120 V'",
    ),
    (
        re.compile(r"\b(\d+)\s*(?:A|Amps|Amperes)\b", re.IGNORECASE),
        r"\1 A",
        "Normalize amperage unit format to '15 A'",
    ),
    # Rule 6: Sound level decibel format (e.g. '47dba' -> '47 dBA')
    (
        re.compile(r"\b(\d+)\s*(?:dBA|db|decibels)\b", re.IGNORECASE),
        r"\1 dBA",
        "Normalize acoustic rating format to '47 dBA'",
    ),
]


def apply_house_style(text: Optional[str]) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    """Apply extensible house style rules for formatting, spacing, and hyphenation consistency.
    
    Args:
        text: Input text string.
        
    Returns:
        Tuple of (styled_text, applied_rules_log)
    """
    if text is None:
        return None, []

    styled = text
    applied_logs: List[Dict[str, Any]] = []

    for pattern, replacement, description in HOUSE_STYLE_RULES:
        if pattern.search(styled):
            new_styled = pattern.sub(replacement, styled)
            if new_styled != styled:
                applied_logs.append({
                    "rule": description,
                    "before": styled,
                    "after": new_styled,
                })
                styled = new_styled

    return styled, applied_logs


# Module singletons
_uom_normalizer = UOMNormalizer()
_dec_converter = DecimalFractionConverter()


def normalize_uom(raw_uom: Optional[str]) -> Tuple[Optional[str], str]:
    return _uom_normalizer.normalize(raw_uom)


def convert_decimal_fraction(val_str: str) -> Tuple[Optional[float], str]:
    return _dec_converter.fraction_to_dec(val_str)
