# UniHack — Agent Rules

## What this project is
An AI-powered product data enrichment pipeline for Unilog. Raw, messy distributor
rows (Part Number, Description, Manufacturer) go in; complete, standardized,
sellable 252-column product listings come out.

## Ground-truth data (always read from these, never hand-transcribe schemas)
- /data/sample_input.csv — real 1,000-row raw input. Columns: Mfg_Part_Num,
  Part_Desc, E1_Brand, Unilog_Brand, DIB_Brand, Part_Manuf.
- /data/expected_output_delivery_format.csv — real 2-row ground-truth output
  in the full Delivery Format schema (252 columns). Treat this file's header
  row as the single source of truth for output schema — never invent or
  assume a column name; read it from this file.

## Hard constraints — never violate these
1. NO HARDCODING OR MOCKING. No code path may be keyed to a specific
   Mfg_Part_Num, Part_Desc string, or manufacturer name. Every code path must
   work on a row it has never seen.
2. CONTROLLED VOCABULARY ONLY. Attribute values, manufacturer/brand names,
   and units of measure must come from files in /shared (LOV list, brand
   list, UOM standards) — never freely generated.
3. EVERY FIELD NEEDS PROVENANCE. Every output value carries a source URL,
   or an explicit "no source found" / "inferred" tag. A value with no
   source and no tag is a bug.
4. PLACEHOLDERS ARE NULLS. "-- Unbranded --", "-- No Unilog Brand --",
   "-- No DIB Brand --" (and case/spacing variants) must be treated as null
   before any processing, not as real values.
5. SOURCING HIERARCHY. Manufacturer's own website/PDFs/videos only.
   E-commerce, marketplace, and distributor sites are never used as a data
   source (they can still appear as noise in the input's Part_Manuf field —
   see the note on Part_Manuf below).
6. DEPTH OVER BREADTH. One flagship category gets full, provable depth.
   Everything else gets a lighter pass to demonstrate generality.

## Known gotcha in the real data — read this before writing manufacturer resolution logic
Part_Manuf in the input is NOT reliably the product's actual manufacturer.
Sometimes it correctly holds the manufacturer with a code in parentheses
(e.g. "Freud Inc (2435)"). Other times it holds a DISTRIBUTOR's name and
code (e.g. "Jam Industrial Supply LLC (JAMIN)") for a product whose real
brand is only evident from the free-text Part_Desc (e.g. a row where
Part_Desc starts with "3M..." or "Milw..." but Part_Manuf says "Jam
Industrial Supply LLC (JAMIN)"). Manufacturer resolution must be able to
fall back to inferring the brand from Part_Desc text when Part_Manuf looks
distributor-shaped, not just fuzzy-match Part_Manuf directly.

## Flagship category
Dishwashers / Built-In Appliances ("Appliances & Consumer Electronics>
Kitchen Appliances>Built-In Dishwashers") is the flagship depth category —
it's the one category we have real ground-truth expected output for
(2 rows in expected_output_delivery_format.csv), so it's also what we
score field-level accuracy against.
Abrasives (cutting/sanding discs and belts — Diablo, 3M, Milwaukee) is the
secondary "evidence of generality" category — it's the largest clearly-
identifiable cluster in the 1,000-row sample input.

## Tech stack
Backend: Python + FastAPI. Frontend: Next.js + React + TypeScript + Tailwind.
Storage: Supabase (Postgres). Embeddings: Gemini embeddings or
sentence-transformers. Headless render fallback: Playwright.

## Style / process rules
- No fake progress indicators — every processing step shown in the UI must
  reflect real work happening.
- Before writing pipeline logic, read the two data files in /data yourself
  and confirm your understanding of the schema back to me rather than
  assuming.
- Prefer small, testable modules over one large pipeline file.
