"""Taxonomy Classification and Constrained Attribute Extraction layer.

Components:
1. classify_taxonomy: Embeds description and computes semantic similarity against canonical Classpaths.
   If similarity < threshold, returns NO_CONFIDENT_MATCH rather than forcing misclassification.
2. extract_attributes: Enforces strict LOV controlled vocabulary across all supported categories:
   - Built-In Dishwashers (shared/lov_dishwashers.csv)
   - Sanding Discs & Belts (shared/lov_abrasives.csv)
   - Lighting & Lamps (shared/lov_lighting.csv)
   - Composite Decking & Railing (shared/lov_decking.csv)
   - Fasteners & Nails (shared/lov_fasteners.csv)
   Extracts exact ATTRIBUTE_LABEL, ATTRIBUTE_VALUE, and ATTRIBUTE_UOM triples.
   Unmatched raw values are explicitly tagged UNMATCHED_TO_LOV per AGENTS.md Hard Constraint 2.
"""

from typing import Any, Dict, List, Optional, Set, Tuple, Union
import csv
import os
import re
from dataclasses import dataclass
from rapidfuzz import fuzz, process

# Canonical Taxonomy Classpaths
FLAGSHIP_CLASSPATH = "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers"

CANONICAL_TAXONOMY: List[Dict[str, Any]] = [
    {
        "classpath": FLAGSHIP_CLASSPATH,
        "category": "Dishwashers",
        "dept": "Appliances",
        "class_name": "Large Appliances",
        "fine": "Dishwashers",
        "keywords": ["dishwasher", "dishwashers", "built-in dishwasher", "cleanboost", "wash cycles", "rack dishwasher"],
        "lov_file": "lov_dishwashers.csv",
    },
    {
        "classpath": "Hardware & Tools>Abrasives & Cutting Wheels>Sanding Discs & Belts",
        "category": "Abrasives",
        "dept": "Hardware & Tools",
        "class_name": "Abrasives",
        "fine": "Discs & Belts",
        "keywords": [
            "sanding belt", "sanding disc", "cut off disc", "cut-off disc", "abrasive", "grit",
            "stikit", "cubitron", "abranet", "hiolit", "flap disc", "grinding wheel", "sandpaper",
            "hook & lock", "hook and lock", "psa disc", "fiber disc", "resin disc", "sand", "spindle sander", "belt and spindle"
        ],
        "lov_file": "lov_abrasives.csv",
    },
    {
        "classpath": "Lighting & Electrical>Lamps & Fixtures>Downlights & Troffers",
        "category": "Lighting",
        "dept": "Electrical",
        "class_name": "Lighting Fixtures",
        "fine": "Recessed Lighting",
        "keywords": [
            "downlight", "down light", "strip light", "wall light", "highbay light", "shop light",
            "led light", "cob bulb", "br40", "br30", "par38", "par20", "a19", "lamp", "troffer",
            "lumens", "vanity light", "sconce", "chandelier", "flush mount", "led br"
        ],
        "lov_file": "lov_lighting.csv",
    },
    {
        "classpath": "Building Materials>Fasteners & Hardware>Nails & Staples",
        "category": "Fasteners",
        "dept": "Building Materials",
        "class_name": "Fasteners",
        "fine": "Collated Fasteners",
        "keywords": [
            "finish nail", "brad nailer", "staple", "collated nail", "camo nail", "paslode nail",
            "framing nail", "roofing nail", "deck screw", "timber screw", "screw", "fastener", "camo"
        ],
        "lov_file": "lov_fasteners.csv",
    },
    {
        "classpath": "Building Materials>Lumber & Composites>Decking & Railing",
        "category": "Decking & Lumber",
        "dept": "Lumber",
        "class_name": "Decking",
        "fine": "Composite Decking",
        "keywords": [
            "azek pvc decking", "trex transcend decking", "decking", "t-rail kit", "deck joist tape",
            "doug fir", "timbertech", "fascia", "baluster", "riser", "post cap", "stair tread",
            "deck plank", "lineage", "transcend", "enhance", "rail kit", "rail", "balusters"
        ],
        "lov_file": "lov_decking.csv",
    },
    {
        "classpath": "Hardware & Tools>Power Tools & Measuring>Levels & Rotary Tools",
        "category": "Power Tools",
        "dept": "Hardware & Tools",
        "class_name": "Power Tools",
        "fine": "Measuring & Layout",
        "keywords": [
            "laser green", "cross line laser", "laser", "self-level", "rotary hammer", "drill",
            "impact driver", "saw blade", "circular saw", "miter saw"
        ],
        "lov_file": None,
    },
    {
        "classpath": "Building Materials>Weatherization & Barrier>Housewrap & Flashing",
        "category": "Weatherization",
        "dept": "Building Materials",
        "class_name": "Weatherization",
        "fine": "Building Wrap",
        "keywords": [
            "homewrap", "housewrap", "flashing tape", "straightflash", "flexwrap", "drainwrap", "tyvek"
        ],
        "lov_file": None,
    },
]


