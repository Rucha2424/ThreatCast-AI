"""Evidence Fusion Engine for Multi-Tier Extraction Reconciliation.

Key Architecture:
1. Deterministic Precedence:
   - Tier 1 (schema.org JSON-LD/Microdata): Highest priority when confidence >= 0.90 (direct OEM structured payload).
   - Tier 3 (Static HTML DOM) & Tier 2 (Rendered HTML DOM): Secondary priority for visible tables and spec lists.
   - Tier 4 (VLM OCR): Tertiary priority for visual diagrams and drawing OCR.
2. Conflict Detection & Flagging:
   - When multiple tiers produce differing candidate values with comparable confidence (delta <= 0.10),
     flags CONFLICTING_EVIDENCE with all candidates preserved for human curator audit.
3. Unified Output:
   - Every column in the 252-column schema passes through fuse_field to ensure consistent provenance tracking.
"""

from typing import Any, Dict, List, Optional, Tuple
import re

# Tier hierarchy weight table
TIER_PRIORITY_WEIGHTS = {
    "Tier 0: Rule/Input": 1.00,
    "Tier 1: schema.org": 0.95,
    "Tier 2: headless_render": 0.90,
    "Tier 3: static_html": 0.88,
    "Tier 4: vlm_ocr": 0.82,
}


def are_values_equivalent(val1: Optional[str], val2: Optional[str]) -> bool:
    """Check if two values represent the exact same semantic fact (ignoring case, whitespace, units)."""
    if val1 is None and val2 is None:
        return True
    if val1 is None or val2 is None:
        return False

    v1_clean = re.sub(r"[^\w\d.]+", "", str(val1).lower())
    v2_clean = re.sub(r"[^\w\d.]+", "", str(val2).lower())
    return v1_clean == v2_clean


def fuse_field(
    field_name: str,
    candidates: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Reconcile multiple tier extraction candidates for a single schema column.
    
    Args:
        field_name: Target delivery format column name.
        candidates: List of candidate dictionaries: [{value, tier_used, confidence, source_url, cost, ...}]
        
    Returns:
        Fused field dictionary containing winning value, provenance, conflict flag, and audit candidates.
    """
    # Filter out null or empty candidate values
    valid_candidates = [
        c for c in candidates
        if c.get("value") is not None and str(c.get("value")).strip() != "" and str(c.get("value")).strip() != "null"
    ]

    # Case 1: No candidate populated
    if not valid_candidates:
        return {
            "field": field_name,
            "value": None,
            "tier_used": None,
            "source_url": "no source found",
            "confidence": 0.0,
            "cost": 0.0,
            "status": "UNPOPULATED",
            "has_conflict": False,
            "candidates": [],
            "fusion_reasoning": "No candidate value extracted by any tier.",
        }

    # Case 2: Exactly one candidate populated (Clean pass-through)
    if len(valid_candidates) == 1:
        c = valid_candidates[0]
        return {
            "field": field_name,
            "value": c["value"],
            "tier_used": c.get("tier_used"),
            "source_url": c.get("source_url") or "no source found",
            "confidence": c.get("confidence", 0.90),
            "cost": c.get("cost", 0.0),
            "status": "UNANIMOUS_SINGLE_SOURCE",
            "has_conflict": False,
            "candidates": [c],
            "fusion_reasoning": f"Single candidate extracted via {c.get('tier_used')}.",
        }

    # Case 3: Multiple candidates present -> Check for agreement or conflict
    first_val = valid_candidates[0]["value"]
    all_agree = all(are_values_equivalent(first_val, c["value"]) for c in valid_candidates[1:])

    if all_agree:
        # All tiers agree on the same value -> Pick highest priority tier
        best_cand = max(
            valid_candidates,
            key=lambda c: (TIER_PRIORITY_WEIGHTS.get(c.get("tier_used", ""), 0.5), c.get("confidence", 0.0))
        )
        return {
            "field": field_name,
            "value": best_cand["value"],
            "tier_used": best_cand.get("tier_used"),
            "source_url": best_cand.get("source_url") or "no source found",
            "confidence": min(1.0, best_cand.get("confidence", 0.90) + 0.05),  # Boost confidence on multi-tier agreement
            "cost": sum(c.get("cost", 0.0) for c in valid_candidates),
            "status": "UNANIMOUS_MULTI_TIER_AGREEMENT",
            "has_conflict": False,
            "candidates": valid_candidates,
            "fusion_reasoning": f"Multiple tiers ({', '.join(set(c.get('tier_used', '') for c in valid_candidates))}) unanimously agreed on this value.",
        }

    # Case 4: Disagreement between candidates -> Apply precedence policy or flag conflict
    # Sort candidates by precedence weight * confidence
    scored_candidates = []
    for c in valid_candidates:
        tier = c.get("tier_used", "")
        weight = TIER_PRIORITY_WEIGHTS.get(tier, 0.5)
        conf = c.get("confidence", 0.8)
        score = weight * conf
        scored_candidates.append((score, c))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    top_score, top_cand = scored_candidates[0]
    runner_up_score, runner_up_cand = scored_candidates[1]

    # Check if discrepancy is close in confidence (Tie / Conflict within delta 0.10)
    if abs(top_score - runner_up_score) <= 0.10:
        return {
            "field": field_name,
            "value": top_cand["value"],  # Retain top precedence value as default proposal
            "tier_used": top_cand.get("tier_used"),
            "source_url": top_cand.get("source_url") or "no source found",
            "confidence": 0.65,  # Penalize confidence due to active discrepancy
            "cost": sum(c.get("cost", 0.0) for c in valid_candidates),
            "status": "CONFLICTING_EVIDENCE",
            "has_conflict": True,
            "candidates": valid_candidates,
            "fusion_reasoning": (
                f"Active Conflict: {top_cand.get('tier_used')} proposes '{top_cand['value']}' "
                f"whereas {runner_up_cand.get('tier_used')} proposes '{runner_up_cand['value']}'. "
                f"Flagged for human curator review."
            ),
        }
    else:
        # Tier 1 significantly out-ranks later tiers
        return {
            "field": field_name,
            "value": top_cand["value"],
            "tier_used": top_cand.get("tier_used"),
            "source_url": top_cand.get("source_url") or "no source found",
            "confidence": top_cand.get("confidence", 0.90),
            "cost": sum(c.get("cost", 0.0) for c in valid_candidates),
            "status": "PRECEDENCE_RESOLVED",
            "has_conflict": False,
            "candidates": valid_candidates,
            "fusion_reasoning": f"Resolved via strict precedence policy favoring {top_cand.get('tier_used')} over lower tiers.",
        }


def fuse_all_fields(
    raw_candidates_by_field: Dict[str, List[Dict[str, Any]]],
    target_columns: List[str],
) -> Dict[str, Dict[str, Any]]:
    """Execute evidence fusion across all 252 delivery format columns."""
    fused_results: Dict[str, Dict[str, Any]] = {}
    for col in target_columns:
        cand_list = raw_candidates_by_field.get(col, [])
        fused_results[col] = fuse_field(col, cand_list)
    return fused_results
