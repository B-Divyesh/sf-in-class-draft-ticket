#!/bin/bash
set -euo pipefail

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
SOURCE_SHA=$(git -C "$REPO_DIR" rev-parse HEAD)
APP_NAME=sf-in-class-draft-ticket
RESOURCE_GROUP=sociobot
REGISTRY=sociobotregistry
IMAGE="$REGISTRY.azurecr.io/$APP_NAME:${SOURCE_SHA:0:12}"
SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID:-283af945-693b-4a6e-b952-df928d0a18a9}
RESOURCE_URI="https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$APP_NAME?api-version=2024-03-01"
PAYLOAD=$(mktemp)
trap 'rm -f "$PAYLOAD"' EXIT

az acr build \
  --registry "$REGISTRY" \
  --image "$APP_NAME:${SOURCE_SHA:0:12}" \
  --file Dockerfile \
  --build-arg "BUILD_SHA=$SOURCE_SHA" \
  --build-arg "GIT_SHA=$SOURCE_SHA" \
  --build-arg "SOURCE_COMMIT=$SOURCE_SHA" \
  "$REPO_DIR"

node "$REPO_DIR/deployment/render-containerapp.mjs" "$IMAGE" > "$PAYLOAD"
az rest --method patch --uri "$RESOURCE_URI" --body "@$PAYLOAD" --output none

for _ in $(seq 1 40); do
  LIVE_SHA=$(curl --fail --silent --max-time 15 \
    https://in-class-draft-ticket.sociobot.in/health \
    | node -e "let data='';process.stdin.on('data',chunk=>data+=chunk).on('end',()=>console.log(JSON.parse(data).build_sha||''))" \
    2>/dev/null || true)
  if [ "$LIVE_SHA" = "$SOURCE_SHA" ]; then
    echo "deployed $SOURCE_SHA with the repository container contract"
    exit 0
  fi
  sleep 15
done

echo "deployment did not report $SOURCE_SHA within ten minutes" >&2
exit 1
