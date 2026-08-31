# UniHack System Architecture & Technical Specification

> **AI-Powered 252-Column Product Data Enrichment Pipeline for Unilog**  
> *Transforming raw, messy distributor feeds into complete, standardized, and auditable catalog listings.*

---

## 1. End-to-End Pipeline Architecture

```mermaid
flowchart TD
    subgraph RawInput["1. Raw Distributor Ingestion"]
        RAW["Raw Distributor Record<br/>(Mfg_Part_Num, Part_Desc, E1_Brand, Unilog_Brand, DIB_Brand, Part_Manuf)"]
    end

    subgraph Stage1["2. Cleaning & Sanitization"]
        CLEAN["backend/pipeline/cleaning.py<br/>• Nulls placeholder values ('-- Unbranded --')<br/>• ftfy Unicode mojibake repair"]
    end

    subgraph Stage2["3. Brand & OEM Resolution"]
        CORR_CHECK{"Correction Memory<br/>Lookup"}
        CORR_DB[("Supabase / Cache<br/>correction_memory")]
        FUZZY["RapidFuzz Match on Part_Manuf<br/>(shared/manufacturer_brand_list.csv)"]
        DIST_CHECK{"looks_like_distributor<br/>== true?"}
        DESC_FALLBACK["Scan Part_Desc for Brand Tokens<br/>(e.g., '3M', 'Diablo', 'Milw')"]
        MFR_RESOLVED["Resolved Manufacturer & Canonical Brand"]
    end

    subgraph Stage3["4. Source Discovery"]
        ALLOWLIST["shared/manufacturer_domains.json<br/>& Exclusion Filter"]
        FETCH["HTTP Static Fetch<br/>(backend/pipeline/source_discovery.py)"]
        JS_CHECK{"Tagged LIKELY_JS_RENDERED<br/>or Missing Fields?"}
    end

    subgraph Stage4["5. Multi-Tier Extraction Cascade"]
        T1["Tier 1: schema.org JSON-LD / Microdata<br/>($0.000 / item)"]
        T2["Tier 2: Playwright Headless Render Fallback<br/>($0.005 / item)"]
        T3["Tier 3: Static HTML DOM Tables / Specs<br/>($0.000 / item)"]
        T4["Tier 4: Multimodal VLM Spec Diagram OCR<br/>($0.015 / item)"]
    end

    subgraph Stage5["6. Taxonomy & Constrained Attributes"]
        TAX["Taxonomy Classifier<br/>(backend/pipeline/taxonomy_attributes.py)<br/>Classpath Mapping"]
        LOV["Constrained Attribute Extractor<br/>(shared/lov_dishwashers.csv)<br/>15 Ground-Truth Slots"]
    end

    subgraph Stage6["7. Normalization & Descriptions"]
        NORM["Normalization Rules Engine<br/>• UOM Standards (shared/uom_standards.csv)<br/>• Fraction Lookup (shared/decimal_fraction_lookup.csv)<br/>• 6 House Style Spacing/Hyphen Rules"]
        DESC["Description Builder<br/>• SHORT_DESC • MOBILE_DESC<br/>• INVOICE_DESC • LONG_DESC1<br/>• RETAIL_DESC • MARKETING_DESCRIPTION"]
    end

    subgraph Stage7["8. Evidence Fusion & Reconciliation"]
        FUSION["Evidence Fusion Engine<br/>(backend/pipeline/evidence_fusion.py)<br/>• Precedence Arbitration<br/>• Conflict Detection (CONFLICTING_EVIDENCE)"]
    end

    subgraph Output["9. Delivery Format Assembly"]
        ORCH["Full 252-Column Delivery Ledger<br/>(data/expected_output_delivery_format.csv)<br/>Field-Level Provenance & Confidence"]
    end

    RAW --> CLEAN
    CLEAN --> CORR_CHECK
    CORR_CHECK -- "Hit" --> MFR_RESOLVED
    CORR_CHECK -- "Miss" --> FUZZY
    FUZZY --> DIST_CHECK
    DIST_CHECK -- "No (OEM)" --> MFR_RESOLVED
    DIST_CHECK -- "Yes (Distributor)" --> DESC_FALLBACK
    DESC_FALLBACK --> MFR_RESOLVED

    MFR_RESOLVED --> ALLOWLIST
    ALLOWLIST --> FETCH
    FETCH --> JS_CHECK
    JS_CHECK -- "Static OK" --> T1 --> T3
    JS_CHECK -- "JS Shell / Missing" --> T2 --> T4

    T1 & T2 & T3 & T4 --> TAX
    TAX --> LOV
    LOV --> NORM
    NORM --> DESC
    DESC --> FUSION
    FUSION --> ORCH
```

