import os

from backend.graph_store import Neo4jStore


NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    raise RuntimeError("NEO4J_PASSWORD is not set.")


def main():

    print("=" * 60)
    print("THREATCAST — STORE ML WARNING EVENTS")
    print("=" * 60)

    driver = Neo4jStore(
        NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD,
    )

    try:
        driver.verify()
        print("\n✓ Neo4j connection successful")

        with driver.session(database="neo4j") as session:

            result = session.run(
                """
                MATCH (n:NetworkState)-[:HAS_PREDICTION]->(p:Prediction)
                WHERE p.warning = true

                MERGE (e:Event {
                    id: "warning_" + p.id
                })

                SET
                    e.event_type = "ML_EARLY_WARNING",
                    e.source = "CTU13 LSTM",
                    e.severity = "WARNING",
                    e.probability = p.probability,
                    e.threshold = p.threshold,
                    e.label = p.label,
                    e.timestamp = p.prediction_timestamp,
                    e.created_at = datetime()

                MERGE (n)-[:GENERATED_EVENT]->(e)
                MERGE (e)-[:BASED_ON_PREDICTION]->(p)

                RETURN count(e) AS warning_events
                """
            )

            count = result.single()["warning_events"]

            print(f"\nML warning events stored: {count}")

        print("\n" + "=" * 60)
        print("WARNING EVENT STORAGE COMPLETE")
        print("=" * 60)

    finally:
        driver.close()


if __name__ == "__main__":
    main()
