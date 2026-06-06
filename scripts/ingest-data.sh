#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Ingesting Synthetic Attack Data ==="
echo ""

export SPLUNK_HEC_URL="https://localhost:8088"
export SPLUNK_HEC_TOKEN="chainguard-hec-token"

for SCENARIO in trojanized_extension poisoned_package compromised_ci; do
    echo "Ingesting: $SCENARIO"
    backend/.venv/bin/python backend/data/generate.py "$SCENARIO" --seed 42
    echo ""
done

echo "=== Done ==="
echo "Verify in Splunk Web: http://localhost:8000"
echo "  Search: index=cicd_events OR index=git_events OR index=secret_audit OR index=extensions OR index=threat_intel"
