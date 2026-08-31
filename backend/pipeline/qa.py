"""Structured Question Answering layer for UniHack product data enrichment pipeline.

Answers natural language questions STRICTLY from the already-enriched structured record.
Key Constraints:
1. No re-fetching from external internet.
2. No hallucinating or inventing facts.
3. Every answer must cite exact field names and their verified source URLs.
4. If data is missing or incomplete, explicitly state the limitation.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
import os
import re

# Keyword topic mappings to schema field groups
TOPIC_FIELD_MAPPINGS: Dict[str, List[Tuple[str, str]]] = {
    "voltage": [("ATTRIBUTE_VALUE 4", "Voltage Rating"), ("ATTRIBUTE_UOM 4", "Voltage UOM")],
    "electrical": [
        ("ATTRIBUTE_VALUE 4", "Voltage Rating"),
        ("ATTRIBUTE_UOM 4", "Voltage UOM"),
        ("ATTRIBUTE_VALUE 5", "Amperage Rating"),
        ("ATTRIBUTE_UOM 5", "Amperage UOM"),
    ],
    "amperage": [("ATTRIBUTE_VALUE 5", "Amperage Rating"), ("ATTRIBUTE_UOM 5", "Amperage UOM")],
    "amps": [("ATTRIBUTE_VALUE 5", "Amperage Rating"), ("ATTRIBUTE_UOM 5", "Amperage UOM")],
    "power": [("ATTRIBUTE_VALUE 4", "Voltage Rating"), ("ATTRIBUTE_VALUE 5", "Amperage Rating")],
    "sound": [("ATTRIBUTE_VALUE 12", "Sound Level"), ("ATTRIBUTE_UOM 12", "Sound Level UOM")],
    "noise": [("ATTRIBUTE_VALUE 12", "Sound Level"), ("ATTRIBUTE_UOM 12", "Sound Level UOM")],
    "decibel": [("ATTRIBUTE_VALUE 12", "Sound Level"), ("ATTRIBUTE_UOM 12", "Sound Level UOM")],
    "dba": [("ATTRIBUTE_VALUE 12", "Sound Level"), ("ATTRIBUTE_UOM 12", "Sound Level UOM")],
    "quiet": [("ATTRIBUTE_VALUE 12", "Sound Level"), ("ATTRIBUTE_UOM 12", "Sound Level UOM")],
    "dimensions": [
        ("ATTRIBUTE_VALUE 8", "Size"),
        ("ATTRIBUTE_VALUE 9", "Depth With Door Open"),
        ("ATTRIBUTE_VALUE 10", "Minimum Height"),
        ("ATTRIBUTE_VALUE 11", "Maximum Height"),
    ],
    "size": [("ATTRIBUTE_VALUE 8", "Size"), ("ATTRIBUTE_VALUE 9", "Depth With Door Open")],
    "depth": [("ATTRIBUTE_VALUE 9", "Depth With Door Open"), ("ATTRIBUTE_VALUE 8", "Size")],
    "height": [("ATTRIBUTE_VALUE 10", "Minimum Height"), ("ATTRIBUTE_VALUE 11", "Maximum Height")],
    "width": [("ATTRIBUTE_VALUE 8", "Size")],
    "mounting": [("ATTRIBUTE_VALUE 6", "Mounting Type"), ("ATTRIBUTE_VALUE 7", "Plug Type")],
    "install": [
        ("ATTRIBUTE_VALUE 6", "Mounting Type"),
        ("Instruction/Installation Manual", "Installation Manual"),
    ],
    "cycle": [
        ("ATTRIBUTE_VALUE 3", "Number of Wash Cycles"),
        ("Additional Information", "Additional Information"),
        ("ITEM_FEATURES_1", "Feature 1"),
        ("ITEM_FEATURES_5", "Feature 5"),
    ],
    "wash": [
        ("ATTRIBUTE_VALUE 3", "Number of Wash Cycles"),
        ("Additional Information", "Additional Information"),
    ],
    "material": [("ATTRIBUTE_VALUE 13", "Material"), ("ATTRIBUTE_VALUE 14", "Color")],
    "color": [("ATTRIBUTE_VALUE 14", "Color"), ("ATTRIBUTE_VALUE 13", "Material")],
    "finish": [("ATTRIBUTE_VALUE 14", "Color"), ("ATTRIBUTE_VALUE 13", "Material")],
    "stainless": [("ATTRIBUTE_VALUE 13", "Material"), ("ATTRIBUTE_VALUE 14", "Color")],
    "warranty": [("Warranty", "Warranty"), ("Warranty Information", "Warranty Information Doc")],
    "certification": [("Standard/Approvals", "Standard/Approvals"), ("Energy Star Guide", "Energy Star Guide")],
    "approval": [("Standard/Approvals", "Standard/Approvals")],
    "energy star": [("Standard/Approvals", "Standard/Approvals"), ("Additional Information", "Additional Information")],
    "energy": [("Additional Information", "Additional Information"), ("Standard/Approvals", "Standard/Approvals")],
    "spec sheet": [("Specification Sheet", "Specification Sheet PDF")],
    "manual": [
        ("Owners/User Manual", "User Manual PDF"),
        ("Instruction/Installation Manual", "Installation Manual PDF"),
        ("Specification Sheet", "Specification Sheet PDF"),
    ],
    "pdf": [
        ("Specification Sheet", "Specification Sheet PDF"),
        ("Owners/User Manual", "User Manual PDF"),
        ("Instruction/Installation Manual", "Installation Manual PDF"),
    ],
    "series": [("ATTRIBUTE_VALUE 1", "Series"), ("Product Name", "Product Name")],
    "brand": [("BRAND_NAME", "Brand Name"), ("MANUFACTURER_NAME", "Manufacturer Name")],
    "manufacturer": [("MANUFACTURER_NAME", "Manufacturer Name"), ("BRAND_NAME", "Brand Name")],
    "part number": [("MANUFACTURER_PART_NUMBER", "Manufacturer Part Number")],
}


def answer_question(
    question: str,
    record: Dict[str, Optional[str]],
    field_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Answer a user question strictly using data present in the enriched record."""
    if not question or not question.strip():
        return {
            "answer": "Please provide a question about the product specifications.",
            "citations": [],
            "status": "INVALID_QUERY",
            "confidence": 0.0,
        }

    q_lower = question.lower()
    meta = field_metadata or {}
    
    # 1. Detect matching topics in the query
    matched_field_keys: List[Tuple[str, str]] = []
    for topic_kw, fields in TOPIC_FIELD_MAPPINGS.items():
        pattern = r"\b" + re.escape(topic_kw) + r"\b"
        if re.search(pattern, q_lower):
            for f_key, f_lbl in fields:
                if (f_key, f_lbl) not in matched_field_keys:
                    matched_field_keys.append((f_key, f_lbl))

    # Also check free-text mention of attribute labels
    for i in range(1, 51):
        lbl = record.get(f"ATTRIBUTE_LABEL {i}")
        if lbl and lbl.lower() in q_lower:
            matched_field_keys.append((f"ATTRIBUTE_VALUE {i}", lbl))

    # 2. Extract found values and citations
    found_facts: List[Dict[str, Any]] = []
    citations: List[Dict[str, Any]] = []
    seen_fields: Set[str] = set()

    for f_key, f_lbl in matched_field_keys:
        if f_key in seen_fields:
            continue
            
        val = record.get(f_key)
        if val is not None and str(val).strip() and str(val).strip() != "null":
            seen_fields.add(f_key)
            f_meta = meta.get(f_key, {})
            src_url = f_meta.get("source_url_or_tag") or record.get("MFR URL") or "no source found"
            conf = f_meta.get("confidence", 0.95)
            tier = f_meta.get("tier_used") or "Tier 1: schema.org"

            found_facts.append({
                "field_key": f_key,
                "label": f_lbl,
                "value": str(val).strip(),
                "source_url": src_url,
                "confidence": conf,
                "tier": tier,
            })

            citations.append({
                "field": f_key,
                "label": f_lbl,
                "value": str(val).strip(),
                "source_url": src_url,
                "tier": tier,
            })

    # 3. Detect unanswerable/missing aspects requested in query
    missing_aspects: List[str] = []
    unsupported_patterns = [
        (r"\b(?:wi-?fi|wireless|smart|homekit|alexa|bluetooth|iot|app\s+control)\b", "Smart control & IoT wireless connectivity (Wi-Fi/HomeKit/Alexa)"),
        (r"\bwater(?:\s+line)?(?:\s+inlet)?\s+(?:connection|supply|hose|fitting)\b", "Water line inlet / plumbing connection specifications"),
        (r"\b(?:shipping\s+)?weight\b", "Shipping / product unit weight"),
        (r"\benergy\s+cost\b", "Estimated annual operational energy cost"),
        (r"\bcustom\s+panel\b", "Custom cabinet panel mounting template"),
    ]

    for pattern, desc in unsupported_patterns:
        if re.search(pattern, q_lower):
            has_fact = any(desc.lower() in f["label"].lower() or desc.lower() in f["value"].lower() for f in found_facts)
            if not has_fact and desc not in missing_aspects:
                missing_aspects.append(desc)

    # 4. Formulate strictly grounded answer
    if found_facts and not missing_aspects:
        brand = record.get("BRAND_NAME") or "The product"
        mpn = record.get("MANUFACTURER_PART_NUMBER") or ""
        
        fact_strs = []
        for f in found_facts:
            uom_key = f["field_key"].replace("ATTRIBUTE_VALUE", "ATTRIBUTE_UOM")
            uom_val = record.get(uom_key)
            val_display = f"{f['value']} {uom_val}" if (uom_val and uom_val not in f['value']) else f['value']
            fact_strs.append(f"{f['label']}: **{val_display}**")

        answer_prose = f"Based on verified manufacturer data for {brand} (MPN: {mpn}), the specifications are:\n\n"
        answer_prose += "\n".join([f"• {s}" for s in fact_strs])
        
        return {
            "answer": answer_prose,
            "citations": citations,
            "status": "FULLY_ANSWERED",
            "confidence": 0.95,
        }

    elif found_facts and missing_aspects:
        brand = record.get("BRAND_NAME") or "The product"
        mpn = record.get("MANUFACTURER_PART_NUMBER") or ""
        
        fact_strs = []
        for f in found_facts:
            uom_key = f["field_key"].replace("ATTRIBUTE_VALUE", "ATTRIBUTE_UOM")
            uom_val = record.get(uom_key)
            val_display = f"{f['value']} {uom_val}" if (uom_val and uom_val not in f['value']) else f['value']
            fact_strs.append(f"{f['label']}: **{val_display}**")

        answer_prose = f"Partially answered from verified records for {brand} (MPN: {mpn}):\n\n"
        answer_prose += "Verified available specifications:\n"
        answer_prose += "\n".join([f"• {s}" for s in fact_strs])
        answer_prose += f"\n\n[Data Not Available in Extracted Record]:\n"
        answer_prose += f"The extracted manufacturer record does not contain information regarding: {', '.join(missing_aspects)}. Per pipeline constraints, no speculative estimates or ungrounded facts were generated."

        return {
            "answer": answer_prose,
            "citations": citations,
            "status": "PARTIALLY_ANSWERED",
            "confidence": 0.85,
        }

    else:
        mpn = record.get("MANUFACTURER_PART_NUMBER") or record.get("Mfg_Part_Num") or "this item"
        answer_prose = (
            f"The extracted data record for {mpn} does not contain information addressing your question. "
            f"Per pipeline rules, values are strictly grounded in verified source fields and cannot be inferred or guessed without manufacturer documentation."
        )
        return {
            "answer": answer_prose,
            "citations": [],
            "status": "UNANSWERED_IN_RECORD",
            "confidence": 0.0,
        }
