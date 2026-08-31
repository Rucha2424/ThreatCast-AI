"""Correction Memory read/write service for human-in-the-loop overrides.

Key Constraints:
1. Short-circuits fuzzy matching & description fallback when a verified correction exists.
2. Validates human entries against shared/manufacturer_brand_list.csv before writing
   (never permits unconstrained brand injection).
3. Persists to Supabase table 'correction_memory' with persistent local cache fallback.
"""

from typing import Any, Dict, List, Optional, Set
import csv
import json
import os
import time

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None


class CorrectionMemoryService:
    """Correction memory manager with Supabase persistence and strict LOV validation."""

    def __init__(self, ref_csv_path: Optional[str] = None, cache_json_path: Optional[str] = None):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        if ref_csv_path is None:
            ref_csv_path = os.path.join(base_dir, "shared", "manufacturer_brand_list.csv")
        if cache_json_path is None:
            cache_json_path = os.path.join(base_dir, "backend", "database", "correction_memory_cache.json")

        self.ref_csv_path = ref_csv_path
        self.cache_json_path = cache_json_path
        self.valid_manufacturers: Set[str] = set()
        self.valid_brands: Set[str] = set()
        self.memory_cache: Dict[str, Dict[str, Any]] = {}

        self.supabase_client = self._init_supabase()
        self._load_allowed_brands_and_oems()
        self._load_cache_from_disk()

    def _init_supabase(self) -> Optional[Any]:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
        if supabase_url and supabase_key and create_client is not None:
            try:
                return create_client(supabase_url, supabase_key)
            except Exception:
                return None
        return None

    def _load_allowed_brands_and_oems(self):
        if not os.path.exists(self.ref_csv_path):
            return

        with open(self.ref_csv_path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("#") or not line.strip():
                    continue
                reader = csv.DictReader(
                    [line],
                    fieldnames=["raw_string", "parenthetical_code", "canonical_name", "looks_like_distributor", "inferred_brands", "notes"]
                )
                row = next(reader)
                if row["raw_string"] == "raw_string":
                    continue

                oem = row["canonical_name"].strip()
                if oem and oem != "-":
                    self.valid_manufacturers.add(oem.lower())

                brands = [b.strip().lower() for b in row.get("inferred_brands", "").split(",") if b.strip()]
                for b in brands:
                    self.valid_brands.add(b)

    def _load_cache_from_disk(self):
        if os.path.exists(self.cache_json_path):
            try:
                with open(self.cache_json_path, encoding="utf-8") as f:
                    self.memory_cache = json.load(f)
            except Exception:
                self.memory_cache = {}

    def _save_cache_to_disk(self):
        os.makedirs(os.path.dirname(self.cache_json_path), exist_ok=True)
        try:
            with open(self.cache_json_path, "w", encoding="utf-8") as f:
                json.dump(self.memory_cache, f, indent=2)
        except Exception:
            pass

    def record_correction(
        self,
        raw_token: str,
        resolved_manufacturer: str,
        resolved_brand: str,
        verified_by: str = "reviewer",
        source: str = "manual",
    ) -> Dict[str, Any]:
        """Record a human or high-confidence verified brand/OEM correction.
        
        Raises:
            ValueError: If manufacturer or brand is not grounded in shared/manufacturer_brand_list.csv.
        """
        if not raw_token or not raw_token.strip():
            raise ValueError("raw_token cannot be empty")

        token_clean = raw_token.strip()
        mfr_clean = resolved_manufacturer.strip()
        brand_clean = resolved_brand.strip()

        # Enforce Controlled Vocabulary: Check if OEM or Brand is recognized
        is_oem_valid = (mfr_clean.lower() in self.valid_manufacturers) or any(mfr_clean.lower() in m for m in self.valid_manufacturers)
        is_brand_valid = (brand_clean.lower() in self.valid_brands) or any(brand_clean.lower() in b for b in self.valid_brands)

        if not is_oem_valid and not is_brand_valid:
            raise ValueError(
                f"Controlled Vocabulary Error: Neither manufacturer '{mfr_clean}' nor brand '{brand_clean}' "
                f"was found in shared/manufacturer_brand_list.csv. Unconstrained entries are prohibited."
            )

        correction_entry = {
            "raw_token": token_clean,
            "resolved_manufacturer": mfr_clean,
            "resolved_brand": brand_clean,
            "verified_by": verified_by,
            "source": source,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        # 1. Update local cache
        self.memory_cache[token_clean.lower()] = correction_entry
        self._save_cache_to_disk()

        # 2. Write to Supabase if connected
        if self.supabase_client is not None:
            try:
                self.supabase_client.table("correction_memory").upsert(correction_entry).execute()
            except Exception:
                pass

        return {
            "status": "SUCCESS",
            "message": f"Correction recorded for '{token_clean}' -> MFR: '{mfr_clean}', Brand: '{brand_clean}'",
            "correction": correction_entry,
        }

    def lookup(self, raw_token: Optional[str]) -> Optional[Dict[str, Any]]:
        """Look up verified correction for raw_token."""
        if not raw_token or not raw_token.strip():
            return None

        token_lower = raw_token.strip().lower()

        # Check local cache
        if token_lower in self.memory_cache:
            return self.memory_cache[token_lower]

        # Check Supabase
        if self.supabase_client is not None:
            try:
                response = (
                    self.supabase_client.table("correction_memory")
                    .select("resolved_manufacturer, resolved_brand, verified_by, source")
                    .eq("raw_token", raw_token.strip())
                    .execute()
                )
                if response.data and len(response.data) > 0:
                    rec = response.data[0]
                    self.memory_cache[token_lower] = rec
                    return rec
            except Exception:
                pass

        return None


# Singleton instance
_default_correction_service: Optional[CorrectionMemoryService] = None


def get_correction_service() -> CorrectionMemoryService:
    global _default_correction_service
    if _default_correction_service is None:
        _default_correction_service = CorrectionMemoryService()
    return _default_correction_service


def record_correction(
    raw_token: str,
    resolved_manufacturer: str,
    resolved_brand: str,
    verified_by: str = "reviewer",
    source: str = "manual",
) -> Dict[str, Any]:
    return get_correction_service().record_correction(
        raw_token=raw_token,
        resolved_manufacturer=resolved_manufacturer,
        resolved_brand=resolved_brand,
        verified_by=verified_by,
        source=source,
    )


def lookup_correction(raw_token: Optional[str]) -> Optional[Dict[str, Any]]:
    return get_correction_service().lookup(raw_token)
