"""Manufacturer and Brand Resolution layer for UniHack product data enrichment.

Key Architecture:
1. Reference Loader: Reads shared/manufacturer_brand_list.csv into an in-memory graph of OEMs, distributors, and brand tokens.
2. Correction Memory: Checked FIRST before any fuzzy logic (wired to backend.pipeline.correction_memory).
3. Part_Manuf Resolution: Exact and fuzzy matching via RapidFuzz.
4. Part_Desc Fallback: When Part_Manuf is missing or flagged as a distributor (looks_like_distributor: true),
   the pipeline falls back to scanning the free-text Part_Desc for controlled brand tokens using strict word boundaries (\b<brand>\b).
5. Zero Hardcoding / Zero Mocking: All resolution rules and brand vocabularies are completely data-driven from /shared.
   No SKU-specific or model-prefix branches exist. If an item cannot be confidently matched, it honestly flags NEEDS_MANUAL_REVIEW.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
import csv
import os
import re
from dataclasses import dataclass
from rapidfuzz import fuzz, process

from backend.pipeline.correction_memory import lookup_correction


@dataclass
class ManufacturerResolutionResult:
    manufacturer: Optional[str]
    brand: Optional[str]
    method: str  # 'CORRECTION_MEMORY', 'DIRECT_MATCH', 'PART_DESC_FALLBACK', 'NEEDS_MANUAL_REVIEW'
    confidence: float
    matched_entry: Optional[str] = None
    matched_token: Optional[str] = None
    distributor_context: Optional[str] = None
    needs_review: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "manufacturer": self.manufacturer,
            "brand": self.brand,
            "method": self.method,
            "confidence": self.confidence,
            "matched_entry": self.matched_entry,
            "matched_token": self.matched_token,
            "distributor_context": self.distributor_context,
            "needs_review": self.needs_review,
        }


class ManufacturerResolver:
    """Data-driven resolver for manufacturer and brand normalization."""

    def __init__(self, ref_csv_path: Optional[str] = None):
        if ref_csv_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            ref_csv_path = os.path.join(base_dir, "shared", "manufacturer_brand_list.csv")

        self.ref_csv_path = ref_csv_path
        self.entries: List[Dict[str, Any]] = []
        self.raw_lookup: Dict[str, Dict[str, Any]] = {}
        self.base_name_lookup: Dict[str, Dict[str, Any]] = {}
        self.brand_token_index: List[Tuple[str, Dict[str, Any], str]] = []
        self._load_reference_data()

    def _load_reference_data(self) -> None:
        """Load and index shared/manufacturer_brand_list.csv."""
        if not os.path.exists(self.ref_csv_path):
            raise FileNotFoundError(f"Reference file not found: {self.ref_csv_path}")

        raw_entries: List[Dict[str, Any]] = []
        brand_to_oem_map: Dict[str, Dict[str, Any]] = {}

        with open(self.ref_csv_path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("#") or not line.strip():
                    continue
                reader = csv.DictReader(
                    [line],
                    fieldnames=[
                        "raw_string",
                        "parenthetical_code",
                        "canonical_name",
                        "looks_like_distributor",
                        "inferred_brands",
                        "notes",
                    ],
                )
                row = next(reader)
                if row["raw_string"] == "raw_string":
                    continue

                is_dist = row["looks_like_distributor"].strip().lower() == "true"
                inferred_brands = [
                    b.strip() for b in row.get("inferred_brands", "").split(",") if b.strip()
                ]

                entry = {
                    "raw_string": row["raw_string"].strip(),
                    "parenthetical_code": row["parenthetical_code"].strip(),
                    "canonical_name": row["canonical_name"].strip(),
                    "looks_like_distributor": is_dist,
                    "inferred_brands": inferred_brands,
                    "notes": row.get("notes", "").strip(),
                }
                raw_entries.append(entry)

                if not is_dist and entry["raw_string"] != "-":
                    for b in inferred_brands:
                        brand_to_oem_map[b.lower()] = entry
                    if entry["canonical_name"]:
                        brand_to_oem_map[entry["canonical_name"].lower()] = entry

        self.entries = raw_entries

        seen_tokens: Set[str] = set()

        for entry in self.entries:
            raw_str = entry["raw_string"]
            self.raw_lookup[raw_str.lower()] = entry

            m = re.search(r"^(.*?)\s*\(([^)]+)\)$", raw_str)
            base_name = m.group(1).strip().lower() if m else raw_str.lower()
            self.base_name_lookup[base_name] = entry

            for brand in entry["inferred_brands"]:
                b_lower = brand.lower()
                target_oem = brand_to_oem_map.get(b_lower, entry)
                if b_lower not in seen_tokens:
                    self.brand_token_index.append((b_lower, target_oem, brand))
                    seen_tokens.add(b_lower)

            if not entry["looks_like_distributor"] and entry["raw_string"] != "-":
                c_name = entry["canonical_name"]
                if c_name:
                    c_lower = c_name.lower()
                    if c_lower not in seen_tokens:
                        self.brand_token_index.append((c_lower, entry, c_name))
                        seen_tokens.add(c_lower)

        # Sort longest brand token first for greedy token matching
        self.brand_token_index.sort(key=lambda x: len(x[0]), reverse=True)

    def correction_memory_lookup(self, raw_token: Optional[str]) -> Optional[Dict[str, Any]]:
        """Query human-verified correction memory service before any fuzzy matching."""
        return lookup_correction(raw_token)

    def resolve(
        self,
        part_manuf: Optional[str],
        part_desc: Optional[str],
        mfg_part_num: Optional[str] = None,
    ) -> ManufacturerResolutionResult:
        """Resolve manufacturer and brand from Part_Manuf and Part_Desc."""
        # Step 1: Check Correction Memory FIRST
        if part_manuf:
            corr = self.correction_memory_lookup(part_manuf)
            if corr:
                return ManufacturerResolutionResult(
                    manufacturer=corr["resolved_manufacturer"],
                    brand=corr["resolved_brand"],
                    method="CORRECTION_MEMORY",
                    confidence=1.0,
                    matched_entry=part_manuf,
                    needs_review=False,
                )

        # Step 2: Try exact and fuzzy match on Part_Manuf
        matched_entry: Optional[Dict[str, Any]] = None
        match_score: float = 0.0

        if part_manuf and part_manuf.strip():
            pm_clean = part_manuf.strip()
            pm_lower = pm_clean.lower()

            if pm_lower in self.raw_lookup:
                matched_entry = self.raw_lookup[pm_lower]
                match_score = 100.0
            elif pm_lower in self.base_name_lookup:
                matched_entry = self.base_name_lookup[pm_lower]
                match_score = 100.0
            else:
                candidates = list(self.base_name_lookup.keys())
                best_match = process.extractOne(pm_lower, candidates, scorer=fuzz.token_sort_ratio)
                if best_match and best_match[1] >= 85.0:
                    matched_entry = self.base_name_lookup[best_match[0]]
                    match_score = float(best_match[1])

        # If matched entry is a legitimate OEM (not a distributor and not placeholder '-')
        if (
            matched_entry
            and not matched_entry["looks_like_distributor"]
            and matched_entry["raw_string"] != "-"
        ):
            brand = (
                matched_entry["inferred_brands"][0]
                if matched_entry["inferred_brands"]
                else matched_entry["canonical_name"]
            )
            return ManufacturerResolutionResult(
                manufacturer=matched_entry["canonical_name"],
                brand=brand,
                method="DIRECT_MATCH",
                confidence=round(match_score / 100.0, 2),
                matched_entry=matched_entry["raw_string"],
                needs_review=False,
            )

        # Step 3: Distributor detected OR no Part_Manuf match -> Fall back to scanning Part_Desc
        # STRICT WORD-BOUNDARY MATCHING ONLY (\b<brand>\b) — prevents substring false positives (e.g. 'Shiplap Edges' != 'Edge Eyewear')
        if part_desc and part_desc.strip():
            desc_clean = part_desc.strip()
            desc_lower = desc_clean.lower()

            for token_lower, oem_entry, display_brand in self.brand_token_index:
                # Require full word boundary match
                pattern = r"\b" + re.escape(token_lower) + r"\b"
                if re.search(pattern, desc_lower):
                    mfr_name = oem_entry["canonical_name"]
                    return ManufacturerResolutionResult(
                        manufacturer=mfr_name,
                        brand=display_brand,
                        method="PART_DESC_FALLBACK",
                        confidence=0.90,
                        matched_token=display_brand,
                        distributor_context=matched_entry["raw_string"] if matched_entry else part_manuf,
                        needs_review=False,
                    )

        # Step 4: No match found -> Flag as NEEDS_MANUAL_REVIEW honestly
        return ManufacturerResolutionResult(
            manufacturer=None,
            brand=None,
            method="NEEDS_MANUAL_REVIEW",
            confidence=0.0,
            distributor_context=part_manuf,
            needs_review=True,
        )


# Singleton instance for module-level convenience
_default_resolver: Optional[ManufacturerResolver] = None


def get_resolver() -> ManufacturerResolver:
    global _default_resolver
    if _default_resolver is None:
        _default_resolver = ManufacturerResolver()
    return _default_resolver


def resolve_manufacturer(
    part_manuf: Optional[str],
    part_desc: Optional[str],
    mfg_part_num: Optional[str] = None,
) -> ManufacturerResolutionResult:
    """Functional interface for resolving manufacturer and brand."""
    return get_resolver().resolve(part_manuf, part_desc, mfg_part_num=mfg_part_num)
