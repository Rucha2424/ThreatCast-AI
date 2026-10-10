#!/bin/sh

set -e

echo "Waiting for Neo4j..."

until cypher-shell \
    -a "neo4j://neo4j:7687" \
    -u "neo4j" \
    -p "threatcast_demo_password" \
    "RETURN 1;" >/dev/null 2>&1
do
    sleep 2
done

echo "Neo4j is ready."

echo "Running ThreatCast-AI initialization..."

cypher-shell \
    -a "neo4j://neo4j:7687" \
    -u "neo4j" \
    -p "threatcast_demo_password" \
    -f /init/01-init.cypher

echo "ThreatCast-AI Neo4j initialization completed."