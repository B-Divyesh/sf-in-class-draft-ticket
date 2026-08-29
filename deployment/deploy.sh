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
APPLIED=$(mktemp)
trap 'rm -f "$APPLIED"' EXIT

az acr build \
  --registry "$REGISTRY" \
  --image "$APP_NAME:${SOURCE_SHA:0:12}" \
  --file Dockerfile \
  --build-arg "BUILD_SHA=$SOURCE_SHA" \
  --build-arg "GIT_SHA=$SOURCE_SHA" \
  --build-arg "SOURCE_COMMIT=$SOURCE_SHA" \
  "$REPO_DIR"

# Container Apps accepts Key Vault references through the dedicated secret
# operation. A generic resource PATCH can return success while silently
# retaining the old revision template, which leaves DATABASE_URL absent and
# makes every replica fall back to its own SQLite file.
DATABASE_SECRET_URL=$(node -e "console.log(require('${REPO_DIR}/deployment/containerapp-contract.json').database.keyVaultSecretUrl)")
DATABASE_IDENTITY=$(node -e "console.log(require('${REPO_DIR}/deployment/containerapp-contract.json').database.identity)")
az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --secrets "database-url=keyvaultref:${DATABASE_SECRET_URL},identityref:${DATABASE_IDENTITY}" \
  --output none
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE" \
  --replace-env-vars PORT=8080 DATABASE_URL=secretref:database-url \
  --min-replicas 2 \
  --max-replicas 3 \
  --output none

contract_is_applied() {
  az rest --method get --uri "$RESOURCE_URI" --output json > "$APPLIED"
  node - "$APPLIED" <<'NODE'
const config = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const template = config.properties.template;
const container = template.containers.find(item => item.name === 'app');
const databaseEnv = container?.env?.some(item =>
  item.name === 'DATABASE_URL' && item.secretRef === 'database-url');
const databaseSecret = config.properties.configuration?.secrets?.some(item =>
  item.name === 'database-url' && item.keyVaultUrl?.includes('/secrets/sociobot-db-runtime-url'));
const detachedFileShare = (container?.volumeMounts?.length ?? 0) === 0 &&
  (template.volumes?.length ?? 0) === 0;
const scaled = template.scale?.minReplicas === 2 && template.scale?.maxReplicas === 3;
if (!databaseEnv || !databaseSecret || !detachedFileShare || !scaled) process.exit(1);
NODE
}

for _ in $(seq 1 40); do
  LIVE_SHA=$(curl --fail --silent --max-time 15 \
    https://in-class-draft-ticket.sociobot.in/health \
    | node -e "let data='';process.stdin.on('data',chunk=>data+=chunk).on('end',()=>console.log(JSON.parse(data).build_sha||''))" \
    2>/dev/null || true)
  if [ "$LIVE_SHA" = "$SOURCE_SHA" ] && contract_is_applied; then
    READY_REPLICAS=$(az containerapp replica list \
      --name "$APP_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --revision "$(az containerapp revision list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query '[?properties.active].name | [0]' -o tsv)" \
      --query 'length([?properties.containers[0].ready == `true`])' \
      --output tsv)
    if [ "${READY_REPLICAS:-0}" -lt 2 ]; then
      sleep 15
      continue
    fi
    LIVE_EXPECTED_REPLICAS="$READY_REPLICAS" node "$REPO_DIR/deployment/verify-live.mjs"
    echo "deployed $SOURCE_SHA with verified shared storage and rate limiting"
    exit 0
  fi
  sleep 15
done

echo "deployment did not report $SOURCE_SHA within ten minutes" >&2
exit 1
