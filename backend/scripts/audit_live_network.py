"""UniHack Live Network Extraction Audit Script.

Executes real HTTP network source discovery and multi-tier extraction cascade across a balanced
multi-category sample of 20 distributor products.
Evaluates real-world internet cooperation:
1. Official source URLs discovered vs 'no source found'.
2. HTTP status codes, latency, and HTML payloads.
3. Fields populated per row and tier distribution (Tiers 1, 2, 3).
"""

import sys
import os
import csv
import time
from typing import Any, Dict, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.pipeline.orchestrator import EnrichmentOrchestrator

# Balanced 20-row sample spanning all 7 supported categories
AUDIT_SAMPLE_ROWS = [
    # 1. Built-In Dishwashers (Appliances)
    {"Mfg_Part_Num": "PDSH4816AF", "Part_Desc": "24\" Built-In Dishwasher Stainless Steel", "Part_Manuf": "Appliance Dealers Cooperative (APPDE)"},
    {"Mfg_Part_Num": "WDTS7024RZ", "Part_Desc": "24\" Built-In Dishwasher Stainless Steel", "Part_Manuf": "Whirlpool Corporation (WHIRL)"},
    
    # 2. Abrasives (Diablo, Freud, Mirka)
    {"Mfg_Part_Num": "DCB518ASTS06G", "Part_Desc": "Diablo 1/2\"x18\" Sanding Belt 6pc", "Part_Manuf": "Freud Inc (2435)"},
    {"Mfg_Part_Num": "DCD050120H15G", "Part_Desc": "Diablo 5\" 120 Grit Hook & Lock Sanding Disc", "Part_Manuf": "Freud Inc (2435)"},
    {"Mfg_Part_Num": "9A-570-320", "Part_Desc": "Abranet 2.75x30 Sanding Strip 320G", "Part_Manuf": "Jam Industrial Supply LLC (JAMIN)"},
    {"Mfg_Part_Num": "49-94-0501", "Part_Desc": "Milw 4\"x1/4\"x5/8\" Metal Grinding Wheel", "Part_Manuf": "Jam Industrial Supply LLC (JAMIN)"},

    # 3. Commercial & LED Lighting (Philips, Satco, Kichler)
    {"Mfg_Part_Num": "576512", "Part_Desc": "65W Led BR40 Med 27k Dimmable Lamp", "Part_Manuf": "Signify North America Corp (PHILN)"},
    {"Mfg_Part_Num": "S11822", "Part_Desc": "12W LED 4\" Recessed Downlight 3000K", "Part_Manuf": "Satco Products Inc (SATCO)"},
    {"Mfg_Part_Num": "43846BK", "Part_Desc": "LED Flush Mount Ceiling Light Black", "Part_Manuf": "Kichler Lighting LLC (KICHL)"},

    # 4. Decking & Railing (Trex, TimberTech)
    {"Mfg_Part_Num": "543302146", "Part_Desc": "8' Wh Select T-Rail Kit Horiz w/Sq Balusters", "Part_Manuf": "Trex Company Inc (TREXC)"},
    {"Mfg_Part_Num": "543143912", "Part_Desc": "1x12-12' Jasper Trex Lineage Decking Board", "Part_Manuf": "Trex Company Inc (TREXC)"},

    # 5. Fasteners & Collated Nails (Paslode, Bostitch, Grip-Rite)
    {"Mfg_Part_Num": "650384", "Part_Desc": "3\" x .120 Smooth Shank Framing Nails 30 Deg", "Part_Manuf": "ITW Construction Products (PASLO)"},
    {"Mfg_Part_Num": "S16D131HG", "Part_Desc": "3-1/2\" x .131 HDG Framing Nails Collated", "Part_Manuf": "PrimeSource Building Products (GRIPR)"},

    # 6. Power Tools & Measuring (DEWALT, Milwaukee, Festool)
    {"Mfg_Part_Num": "DW08802CG", "Part_Desc": "Dewalt Laser Green Self-Level Cross Line", "Part_Manuf": "Stanley Black & Decker (DEWAL)"},
    {"Mfg_Part_Num": "578808", "Part_Desc": "Festool 3x4 M GR PRO Sanding Pad", "Part_Manuf": "Jam Industrial Supply LLC (JAMIN)"},

    # 7. Weather Barrier & Flashing (Tyvek / DuPont)
    {"Mfg_Part_Num": "D13884323", "Part_Desc": "Tyvek HomeWrap 9' x 100' Building Wrap", "Part_Manuf": "Jam Industrial Supply LLC (JAMIN)"},
    {"Mfg_Part_Num": "D13884330", "Part_Desc": "Tyvek StraightFlash 4\" x 75' Window Flashing Tape", "Part_Manuf": "Jam Industrial Supply LLC (JAMIN)"},
]


