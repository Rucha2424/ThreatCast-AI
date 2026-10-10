"""
CTU13 attack-activity -> MITRE ATT&CK interpretation layer.

IMPORTANT:
CTU13 does not provide ground-truth MITRE ATT&CK tactic labels.
Therefore this module is an interpretation/mapping layer, NOT
a trained MITRE classifier.

The mapping is based on documented CTU13 activity categories.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class AttackStage:
    activity: str
    tactic: str
    technique: str
    description: str


ACTIVITY_MAP = {
    "PORT_SCAN": AttackStage(
        activity="Port Scanning",
        tactic="Discovery",
        technique="T1046 Network Service Scanning",
        description=(
            "CTU13 port-scan activity interpreted as network "
            "service discovery."
        ),
    ),
    "IRC": AttackStage(
        activity="IRC Command and Control",
        tactic="Command and Control",
        technique="T1071.001 Web Protocols / C2 Channel",
        description=(
            "IRC-based botnet communication interpreted as "
            "command-and-control activity."
        ),
    ),
    "P2P": AttackStage(
        activity="Peer-to-Peer Command and Control",
        tactic="Command and Control",
        technique="T1090 Proxy / P2P-style C2",
        description=(
            "Peer-to-peer botnet communication interpreted as "
            "command-and-control activity."
        ),
    ),
    "HTTP": AttackStage(
        activity="HTTP Command and Control",
        tactic="Command and Control",
        technique="T1071.001 Web Protocols",
        description=(
            "HTTP-based botnet communication interpreted as "
            "web-protocol command and control."
        ),
    ),
    "SPAM": AttackStage(
        activity="Spam / Malicious Messaging",
        tactic="Impact",
        technique="T1566 Phishing / Malicious Messaging",
        description=(
            "Spam-generating botnet activity interpreted as "
            "malicious messaging behavior."
        ),
    ),
    "CLICK_FRAUD": AttackStage(
        activity="Click Fraud",
        tactic="Impact",
        technique="T1185 Browser Session Cookie",
        description=(
            "Click-fraud activity interpreted as malicious "
            "automated interaction."
        ),
    ),
    "DDOS": AttackStage(
        activity="Distributed Denial of Service",
        tactic="Impact",
        technique="T1498 Network Denial of Service",
        description=(
            "CTU13 DDoS activity interpreted as network denial "
            "of service."
        ),
    ),
}


SCENARIO_ACTIVITIES = {
    1: ["IRC", "SPAM", "CLICK_FRAUD"],
    2: ["IRC", "SPAM", "CLICK_FRAUD"],
    3: ["IRC", "PORT_SCAN"],
    4: ["IRC", "DDOS"],
    5: ["SPAM", "PORT_SCAN", "HTTP"],
    6: ["PORT_SCAN", "HTTP"],
    7: ["HTTP"],
    8: ["PORT_SCAN"],
    9: ["IRC", "SPAM", "CLICK_FRAUD", "PORT_SCAN"],
    10: ["IRC", "DDOS"],
    11: ["IRC", "DDOS"],
    12: ["P2P"],
    13: ["SPAM", "PORT_SCAN", "HTTP"],
}


def get_scenario_stages(scenario: int) -> list[dict]:

    activities = SCENARIO_ACTIVITIES.get(
        int(scenario),
        [],
    )

    results = []

    for activity in activities:

        stage = ACTIVITY_MAP[activity]

        results.append(
            {
                "activity": stage.activity,
                "tactic": stage.tactic,
                "technique": stage.technique,
                "description": stage.description,
                "source": "CTU13 activity interpretation",
                "trained_classifier": False,
            }
        )

    return results


def get_primary_stage(scenario: int) -> dict:

    stages = get_scenario_stages(scenario)

    if not stages:
        return {
            "activity": "Unknown",
            "tactic": "Unknown",
            "technique": "Unknown",
            "description": (
                "No documented CTU13 activity mapping."
            ),
            "source": "CTU13 activity interpretation",
            "trained_classifier": False,
        }

    return stages[0]