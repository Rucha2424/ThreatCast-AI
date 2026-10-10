// ============================================================
// ThreatCast-AI Offline Demo Neo4j Initialization
// ============================================================

// Constraints / indexes
CREATE CONSTRAINT threatcast_scenario_id IF NOT EXISTS
FOR (s:Scenario)
REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT threatcast_node_id IF NOT EXISTS
FOR (n:NetworkNode)
REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT threatcast_event_id IF NOT EXISTS
FOR (e:SecurityEvent)
REQUIRE e.id IS UNIQUE;

// Demo scenario
MERGE (s:Scenario {id: "CTU13-13"})
SET
    s.name = "CTU13 Scenario 13",
    s.dataset = "CTU13",
    s.description = "Offline ThreatCast demonstration scenario";

// Demo network entities
MERGE (src:NetworkNode {id: "192.168.1.10"})
SET
    src.type = "Internal Host",
    src.label = "Source Host";

MERGE (dst:NetworkNode {id: "10.0.0.20"})
SET
    dst.type = "External Host",
    dst.label = "Destination Host";

// Demonstration event
MERGE (event:SecurityEvent {id: "THREATCAST-DEMO-001"})
SET
    event.type = "Early Warning",
    event.source = "CTU13",
    event.scenario = "13",
    event.description = "ThreatCast offline demonstration event";

// Relationships
MERGE (src)-[:GENERATED]->(event);
MERGE (event)-[:TARGETED]->(dst);
MERGE (event)-[:OBSERVED_IN]->(s);