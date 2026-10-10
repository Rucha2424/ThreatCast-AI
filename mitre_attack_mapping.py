import pandas as pd


# ============================================================
# THREATCAST - MITRE ATT&CK MAPPING
# ============================================================

OUTPUT_PATH = r"mitre_attack_mapping.csv"


# ============================================================
# MAPPING
#
# IMPORTANT:
# These are behavior-level mappings.
# They are NOT claiming that our ML model directly identifies
# a specific MITRE technique.
# ============================================================

mappings = [

    {
        "Tactic_ID": "TA0011",
        "Tactic": "Command and Control",
        "Technique_ID": "T1071",
        "Technique": "Application Layer Protocol",
        "Observed_Evidence": (
            "CTU13 contains manually labeled botnet and "
            "command-and-control traffic. ThreatCast detects "
            "network-state changes associated with upcoming "
            "attack activity."
        ),
        "ThreatCast_Features": (
            "Flow_Count, Total_Packets, Total_Bytes, "
            "Total_Source_Bytes, Avg_Duration, "
            "Avg_Packets_Per_Flow, Avg_Bytes_Per_Flow, "
            "and temporal change features."
        ),
        "Confidence": "Medium",
        "Limitation": (
            "The current aggregated dataset does not retain "
            "enough protocol-level information to determine "
            "a specific T1071 sub-technique."
        )
    },

    {
        "Tactic_ID": "TA0011",
        "Tactic": "Command and Control",
        "Technique_ID": "T1071.001",
        "Technique": "Application Layer Protocol: Web Protocols",
        "Observed_Evidence": (
            "Potential application-layer C2 behavior may be "
            "present in CTU13 botnet traffic."
        ),
        "ThreatCast_Features": (
            "Network volume, duration, flow-count and temporal "
            "change features."
        ),
        "Confidence": "Low",
        "Limitation": (
            "HTTP/HTTPS protocol information is not retained "
            "in the current aggregated feature table, so "
            "T1071.001 cannot be confirmed automatically."
        )
    },

    {
        "Tactic_ID": "TA0011",
        "Tactic": "Command and Control",
        "Technique_ID": "T1071.004",
        "Technique": "Application Layer Protocol: DNS",
        "Observed_Evidence": (
            "DNS-based C2 is a possible behavior in network "
            "traffic datasets."
        ),
        "ThreatCast_Features": (
            "Network volume, duration, flow-count and temporal "
            "change features."
        ),
        "Confidence": "Low",
        "Limitation": (
            "DNS protocol and query-level information are not "
            "available in the current aggregated dataset, so "
            "DNS C2 cannot be confirmed."
        )
    },

    {
        "Tactic_ID": "TA0011",
        "Tactic": "Command and Control",
        "Technique_ID": "T1105",
        "Technique": "Ingress Tool Transfer",
        "Observed_Evidence": (
            "Network flows can contain traffic associated with "
            "file or payload transfer, but the current "
            "ThreatCast features do not identify transferred "
            "files."
        ),
        "ThreatCast_Features": (
            "Total_Bytes, Total_Source_Bytes, "
            "Avg_Bytes_Per_Flow and temporal byte changes."
        ),
        "Confidence": "Low",
        "Limitation": (
            "No file-transfer content, filenames, process "
            "information or protocol-specific evidence is "
            "available in the aggregated dataset."
        )
    }
]


# ============================================================
# CREATE DATAFRAME
# ============================================================

df = pd.DataFrame(
    mappings
)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# DISPLAY
# ============================================================

print("=" * 70)
print("THREATCAST - MITRE ATT&CK MAPPING")
print("=" * 70)

print()

print(
    df[
        [
            "Technique_ID",
            "Technique",
            "Confidence"
        ]
    ].to_string(
        index=False
    )
)


print()
print("=" * 70)
print("IMPORTANT INTERPRETATION")
print("=" * 70)

print(
    "ThreatCast currently provides behavior-level "
    "ATT&CK candidates."
)

print(
    "It does NOT directly identify specific ATT&CK "
    "techniques from the ML prediction."
)

print(
    "Protocol-specific sub-techniques require additional "
    "network/protocol evidence."
)


print()
print(
    "Saved:",
    OUTPUT_PATH
)

print("=" * 70)
print("MITRE ATT&CK MAPPING COMPLETE")
print("=" * 70)