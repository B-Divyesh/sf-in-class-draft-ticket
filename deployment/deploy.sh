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
APPLIED=$(mktemp)
trap 'rm -f "$PAYLOAD" "$APPLIED"' EXIT

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

contract_is_applied() {
  az rest --method get --uri "$RESOURCE_URI" --output json > "$APPLIED"
  node - "$APPLIED" <<'NODE'
const config = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const template = config.properties.template;
const container = template.containers.find(item => item.name === 'app');
const mounted = container?.volumeMounts?.some(item =>
  item.volumeName === 'session-data' && item.mountPath === '/app/data');
const durable = template.volumes?.some(item =>
  item.name === 'session-data' && item.storageType === 'AzureFile' &&
  item.storageName === 'in-class-draft-ticket-data');
const scaled = template.scale?.minReplicas === 2 && template.scale?.maxReplicas === 3;
if (!mounted || !durable || !scaled) process.exit(1);
NODE
}

for _ in $(seq 1 40); do
  LIVE_SHA=$(curl --fail --silent --max-time 15 \
    https://in-class-draft-ticket.sociobot.in/health \
    | node -e "let data='';process.stdin.on('data',chunk=>data+=chunk).on('end',()=>console.log(JSON.parse(data).build_sha||''))" \
    2>/dev/null || true)
  if [ "$LIVE_SHA" = "$SOURCE_SHA" ] && contract_is_applied; then
    echo "deployed $SOURCE_SHA with the shared-storage multi-replica contract"
    exit 0
  fi
  sleep 15
done

echo "deployment did not report $SOURCE_SHA within ten minutes" >&2
exit 1
