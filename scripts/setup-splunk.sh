#!/usr/bin/env bash
set -euo pipefail

SPLUNK_URL="https://localhost:8089"
SPLUNK_USER="admin"
SPLUNK_PASS="ChainGuard123!"
HEC_TOKEN="chainguard-hec-token"

echo "=== ChainGuard Splunk Setup ==="
echo ""

# Wait for Splunk to be ready
echo "[1/5] Waiting for Splunk to start..."
until curl -sk "$SPLUNK_URL/services/server/health" >/dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " Ready!"

# Apply license
echo "[2/5] Applying developer license..."
curl -sk -u "$SPLUNK_USER:$SPLUNK_PASS" \
    "$SPLUNK_URL/services/licenser/licenses" \
    -d name=/tmp/splunk-license.xml \
    >/dev/null 2>&1 && echo "  License applied." || echo "  License may already be applied."

# Create indexes
echo "[3/5] Creating indexes..."
for INDEX in cicd_events git_events secret_audit extensions threat_intel; do
    curl -sk -u "$SPLUNK_USER:$SPLUNK_PASS" \
        "$SPLUNK_URL/services/data/indexes" \
        -d name="$INDEX" \
        -d datatype=event \
        >/dev/null 2>&1 && echo "  Created: $INDEX" || echo "  Exists:  $INDEX"
done

# Enable HEC
echo "[4/5] Enabling HTTP Event Collector..."
curl -sk -u "$SPLUNK_USER:$SPLUNK_PASS" \
    "$SPLUNK_URL/servicesNS/admin/splunk_httpinput/data/inputs/http/http" \
    -d disabled=0 \
    >/dev/null 2>&1 && echo "  HEC enabled." || echo "  HEC already enabled."

# Create HEC token with all indexes allowed
curl -sk -u "$SPLUNK_USER:$SPLUNK_PASS" \
    "$SPLUNK_URL/servicesNS/admin/splunk_httpinput/data/inputs/http" \
    -d name=chainguard \
    -d token="$HEC_TOKEN" \
    -d index=cicd_events \
    -d indexes="cicd_events,git_events,secret_audit,extensions,threat_intel" \
    -d useACK=0 \
    >/dev/null 2>&1 && echo "  HEC token created." || echo "  HEC token exists."

# Restart Splunk to apply license
echo "[5/5] Restarting Splunk to apply changes..."
curl -sk -u "$SPLUNK_USER:$SPLUNK_PASS" \
    "$SPLUNK_URL/services/server/control/restart" \
    -X POST \
    >/dev/null 2>&1
echo "  Restart triggered. Waiting..."
sleep 15
until curl -sk "$SPLUNK_URL/services/server/health" >/dev/null 2>&1; do
    printf "."
    sleep 5
done
echo " Back up!"

echo ""
echo "=== Setup Complete ==="
echo "  Splunk Web:  http://localhost:8000  (admin / ChainGuard123!)"
echo "  HEC URL:     https://localhost:8088"
echo "  HEC Token:   $HEC_TOKEN"
echo "  Indexes:     cicd_events, git_events, secret_audit, extensions, threat_intel"
echo ""
echo "Next: run 'bash scripts/ingest-data.sh' to load synthetic attack data."
