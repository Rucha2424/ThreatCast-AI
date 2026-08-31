import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["engine"] == "online"

def test_dashboard_summary():
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "threat_level" in data
    assert "current_stage" in data
    assert "next_predicted_stage" in data
    assert "forecast_confidence" in data

def test_dashboard_kpis():
    res = client.get("/api/dashboard/kpis")
    assert res.status_code == 200
    data = res.json()
    assert len(data["cards"]) == 5

def test_events():
    res = client.get("/api/events")
    assert res.status_code == 200
    data = res.json()
    assert len(data["events"]) > 0

def test_network_graph():
    res = client.get("/api/network/graph")
    assert res.status_code == 200
    data = res.json()
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

def test_network_activity():
    res = client.get("/api/network/activity")
    assert res.status_code == 200
    data = res.json()
    assert len(data["traffic_series"]) > 0

def test_forecast():
    res = client.get("/api/forecast")
    assert res.status_code == 200
    data = res.json()
    assert "current_state" in data
    assert len(data["future_stages"]) == 3

def test_forecast_comparison():
    res = client.get("/api/forecast/comparison")
    assert res.status_code == 200
    data = res.json()
    assert "lstm_a" in data
    assert "lstm_b" in data

def test_rules():
    res = client.get("/api/rules")
    assert res.status_code == 200
    data = res.json()
    assert data["total_rules"] > 0

def test_disagreements():
    res = client.get("/api/disagreements")
    assert res.status_code == 200
    data = res.json()
    assert data["total_disagreements"] > 0

def test_incidents():
    res = client.get("/api/incidents")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0

def test_incident_detail():
    res = client.get("/api/incidents/INC-8042")
    assert res.status_code == 200
    data = res.json()
    assert data["incident"]["id"] == "INC-8042"

def test_explainability():
    res = client.get("/api/explainability/INC-8042")
    assert res.status_code == 200
    data = res.json()
    assert len(data["contributing_signals"]) > 0

def test_demo_simulation():
    res = client.post("/api/demo/simulate-attack", json={"scenario": "lateral_movement_wave"})
    assert res.status_code == 200
    data = res.json()
    assert data["active_scenario"] == "lateral_movement_wave"

    # Reset
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["active_scenario"] == "default"

if __name__ == "__main__":
    test_health()
    test_dashboard_summary()
    test_dashboard_kpis()
    test_events()
    test_network_graph()
    test_network_activity()
    test_forecast()
    test_forecast_comparison()
    test_rules()
    test_disagreements()
    test_incidents()
    test_incident_detail()
    test_explainability()
    test_demo_simulation()
    print("ALL 14 BACKEND API TESTS PASSED PERFECTLY!")
