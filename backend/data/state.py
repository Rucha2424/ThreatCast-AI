from datetime import datetime, timezone
from typing import Dict, Any


class SimulationStateManager:
    """
    Manages runtime attack simulation states for ThreatCast AI.
    Provides a pluggable state provider layer that can be swapped
    for real streaming data / ML pipeline models.
    """
    def __init__(self):
        self.active_scenario: str = "default"
        self.last_simulated_at: datetime = datetime.now(timezone.utc)
        self.custom_modifications: Dict[str, Any] = {}

    def get_active_scenario(self) -> str:
        return self.active_scenario

    def set_scenario(self, scenario: str) -> None:
        valid_scenarios = [
            "default",
            "lateral_movement_wave",
            "exfiltration_crisis",
            "ransomware_staging"
        ]
        if scenario in valid_scenarios:
            self.active_scenario = scenario
        else:
            self.active_scenario = "default"
        self.last_simulated_at = datetime.now(timezone.utc)

    def get_current_timestamp(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

    def get_iso_timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()


# Global singleton instance
state_manager = SimulationStateManager()
