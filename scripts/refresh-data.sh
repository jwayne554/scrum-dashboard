#!/bin/bash

# Script to refresh data from Linear API
# Can be run via cron for automatic updates

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

API_URL=${API_URL:-http://localhost:3001}

echo "🔄 Refreshing dashboard data..."

# Array of team IDs to refresh
TEAM_IDS=(
    "31a3b784-f761-45ad-9709-069f21fd2696"  # R&D Eng
    "1822a56e-3ac7-4664-972a-9bf0d317347c"  # Tofu GP
    "4c927535-1161-413e-a991-405c7b805722"  # Tofu EOR
    "b19a6bd5-9776-4724-8d8b-2605ed1adcdd"  # Tofu DEVOPS
)

# Refresh each team
for TEAM_ID in "${TEAM_IDS[@]}"; do
    echo "Refreshing team: $TEAM_ID"
    curl -X POST "${API_URL}/api/refresh?teamId=${TEAM_ID}" \
         -H "Content-Type: application/json" \
         --silent --show-error | jq '.'
    echo ""
done

echo "✅ Data refresh complete!"

# Add to crontab for automatic refresh every 30 minutes:
# */30 * * * * /path/to/scrum-dashboard/scripts/refresh-data.sh >> /var/log/scrum-refresh.log 2>&1