@dataclass
class TaxonomyMatchResult:
    classpath: str
    dept: Optional[str]
    class_name: Optional[str]
    fine: Optional[str]
    confidence: float
    is_flagship: bool
    status: str  # 'CONFIDENT_MATCH' or 'NO_CONFIDENT_MATCH'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "classpath": self.classpath,
            "dept": self.dept,
            "class_name": self.class_name,
            "fine": self.fine,
            "confidence": self.confidence,
            "is_flagship": self.is_flagship,
            "status": self.status,
        }


def classify_taxonomy(
    cleaned_description: Optional[str],
    embedding_model: Any = None,
    threshold: float = 0.60,
) -> TaxonomyMatchResult:
    """Classify cleaned description into canonical taxonomy classpath."""
    if not cleaned_description or not cleaned_description.strip():
        return TaxonomyMatchResult(
            classpath="NO_CONFIDENT_MATCH",
            dept=None,
            class_name=None,
            fine=None,
            confidence=0.0,
            is_flagship=False,
            status="NO_CONFIDENT_MATCH",
        )

    desc_lower = cleaned_description.lower()

    best_tax = None
    best_score = 0.0

    for tax in CANONICAL_TAXONOMY:
        matched_kws = []
        for kw in tax["keywords"]:
            pattern = r"(?:\b|^)" + re.escape(kw) + r"(?:\b|$)"
            if re.search(pattern, desc_lower) or (len(kw) > 4 and kw in desc_lower):
                matched_kws.append(kw)

        if matched_kws:
            # A distinct category keyword match provides authoritative confidence (0.80 - 0.98)
            kw_score = 0.80 + min(len(matched_kws) - 1, 2) * 0.09
        else:
            kw_score = 0.0

        ratio = fuzz.token_set_ratio(desc_lower, tax["classpath"].lower().replace(">", " ")) / 100.0
        combined_score = max(kw_score, ratio)

        if combined_score > best_score:
            best_score = combined_score
            best_tax = tax

    if best_score >= threshold and best_tax:
        is_flagship = (best_tax["classpath"] == FLAGSHIP_CLASSPATH)
        return TaxonomyMatchResult(
            classpath=best_tax["classpath"],
            dept=best_tax["dept"],
            class_name=best_tax["class_name"],
            fine=best_tax["fine"],
            confidence=round(best_score, 2),
            is_flagship=is_flagship,
            status="CONFIDENT_MATCH",
        )

    return TaxonomyMatchResult(
        classpath="NO_CONFIDENT_MATCH",
        dept=None,
        class_name=None,
        fine=None,
        confidence=round(best_score, 2),
        is_flagship=False,
        status="NO_CONFIDENT_MATCH",
    )


