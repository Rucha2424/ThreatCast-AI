import pandas as pd


# ============================================================
# DAPT2020 -> MITRE ATT&CK MAPPING
# ============================================================

OUTPUT_FILE = "dapt2020_mitre_attack_mapping.csv"


# ============================================================
# IMPORTANT
#
# These mappings are based on the ACTIVITY/STAGE labels
# available in DAPT2020 and the corresponding network
# behavior.
#
# They are contextual mappings, NOT claims that the
# 19 aggregate network features uniquely identify a
# particular ATT&CK technique.
# ============================================================

mapping = [

    {
        "Stage": "RECONNAISSANCE",
        "MITRE_Tactic": "Reconnaissance",
        "MITRE_Technique": "Network Service Scanning",
        "MITRE_ID": "T1046",
        "Confidence": "MEDIUM",
        "Reason": (
            "DAPT2020 reconnaissance activity includes "
            "network scanning behavior. Aggregate flow "
            "features can indicate scanning-like traffic, "
            "but cannot prove the exact technique."
        )
    },

    {
        "Stage": "RECONNAISSANCE",
        "MITRE_Tactic": "Discovery",
        "MITRE_Technique": "Network Service Scanning",
        "MITRE_ID": "T1046",
        "Confidence": "MEDIUM",
        "Reason": (
            "Network scans generate repeated connection "
            "attempts across hosts or services. SYN and "
            "flow-rate features may provide supporting "
            "evidence."
        )
    },

    {
        "Stage": "ESTABLISH FOOTHOLD",
        "MITRE_Tactic": "Initial Access",
        "MITRE_Technique": "Exploit Public-Facing Application",
        "MITRE_ID": "T1190",
        "Confidence": "LOW",
        "Reason": (
            "DAPT2020 contains web vulnerability and "
            "injection-related activity, but the available "
            "aggregate features do not contain enough "
            "application context to verify a specific "
            "exploit technique."
        )
    },

    {
        "Stage": "ESTABLISH FOOTHOLD",
        "MITRE_Tactic": "Initial Access",
        "MITRE_Technique": "Valid Accounts",
        "MITRE_ID": "T1078",
        "Confidence": "LOW",
        "Reason": (
            "Account-related activity is present in the "
            "dataset, but aggregate network-state features "
            "cannot determine whether valid credentials "
            "were actually used."
        )
    },

    {
        "Stage": "LATERAL MOVEMENT",
        "MITRE_Tactic": "Lateral Movement",
        "MITRE_Technique": "Remote Services",
        "MITRE_ID": "T1021",
        "Confidence": "MEDIUM",
        "Reason": (
            "Lateral movement commonly involves connections "
            "between internal hosts using remote services. "
            "Flow relationships can provide supporting "
            "network evidence, but the exact service is not "
            "available in the selected feature set."
        )
    },

    {
        "Stage": "DATA EXFILTRATION",
        "MITRE_Tactic": "Exfiltration",
        "MITRE_Technique": "Exfiltration Over C2 Channel",
        "MITRE_ID": "T1041",
        "Confidence": "LOW",
        "Reason": (
            "The dataset contains a data-exfiltration stage, "
            "but only one 30-second network-state sample "
            "exists for this class. Therefore this mapping "
            "is contextual rather than a learned-class claim."
        )
    },

    {
        "Stage": "DATA EXFILTRATION",
        "MITRE_Tactic": "Exfiltration",
        "MITRE_Technique": "Exfiltration Over Web Service",
        "MITRE_ID": "T1567",
        "Confidence": "LOW",
        "Reason": (
            "Web-based exfiltration is a possible ATT&CK "
            "interpretation, but the selected aggregate "
            "features do not contain sufficient destination "
            "or application information to verify it."
        )
    }
]


# ============================================================
# CREATE DATAFRAME
# ============================================================

df = pd.DataFrame(mapping)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# DISPLAY
# ============================================================

print("=" * 70)
print("DAPT2020 - MITRE ATT&CK MAPPING")
print("=" * 70)

print(
    "\nMappings generated:",
    len(df)
)

print("\n")

for stage in df["Stage"].unique():

    print("-" * 70)
    print(stage)
    print("-" * 70)

    stage_df = df[
        df["Stage"] == stage
    ]

    for _, row in stage_df.iterrows():

        print(
            f"\nTechnique : "
            f"{row['MITRE_Technique']}"
        )

        print(
            f"MITRE ID  : "
            f"{row['MITRE_ID']}"
        )

        print(
            f"Tactic    : "
            f"{row['MITRE_Tactic']}"
        )

        print(
            f"Confidence: "
            f"{row['Confidence']}"
        )

        print(
            f"Reason    : "
            f"{row['Reason']}"
        )


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("MAPPING SUMMARY")
print("=" * 70)

print(
    df[
        [
            "Stage",
            "MITRE_ID",
            "MITRE_Technique",
            "Confidence"
        ]
    ].to_string(
        index=False
    )
)


print("\nSaved:")
print(OUTPUT_FILE)

print("\n" + "=" * 70)
print("DAPT2020 MITRE MAPPING COMPLETE")
print("=" * 70)

print(
    "\nIMPORTANT:"
)

print(
    "These mappings provide cybersecurity context "
    "for the observed stages."
)

print(
    "They do not prove that the LSTM independently "
    "detected the listed ATT&CK techniques."
)