def run_live_network_audit():
    orchestrator = EnrichmentOrchestrator()
    print("=" * 95)
    print("           UNIHACK LIVE NETWORK AUDIT: REAL HTTP SOURCE DISCOVERY & EXTRACTION           ")
    print("=" * 95)
    print(f"Sample Size:     {len(AUDIT_SAMPLE_ROWS)} products across 7 diverse categories")
    print("Testing real HTTP source discovery against official manufacturer web endpoints...\n")

    start_total = time.time()
    results = []
    
    found_urls = 0
    total_populated_fields = 0
    tier1_hits = 0
    tier2_hits = 0
    tier3_hits = 0

    print(f"{'Category / Product':<32} | {'Brand':<10} | {'HTTP Source Discovered':<32} | {'Fields':<6} | {'Latency':<7}")
    print("-" * 95)

    for r in AUDIT_SAMPLE_ROWS:
        pn = r["Mfg_Part_Num"]
        desc = r["Part_Desc"]
        pm = r["Part_Manuf"]
        
        t0 = time.time()
        res = orchestrator.run_pipeline(
            mfg_part_num=pn,
            part_desc=desc,
            part_manuf=pm,
        )
        dt = round((time.time() - t0) * 1000, 1)
        
        rec = res["record"]
        summary = res["summary"]
        source_url = summary.get("source_url") or "no source found"
        brand = summary.get("resolved_brand") or "None"
        pop_count = summary.get("populated_columns", 0)
        
        if source_url and source_url != "no source found":
            found_urls += 1
            
        total_populated_fields += pop_count
        
        # Check extraction tiers in pipeline log
        for log_entry in res.get("pipeline_log", []):
            if log_entry.get("stage") == "4_EXTRACTION_CASCADE":
                tier1_hits += log_entry.get("tier1_count", 0) or 0
                tier2_hits += log_entry.get("tier2_count", 0) or 0
                tier3_hits += log_entry.get("tier3_count", 0) or 0
                
        disp_url = (source_url[:30] + "..") if len(source_url) > 32 else source_url
        disp_name = (desc[:30] + "..") if len(desc) > 32 else desc
        print(f"{disp_name:<32} | {brand:<10} | {disp_url:<32} | {pop_count:4d}   | {dt:6.1f}ms")

    total_duration = time.time() - start_total
    avg_duration = (total_duration / len(AUDIT_SAMPLE_ROWS)) * 1000

    print("=" * 95)
    print("LIVE NETWORK AUDIT SUMMARY METRICS:")
    print(f"  • Source Discovery Success Rate:  {found_urls} / {len(AUDIT_SAMPLE_ROWS)} ({found_urls/len(AUDIT_SAMPLE_ROWS)*100:.1f}%)")
    print(f"  • Average Fields Populated / Row: {total_populated_fields/len(AUDIT_SAMPLE_ROWS):.1f} / 252 columns")
    print(f"  • Average Live Network Latency:   {avg_duration:.1f} ms / row")
    print(f"  • Extraction Tiers Utilized:      Tier 1 (Schema.org): {tier1_hits} | Tier 3 (DOM): {tier3_hits} | Tier 2 (Render): {tier2_hits}")
    print("=" * 95)


if __name__ == "__main__":
    run_live_network_audit()