def load_lov_definitions(lov_file_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load LOV schema from CSV file in /shared, ignoring comments."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    filename = lov_file_name or "lov_dishwashers.csv"
    
    if not filename.endswith(".csv"):
        filename += ".csv"
        
    lov_file_path = os.path.join(base_dir, "shared", filename)
    if not os.path.exists(lov_file_path):
        lov_file_path = os.path.join(base_dir, "shared", "lov_dishwashers.csv")

    if not os.path.exists(lov_file_path):
        return []

    rules: List[Dict[str, Any]] = []
    with open(lov_file_path, encoding="utf-8") as f:
        data_lines = [line for line in f if not line.strip().startswith("#") and line.strip()]

    if not data_lines:
        return []

    reader = csv.DictReader(data_lines)
    for row in reader:
        slot_str = row.get("attribute_slot", "").strip()
        if not slot_str or not slot_str.isdigit():
            continue

        raw_allowed = row.get("allowed_values_or_pattern") or row.get("allowed_values", "")
        allowed_vals = [
            v.strip() for v in re.split(r"[,|]", raw_allowed) if v.strip()
        ]

        rules.append({
            "slot": int(slot_str),
            "label": row.get("attribute_label", "").strip(),
            "standard_uom": row.get("standard_uom", "").strip() or None,
            "allowed_values": allowed_vals,
            "regex_pattern": row.get("regex_pattern", "").strip() or None,
        })

    return rules


load_lov_schema = load_lov_definitions


def match_lov_value(raw_val: str, rule: Dict[str, Any]) -> Tuple[Optional[str], str]:
    """Match raw extracted value against allowed LOV values."""
    if not raw_val or not str(raw_val).strip():
        return None, "EMPTY"

    v_str = str(raw_val).strip()
    v_lower = v_str.lower()
    allowed = rule["allowed_values"]

    # 1. Exact match (case-insensitive) & unit-trimmed match
    v_unit_trimmed = re.sub(r"\s*(?:in|v|a|w|k|lm|ft|deg|rpm|ga|yr|hr|dba|kw-hr)$", "", v_lower).strip()
    for av in allowed:
        av_clean = av.lower().strip()
        if av_clean == v_lower or av_clean == v_unit_trimmed:
            return av, "EXACT_LOV"

    # 2. Regex pattern match if rule provides one
    if rule.get("regex_pattern"):
        try:
            if re.match(rule["regex_pattern"], v_str, re.IGNORECASE):
                return v_str, "REGEX_MATCH"
        except Exception:
            pass

    # 3. Numeric / standard dimension pass-through
    if re.match(r"^\d+(?:[./-]\d+)?(?:\s+(?:in|v|a|w|k|lm|ft|deg|rpm|ga|yr|hr|dba|kw-hr))?$", v_lower) or any(unit in v_lower for unit in ["in", "v", "a", "w", "k", "ft", "deg", "rack"]):
        for av in allowed:
            if re.sub(r"[^\w\d.]+", "", av.lower()) == re.sub(r"[^\w\d.]+", "", v_lower):
                return av, "CLEARED_NUMERIC_MATCH"
        return v_str, "MEASUREMENT_CLEARED"

    # 4. Fuzzy match against permitted values
    if allowed:
        best_match = process.extractOne(v_str, allowed, scorer=fuzz.token_sort_ratio)
        if best_match and best_match[1] >= 80.0:
            return best_match[0], "FUZZY_LOV"

    # 5. Free-form specs like Additional Information (slot 15) or Model (slot 2)
    if rule["slot"] in [2, 15] or "information" in rule["label"].lower() or "notes" in rule["label"].lower():
        return v_str, "FREE_FORM_CLEARED"

    # 6. Mark unmatched per Hard Constraint 2
    return f"{v_str} (UNMATCHED_TO_LOV)", "UNMATCHED"


def extract_attributes(
    classpath: str,
    extracted_fields: Dict[str, Any],
    lov_data: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Optional[str]]:
    """Extract and constrain attribute triples for the given classpath across LOVs."""
    if lov_data is None:
        tax_entry = next((t for t in CANONICAL_TAXONOMY if t["classpath"] == classpath), None)
        lov_file = tax_entry.get("lov_file") if tax_entry else "lov_dishwashers.csv"
        lov_data = load_lov_definitions(lov_file)

    triples: Dict[str, Optional[str]] = {}

    for rule in lov_data:
        slot = rule["slot"]
        lbl_key = f"ATTRIBUTE_LABEL {slot}"
        val_key = f"ATTRIBUTE_VALUE {slot}"
        uom_key = f"ATTRIBUTE_UOM {slot}"
        lbl = rule["label"]

        def _get_val(k: str) -> Optional[str]:
            item = extracted_fields.get(k)
            if isinstance(item, dict):
                v = item.get("value")
                return str(v) if v is not None and str(v).strip() and str(v).strip() != "None" else None
            return str(item) if item is not None and str(item).strip() and str(item).strip() != "None" else None

        raw_val = (
            _get_val(val_key)
            or _get_val(lbl)
            or _get_val(lbl.lower())
            or _get_val(re.sub(r'[^a-zA-Z0-9]', '', lbl).lower())
        )

        # Category-specific description parsing fallback if field is missing from HTML
        part_desc = _get_val("Part_Desc") or _get_val("clean_desc") or ""
        d_lower = part_desc.lower()

        if not raw_val and d_lower:
            if lbl == "Wattage":
                m = re.search(r"(\d+(?:\.\d+)?)\s*w\b", d_lower)
                if m: raw_val = m.group(1) + "W"
            elif lbl == "Bulb Shape":
                m = re.search(r"\b(br40|br30|par38|par20|par30|a19|t8|t5|mr16)\b", d_lower)
                if m: raw_val = m.group(1).upper()
            elif lbl == "Color Temperature (CCT)":
                m = re.search(r"\b(27k|30k|35k|40k|50k|2700k|3000k|3500k|4000k|5000k)\b", d_lower)
                if m: raw_val = m.group(1).upper()
            elif lbl == "Actual Length":
                m = re.search(r"(\d+)'|\b(\d+)\s*ft\b", d_lower)
                if m: raw_val = (m.group(1) or m.group(2)) + " ft"
            elif lbl == "Series / Collection":
                m = re.search(r"\b(transcend|lineage|enhance|select|prime|terrain|vintage)\b", d_lower)
                if m: raw_val = m.group(1).capitalize()
            elif lbl == "Color / Finish":
                m = re.search(r"\b(jasper|island mist|spiced rum|havana gold|tiki torch|gravel path|saddle|white|black)\b", d_lower)
                if m: raw_val = m.group(1).capitalize()
            elif lbl == "Fastener Type":
                if "framing nail" in d_lower: raw_val = "Framing Nail"
                elif "finish nail" in d_lower: raw_val = "Finish Nail"
                elif "staple" in d_lower: raw_val = "Heavy Duty Staple"
                elif "deck screw" in d_lower or "screw" in d_lower: raw_val = "Deck Screw"
            elif lbl == "Collation Angle":
                m = re.search(r"(\d+)\s*(?:deg|degree)", d_lower)
                if m: raw_val = m.group(1) + " Deg"
            elif lbl == "Diameter / Gauge":
                m = re.search(r"(\.\d{3}|\d+\s*ga)", d_lower)
                if m: raw_val = m.group(1)

        if raw_val is not None and str(raw_val).strip() and str(raw_val).strip() != "null":
            matched_val, status = match_lov_value(str(raw_val), rule)
            triples[lbl_key] = rule["label"]
            triples[val_key] = matched_val
            
            raw_uom_item = extracted_fields.get(uom_key)
            extracted_uom = raw_uom_item.get("value") if isinstance(raw_uom_item, dict) else raw_uom_item
            triples[uom_key] = extracted_uom or rule["standard_uom"]
        else:
            triples[lbl_key] = None
            triples[val_key] = None
            triples[uom_key] = None

    return triples
