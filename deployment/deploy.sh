#!/bin/bash
set -euo pipefail

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
SOURCE_SHA=$(git -C "$REPO_DIR" rev-parse HEAD)
RELEASE_BRANCH=${RELEASE_BRANCH:-main}
APP_NAME=sf-in-class-draft-ticket
RESOURCE_GROUP=sociobot
REGISTRY=sociobotregistry
IMAGE="$REGISTRY.azurecr.io/$APP_NAME:${SOURCE_SHA:0:12}"
SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID:-283af945-693b-4a6e-b952-df928d0a18a9}
RESOURCE_URI="https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$APP_NAME?api-version=2024-03-01"
APPLIED=$(mktemp)
trap 'rm -f "$APPLIED"' EXIT

# A deployment is release evidence for one immutable candidate. Refuse dirty or
# local-only source so a later documentation commit cannot become the reported
# candidate through a generic deploy that drops the PostgreSQL binding.
if [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=normal)" ]; then
  echo "deployment requires a clean worktree" >&2
  exit 1
fi
REMOTE_SHA=$(git -C "$REPO_DIR" ls-remote --exit-code origin "refs/heads/$RELEASE_BRANCH" | awk '{print $1}')
if [ "$REMOTE_SHA" != "$SOURCE_SHA" ]; then
  echo "deployment requires HEAD ($SOURCE_SHA) to equal origin/$RELEASE_BRANCH ($REMOTE_SHA)" >&2
  exit 1
fi

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
  --min-replicas 1 \
  --max-replicas 1 \
  --output none

contract_is_applied() {
  az rest --method get --uri "$RESOURCE_URI" --output json > "$APPLIED"
  node "$REPO_DIR/deployment/assert-containerapp.mjs" "$APPLIED"
}

for _ in $(seq 1 40); do
  # A query nonce also protects this check against an intermediary retaining a
  # response from an earlier revision. The handler sets no-store, but deploy
  # correctness must not depend on a cache honoring a newly deployed header.
  LIVE_HEALTH=$(curl --fail --silent --max-time 15 \
    "https://in-class-draft-ticket.sociobot.in/health?deploy-check=${SOURCE_SHA}-${RANDOM}" \
    2>/dev/null || true)
  if printf '%s' "$LIVE_HEALTH" | node -e "let data='';process.stdin.on('data',chunk=>data+=chunk).on('end',()=>{try { const health=JSON.parse(data); process.exit(health.build_sha === process.argv[1] && health.storage_backend === 'postgres' ? 0 : 1); } catch { process.exit(1); }})" "$SOURCE_SHA" && contract_is_applied; then
    READY_REPLICAS=$(az containerapp replica list \
      --name "$APP_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --revision "$(az containerapp revision list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query '[?properties.active].name | [0]' -o tsv)" \
      --query 'length([?properties.containers[0].ready == `true`])' \
      --output tsv)
    if [ "${READY_REPLICAS:-0}" -ne 1 ]; then
      sleep 15
      continue
    fi
    LIVE_EXPECTED_SHA="$SOURCE_SHA" node "$REPO_DIR/deployment/verify-live-identity.mjs"
    PERSISTENCE_RECORD=$(mktemp)
    trap 'rm -f "$APPLIED" "$PERSISTENCE_RECORD"' EXIT
    LIVE_EXPECTED_REPLICAS=1 LIVE_PERSISTENCE_RECORD="$PERSISTENCE_RECORD" node "$REPO_DIR/deployment/verify-live.mjs"
    ACTIVE_REVISION=$(az containerapp revision list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query '[?properties.active].name | [0]' -o tsv)
    az containerapp revision restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --revision "$ACTIVE_REVISION" --output none
    for _ in $(seq 1 40); do
      LIVE_HEALTH=$(curl --fail --silent --max-time 15 \
        "https://in-class-draft-ticket.sociobot.in/health?restart-check=${SOURCE_SHA}-${RANDOM}" \
        2>/dev/null || true)
      if printf '%s' "$LIVE_HEALTH" | node -e "let data='';process.stdin.on('data',chunk=>data+=chunk).on('end',()=>{try { const health=JSON.parse(data); process.exit(health.build_sha === process.argv[1] && health.storage_backend === 'postgres' ? 0 : 1); } catch { process.exit(1); }})" "$SOURCE_SHA"; then
        if LIVE_EXPECTED_SHA="$SOURCE_SHA" node "$REPO_DIR/deployment/verify-live-identity.mjs" && \
          LIVE_EXPECTED_REPLICAS=1 LIVE_PERSISTENCE_RECORD="$PERSISTENCE_RECORD" node "$REPO_DIR/deployment/verify-live.mjs" --assert-persistence-record; then
          echo "deployed $SOURCE_SHA with PostgreSQL persistence across a revision restart"
          exit 0
        fi
      fi
      sleep 15
    done
    echo "revision restart did not preserve the verified PostgreSQL session" >&2
    exit 1
  fi
  sleep 15
done

echo "deployment did not report $SOURCE_SHA within ten minutes" >&2
exit 1
