"""Extraction Cascade Layer (Tier 1: schema.org JSON-LD / Microdata, Tier 3: Static HTML DOM).

Architecture:
1. extract_tier1_schema_org: Parses JSON-LD and microdata Product markup, returning structured
   fields plus the exact schema.org properties they were extracted from.
2. extract_tier3_static_html: General BeautifulSoup parser across visible spec tables, definition lists,
   bullet points, and key-value pairs without being keyed to any single manufacturer's DOM structure.
3. run_extraction_cascade: Executes Tier 1 first, falls back to Tier 3 for missing fields, engages Tier 2
   (Playwright) if JS-rendered or missing required fields, and invokes Tier 4 (VLM) if diagram images exist.
   Every field returns {field, value, tier_used, source_url, confidence} or {field, value: None, tier_used: None,
   source: "no source found", confidence: 0} — never silently omitted, never invented.
4. Logs tier usage and real cost accounting per field.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
import json
import logging
import os
import re
from bs4 import BeautifulSoup

logger = logging.getLogger("unihack.extraction")

# Load canonical 252 delivery format columns dynamically if available
DELIVERY_FORMAT_COLUMNS: List[str] = []
_schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/expected_output_delivery_format.csv"))
if os.path.exists(_schema_path):
    import csv
    with open(_schema_path, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        DELIVERY_FORMAT_COLUMNS = [c.strip() for c in next(reader) if c.strip()]


def extract_tier1_schema_org(html: str) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """Parse JSON-LD and Microdata Product markup from raw HTML."""
    if not html or not html.strip():
        return {}, {}

    soup = BeautifulSoup(html, "html.parser")
    fields: Dict[str, Any] = {}
    provenance: Dict[str, str] = {}

    # 1. Parse JSON-LD blocks
    script_tags = soup.find_all("script", type=re.compile(r"application/ld\+json", re.I))
    for script in script_tags:
        if not script.string:
            continue
        try:
            data = json.loads(script.string.strip())
            items = data if isinstance(data, list) else [data]
            for item in items:
                # Handle @graph wrapper
                if isinstance(item, dict) and "@graph" in item:
                    graph_items = item["@graph"] if isinstance(item["@graph"], list) else [item["@graph"]]
                else:
                    graph_items = [item]

                for node in graph_items:
                    if not isinstance(node, dict):
                        continue
                    ntype = str(node.get("@type", "")).lower()
                    if "product" in ntype or "itempage" in ntype or "individualproduct" in ntype or not node.get("@type"):
                        # Extract core identity
                        if "name" in node and node["name"]:
                            fields["Product Name"] = str(node["name"]).strip()
                            provenance["Product Name"] = "schema.org:Product.name"

                        if "sku" in node and node["sku"]:
                            fields["MANUFACTURER_PART_NUMBER"] = str(node["sku"]).strip()
                            provenance["MANUFACTURER_PART_NUMBER"] = "schema.org:Product.sku"
                        elif "mpn" in node and node["mpn"]:
                            fields["MANUFACTURER_PART_NUMBER"] = str(node["mpn"]).strip()
                            provenance["MANUFACTURER_PART_NUMBER"] = "schema.org:Product.mpn"

                        if "brand" in node:
                            brand_val = node["brand"]
                            if isinstance(brand_val, dict):
                                brand_str = brand_val.get("name")
                            else:
                                brand_str = str(brand_val)
                            if brand_str:
                                fields["BRAND_NAME"] = brand_str.strip()
                                provenance["BRAND_NAME"] = "schema.org:Product.brand.name"

                        if "manufacturer" in node:
                            mfr_val = node["manufacturer"]
                            if isinstance(mfr_val, dict):
                                mfr_str = mfr_val.get("name")
                            else:
                                mfr_str = str(mfr_val)
                            if mfr_str:
                                fields["MANUFACTURER_NAME"] = mfr_str.strip()
                                provenance["MANUFACTURER_NAME"] = "schema.org:Product.manufacturer.name"

                        if "description" in node and node["description"]:
                            fields["MARKETING_DESCRIPTION"] = str(node["description"]).strip()
                            provenance["MARKETING_DESCRIPTION"] = "schema.org:Product.description"

                        if "image" in node:
                            img = node["image"]
                            img_url = img[0] if isinstance(img, list) and img else (img.get("url") if isinstance(img, dict) else str(img))
                            if img_url:
                                fields["Product Image"] = img_url.strip()
                                provenance["Product Image"] = "schema.org:Product.image"

                        # Extract additionalProperty specs
                        add_props = node.get("additionalProperty", [])
                        if isinstance(add_props, list):
                            for prop in add_props:
                                if isinstance(prop, dict) and "name" in prop and "value" in prop:
                                    p_name = str(prop["name"]).strip()
                                    p_val = str(prop["value"]).strip()
                                    if p_name and p_val:
                                        fields[p_name] = p_val
                                        provenance[p_name] = f"schema.org:Product.additionalProperty[{p_name}]"

        except Exception:
            continue

    # 2. Parse Microdata itemprop attributes
    product_scopes = soup.find_all(attrs={"itemscope": True, "itemtype": re.compile(r"schema\.org/Product", re.I)})
    if not product_scopes:
        product_scopes = [soup]

    for scope in product_scopes:
        for tag in scope.find_all(attrs={"itemprop": True}):
            prop_name = tag["itemprop"].strip()
            prop_val = tag.get("content") or tag.get_text(separator=" ", strip=True)
            if not prop_val:
                continue

            if prop_name == "name" and "Product Name" not in fields:
                fields["Product Name"] = prop_val
                provenance["Product Name"] = "microdata:itemprop[name]"
            elif prop_name in ["sku", "mpn"] and "MANUFACTURER_PART_NUMBER" not in fields:
                fields["MANUFACTURER_PART_NUMBER"] = prop_val
                provenance["MANUFACTURER_PART_NUMBER"] = f"microdata:itemprop[{prop_name}]"
            elif prop_name == "brand" and "BRAND_NAME" not in fields:
                fields["BRAND_NAME"] = prop_val
                provenance["BRAND_NAME"] = "microdata:itemprop[brand]"
            elif prop_name == "description" and "MARKETING_DESCRIPTION" not in fields:
                fields["MARKETING_DESCRIPTION"] = prop_val
                provenance["MARKETING_DESCRIPTION"] = "microdata:itemprop[description]"
            elif prop_name == "image" and "Product Image" not in fields:
                fields["Product Image"] = tag.get("src") or prop_val
                provenance["Product Image"] = "microdata:itemprop[image]"

    return fields, provenance


def extract_tier3_static_html(
    html: str,
    target_fields: Optional[List[str]] = None,
) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """Parse HTML DOM specifications across tables, definition lists, bullets, and links."""
    if not html or not html.strip():
        return {}, {}

    soup = BeautifulSoup(html, "html.parser")
    fields: Dict[str, Any] = {}
    provenance: Dict[str, str] = {}

    # Extract marketing/hero copy from paragraphs
    for p in soup.find_all(["p", "div"], class_=re.compile(r"description|marketing|overview|summary|intro", re.I)):
        text = p.get_text(separator=" ", strip=True)
        if len(text) > 40 and not text.lower().startswith("copyright") and "MARKETING_DESCRIPTION" not in fields:
            fields["MARKETING_DESCRIPTION"] = text
            provenance["MARKETING_DESCRIPTION"] = "DOM:p.description"
            break

    # Extract specs from HTML tables
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            th = row.find(["th", "td"])
            tds = row.find_all("td")
            if th and len(tds) >= 1:
                key = th.get_text(separator=" ", strip=True).rstrip(":")
                val = tds[-1].get_text(separator=" ", strip=True) if len(tds) > 1 or th.name == "th" else ""
                if key and val and key.lower() != val.lower():
                    fields[key] = val
                    provenance[key] = "DOM:table.tr"

    # Extract specs from Definition Lists (<dl><dt><dd>)
    for dl in soup.find_all("dl"):
        dts = dl.find_all("dt")
        dds = dl.find_all("dd")
        for dt, dd in zip(dts, dds):
            k = dt.get_text(separator=" ", strip=True).rstrip(":")
            v = dd.get_text(separator=" ", strip=True)
            if k and v:
                fields[k] = v
                provenance[k] = "DOM:dl.dt-dd"

    # Extract PDF / Cut Sheet links
    ref_idx = 1
    for a in soup.find_all("a", href=re.compile(r"\.pdf($|\?)", re.I)):
        href = a["href"].strip()
        link_text = a.get_text(separator=" ", strip=True)
        if href and ref_idx <= 10:
            fields[f"Ref URL {ref_idx}"] = href
            fields[f"Ref Description {ref_idx}"] = link_text or "Product Specification Document"
            fields[f"Ref Type {ref_idx}"] = "PDF Specification / Manual"
            provenance[f"Ref URL {ref_idx}"] = f"DOM:a[href*=.pdf]"
            ref_idx += 1

    return fields, provenance


def run_extraction_cascade(
    source_url: str,
    html: str,
    target_fields: Optional[List[str]] = None,
    is_js_rendered: bool = False,
) -> Dict[str, Any]:
    """Execute hierarchical extraction cascade across Tiers 1, 2, 3, and 4."""
    if target_fields is None:
        target_fields = DELIVERY_FORMAT_COLUMNS

    total_cost = 0.0
    tier1_count = 0
    tier2_count = 0
    tier3_count = 0
    tier4_count = 0

    # Step 1: Run Tier 1 (Schema.org / JSON-LD / Microdata)
    tier1_fields, tier1_prov = extract_tier1_schema_org(html)

    # Step 2: Run Tier 3 (Static HTML DOM parse)
    tier3_fields, tier3_prov = extract_tier3_static_html(html, target_fields)

    # Identify fields still missing after Tiers 1 and 3
    missing_fields = [
        col for col in target_fields
        if (col not in tier1_fields or tier1_fields[col] is None)
        and (col not in tier3_fields or tier3_fields[col] is None)
    ]

    tier2_fields: Dict[str, Any] = {}
    screenshot_path: Optional[str] = None

    # Step 3: Run Tier 2 (Playwright Fallback) ONLY if page was tagged LIKELY_JS_RENDERED
    # or if missing majority of fields on an active URL
    if (is_js_rendered or (len(missing_fields) > len(target_fields) * 0.8 and source_url.startswith("http"))):
        try:
            from backend.pipeline.render_fallback import render_and_extract
            tier2_res = render_and_extract(source_url, target_fields)
            if tier2_res.get("status") == "SUCCESS":
                tier2_fields = tier2_res.get("fields", {})
                screenshot_path = tier2_res.get("screenshot_path")
                total_cost += tier2_res.get("cost", 0.0)
            else:
                logger.warning(f"Tier 2 Playwright returned non-success for {source_url}: {tier2_res.get('status')}")
        except Exception as e:
            logger.warning(f"Tier 2 Playwright fallback failed for {source_url}: {str(e)}")

    # Step 4: Run Tier 4 (Multimodal VLM) if diagram images/screenshots exist and fields remain missing
    tier4_fields: Dict[str, Any] = {}
    missing_after_t2_t3 = [
        col for col in missing_fields
        if col not in tier2_fields or tier2_fields[col].get("value") is None
    ]

    if screenshot_path and missing_after_t2_t3:
        try:
            from backend.pipeline.vlm_extraction import extract_via_vlm
            vlm_res = extract_via_vlm([screenshot_path], missing_after_t2_t3[:10])
            tier4_fields = vlm_res.get("fields", {})
            total_cost += vlm_res.get("cost", 0.0)
        except Exception as e:
            logger.warning(f"Tier 4 VLM extraction failed for {screenshot_path}: {str(e)}")

    # Assemble unified extracted record with strict provenance
    extracted_data: Dict[str, Dict[str, Any]] = {}
    populated_count = 0

    for col in target_fields:
        if col in tier1_fields and tier1_fields[col] is not None:
            val = tier1_fields[col]
            extracted_data[col] = {
                "field": col,
                "value": val,
                "tier_used": "Tier 1: schema.org",
                "source_url": source_url,
                "confidence": 0.95,
                "cost": 0.0,
            }
            populated_count += 1
            tier1_count += 1
        elif col in tier2_fields and tier2_fields[col].get("value") is not None:
            val = tier2_fields[col]["value"]
            extracted_data[col] = {
                "field": col,
                "value": val,
                "tier_used": "Tier 2: headless_render",
                "source_url": source_url,
                "confidence": 0.90,
                "cost": tier2_fields[col].get("cost", 0.005),
            }
            populated_count += 1
            tier2_count += 1
        elif col in tier3_fields and tier3_fields[col] is not None:
            val = tier3_fields[col]
            extracted_data[col] = {
                "field": col,
                "value": val,
                "tier_used": "Tier 3: static_html",
                "source_url": source_url,
                "confidence": 0.85,
                "cost": 0.0,
            }
            populated_count += 1
            tier3_count += 1
        elif col in tier4_fields and tier4_fields[col].get("value") is not None:
            val = tier4_fields[col]["value"]
            extracted_data[col] = {
                "field": col,
                "value": val,
                "tier_used": "Tier 4: vlm_ocr",
                "source_url": source_url,
                "confidence": 0.85,
                "cost": tier4_fields[col].get("cost", 0.015),
            }
            populated_count += 1
            tier4_count += 1
        else:
            extracted_data[col] = {
                "field": col,
                "value": None,
                "tier_used": None,
                "source_url": "no source found",
                "confidence": 0.0,
                "cost": 0.0,
            }

    # Also retain all raw extracted property names from Tier 1 and Tier 3 for attribute mapping
    for k, v in tier1_fields.items():
        if k not in extracted_data and v is not None:
            extracted_data[k] = {
                "field": k,
                "value": v,
                "tier_used": "Tier 1: schema.org",
                "source_url": source_url,
                "confidence": 0.95,
                "cost": 0.0,
            }

    for k, v in tier3_fields.items():
        if k not in extracted_data and v is not None:
            extracted_data[k] = {
                "field": k,
                "value": v,
                "tier_used": "Tier 3: static_html",
                "source_url": source_url,
                "confidence": 0.85,
                "cost": 0.0,
            }

    summary = {
        "source_url": source_url,
        "total_target_fields": len(target_fields),
        "populated_fields_count": populated_count,
        "tier1_fields_count": tier1_count,
        "tier2_fields_count": tier2_count,
        "tier3_fields_count": tier3_count,
        "tier4_fields_count": tier4_count,
        "total_extraction_cost": total_cost,
        "fields": extracted_data,
    }

    return summary