---

## 2. Pipeline Stages, Responsibilities & AGENTS.md Constraint Enforcement

| Stage | Implementation File | Inputs | Outputs | Enforced Hard Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cleaning** | `backend/pipeline/cleaning.py` | Raw 6 distributor columns | Cleaned record + `cleaning_log` | **Constraint 4**: Placeholders (`-- Unbranded --`, `-- No DIB Brand --`) must be converted to `None`, not empty strings. General mojibake repair via `ftfy`. |
| **2. Manufacturer Resolution** | `backend/pipeline/manufacturer_resolution.py` | Cleaned `Part_Manuf`, `Part_Desc` | `ManufacturerResolutionResult` | **Constraint 1 & Gotcha**: Handles distributor names in `Part_Manuf` via `looks_like_distributor` flag, falling back to `Part_Desc` brand token matching. |
| **Correction Memory** | `backend/pipeline/correction_memory.py` | Raw distributor token | Verified OEM & brand override | **Constraint 2**: Strictly validates human entries against `shared/manufacturer_brand_list.csv` before writing; short-circuits fuzzy matching. |
| **3. Source Discovery** | `backend/pipeline/source_discovery.py` | Resolved OEM, MPN, Description | Official product URL + raw HTML | **Constraint 5**: Strict sourcing hierarchy — only official manufacturer domains from `shared/manufacturer_domains.json`; marketplace domains strictly excluded. |
| **4. Extraction Cascade** | `backend/pipeline/extraction.py` | Source URL, HTML, schema columns | Extracted fields dictionary + provenance | **Constraint 3**: Every field returns value, tier used, confidence, and source URL; missing values explicitly tagged `"no source found"`. |
| **Headless Fallback (Tier 2)** | `backend/pipeline/render_fallback.py` | Source URL, target columns | Rendered DOM + Tier 2 fields | Reuses Tier 3 parser on rendered DOM; circuit breaker marks failing domains `RENDER_UNAVAILABLE`. |
| **VLM Extraction (Tier 4)** | `backend/pipeline/vlm_extraction.py` | Real diagram images | Multimodal attribute values | **Constraint 2**: Integrates with Gemini Multimodal Vision API when `GEMINI_API_KEY` is configured on genuine diagram images; gracefully returns unconfigured/empty without inventing or hardcoding data. |
| **5. Taxonomy & Attributes** | `backend/pipeline/taxonomy_attributes.py` | Cleaned description, extracted fields | Canonical Classpath & 15-slot LOV triples | **Constraint 6**: Constrains attributes to standard slots in `shared/lov_dishwashers.csv`; unmapped values tagged `UNMATCHED_TO_LOV`. |
| **6. Normalization & Descriptions** | `backend/pipeline/normalization.py`<br/>`backend/pipeline/description_builder.py` | Extracted values, LOV triples | Normalized UOMs, fractions & 6 description formats | **Constraint 2**: Normalizes UOMs via `shared/uom_standards.csv` and fractions via `shared/decimal_fraction_lookup.csv`. Dynamically derives product titles from taxonomy leaf node. |
| **7. Evidence Fusion** | `backend/pipeline/evidence_fusion.py` | Multi-tier candidate list per column | Reconciled value + conflict flags | **Constraint 3**: Deterministic precedence (Tier 1 > Tier 3/2 > Tier 4); flags `CONFLICTING_EVIDENCE` when confidence is comparable. |
| **8. Orchestrator** | `backend/pipeline/orchestrator.py` | 6 input columns | Complete 252-column delivery record | **Dynamic Schema**: Loads header dynamically from `/data/expected_output_delivery_format.csv` without hand-transcription. |

---

## 3. Real Cost & Latency Accounting Model

Every populated field in the 252-column output schema logs the extraction tier and runtime cost:

