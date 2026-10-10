from fastapi import APIRouter
from backend.database.neo4j_client import get_driver, get_database

router = APIRouter(prefix="/api/database", tags=["Database"])


@router.get("/status")
def database_status():
    driver = get_driver()
    database = get_database()

    with driver.session(database=database) as session:
        result = session.run(
            """
            MATCH (n)
            RETURN count(n) AS total_nodes
            """
        ).single()

        total_nodes = result["total_nodes"]

    return {
        "status": "connected",
        "database": database,
        "total_nodes": total_nodes,
    }


@router.get("/counts")
def database_counts():
    driver = get_driver()
    database = get_database()

    with driver.session(database=database) as session:
        result = session.run(
            """
            OPTIONAL MATCH (s:NetworkState)
            WITH count(s) AS network_states
            OPTIONAL MATCH (p:Prediction)
            WITH network_states, count(p) AS predictions
            OPTIONAL MATCH (e:Event)
            WITH network_states, predictions, count(e) AS events
            OPTIONAL MATCH (sc:Scenario)
            RETURN
                network_states,
                predictions,
                events,
                count(sc) AS scenarios
            """
        ).single()

    return {
        "network_states": result["network_states"],
        "predictions": result["predictions"],
        "warning_events": result["events"],
        "scenarios": result["scenarios"],
    }