| Tier | Strategy | Cost / Item (USD) | Invocation Trigger | Expected Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | **Cleaning & Input Rules** | **$0.0000** | Always (input field passthrough & normalization) | < 1 ms |
| **Tier 1** | **schema.org / JSON-LD / Microdata** | **$0.0000** | Always when structured metadata is present in static HTML | 10 – 30 ms |
| **Tier 2** | **Playwright Headless Browser Render** | **$0.0050** | Only when static fetch yields `LIKELY_JS_RENDERED` or required fields remain missing | 1,500 – 3,500 ms |
| **Tier 3** | **Static HTML DOM Parsing** | **$0.0000** | Always on static HTML for visible tables, DLs, bullets, and document links | 15 – 45 ms |
| **Tier 4** | **Multimodal Vision-Language Model (VLM)** | **$0.0150** | Only for diagrammatic/schematic attributes missing after Tiers 1–3 | 800 – 2,000 ms |
| **Tier 5** | **Multi-Page Technical PDF OCR** *(Stub)* | **$0.0200** | Technical cut sheets with unindexed vectors | 2,000 – 4,000 ms |
| **Tier 6** | **Video Temporal Frame Analysis** *(Stub)* | **$0.0300** | Installation video keyframe extraction | 4,000 – 8,000 ms |

> **Observed Flagship Execution Cost & Accuracy**: Running both ground-truth Dishwashers (`PDSH4816AF` and `WDTS7024RZ`) achieves **91.47% exact field accuracy (461 / 504 data points)** at **$0.0000 runtime cost** on the free extraction tiers (Tiers 0, 1, and 3).

---

## 4. Multi-Category Generality & Empirical 1,000-Row Feed Audit

To demonstrate that the pipeline generalizes beyond the flagship Dishwasher category without hardcoded patterns or category spillover, `backend/scripts/audit_full_sample.py` executes all 1,000 raw distributor rows:

| Metric | Empirical Result Across 1,000 Sample Rows |
| :--- | :--- |
| **Pipeline Throughput** | **454.3 rows / sec** (2.20 seconds total execution, 2.20 ms / row) |
| **Brand & OEM Resolution** | **91.4% (914 / 1,000)** resolved to canonical manufacturer and brand |
| **Distributor Token Disambiguation** | **100% of tested distributor tokens** (`Jam Industrial`, `APPDE`) resolved to true OEMs (`Milwaukee`, `Philips`, `Electrolux`, `Diablo`) from description text |
| **Category Leakage / Anomaly Rate** | **0 occurrences** (0 instances of "Dishwasher" or "Sanding Belt" leaking into unrelated categories) |
| **Invoice Header Token Distribution** | Correctly specialized across categories: `DECKING` (15.3%), `LED` (12.9%), `CUT` (4.0%), `SNDG` (1.3%), `DISHWASHER` (1.0%), `NAIL` (1.0%), `DWNLGT` (0.9%), `LASER` (0.8%), `GRIND` (0.7%), `FASTENER` (0.5%), `PRODUCT` (60.9% generic unclassified) |

---

## 5. Known Limitations & Engineering Boundaries

1. **Controlled Reference Data Scope**: Master tables in `/shared` (`manufacturer_brand_list.csv`, `lov_dishwashers.csv`, `uom_standards.csv`) were derived from the 1,000-row distributor feed and ground-truth schemas. The engine is fully decoupled: in an enterprise environment with Unilog's official UniCat taxonomy, the master tables can be swapped with zero code modifications.
2. **Fixed Flagship Taxonomies**: The pipeline is strictly optimized for the flagship *Built-In Dishwashers* category and secondary *Abrasives* category with keyword classifiers across Decking, Lighting, Fasteners, Tools, and Weatherization. Self-extending unsupervised taxonomy creation is explicitly out of scope.
3. **Deterministic Circuit Breakers**: The Playwright circuit breaker threshold is set to 3 consecutive failures per domain (`RENDER_UNAVAILABLE`), which is effective for local batch runs but would require distributed Redis tracking in multi-node clusters.
4. **VLM Cost Model**: The VLM cost of $0.015/call assumes Gemini Flash multimodal API token economics.

---

## 6. "If We Had Another Week" — Targeted Roadmap

Based on actual testing across the 1,000 raw distributor rows:
1. **Automated Sub-Brand Disambiguation**: Enhance `manufacturer_resolution.py` with embedding-based sub-brand cluster trees for conglomerates (e.g. automatically distinguishing *Milwaukee Tool* vs *Ryobi* under *Techtronic Industries*).
2. **Deep Table Un-merging in Static HTML**: Some distributor-facing OEM spec pages use complex rowspans/colspans for multi-model comparison matrices; add HTML table matrix linearization.
3. **Async Playwright Worker Pool**: Implement a Celery / Redis-backed headless browser pool to enable high-concurrency batch processing of JS-rendered pages.
4. **Continuous Active Learning from Correction Memory**: Feed human overrides from `correction_memory` back into few-shot prompt embeddings for offline fine-tuning.
