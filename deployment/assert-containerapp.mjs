import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const contractUrl = new URL('./containerapp-contract.json', import.meta.url);

function values(items = []) {
  return new Map(items.map(item => [item.name, item]));
}

function sameResourceId(actual, expected) {
  return typeof actual === 'string' && actual.toLowerCase() === expected.toLowerCase();
}

/**
 * Reject a Container Apps resource that can silently fall back to local SQLite.
 * This stays separate from the browser gate so deployment configuration is
 * proven before health or ingress affinity can make an incomplete revision
 * look healthy.
 */
export function assertContainerAppContract(resource, contract, expectedImage) {
  const properties = resource?.properties ?? resource;
  const template = properties?.template;
  const container = template?.containers?.find(item => item.name === 'app');
  const { database, scale, runtime } = contract;

  assert.ok(container, 'the app container is missing from the revision template');
  if (expectedImage) {
    assert.equal(container.image, expectedImage, 'the latest revision does not use the requested image');
    assert.ok(properties?.latestRevisionName, 'the latest revision name is missing');
    assert.equal(
      properties?.latestReadyRevisionName,
      properties.latestRevisionName,
      `the requested revision ${properties.latestRevisionName} is not ready; traffic remains on ${properties?.latestReadyRevisionName ?? 'no ready revision'}`,
    );
  }
  assert.equal(
    properties?.configuration?.activeRevisionsMode,
    'Single',
    'the release must use one active revision',
  );
  assert.deepEqual(
    template?.scale && {
      minReplicas: template.scale.minReplicas,
      maxReplicas: template.scale.maxReplicas,
    },
    scale,
    'the release replica range does not match the deployment contract',
  );
  assert.equal(
    container?.env?.find(item => item.name === 'PORT')?.value,
    String(runtime.port),
    'PORT is missing from the revision template',
  );
  assert.equal(
    container?.env?.find(item => item.name === database.environmentVariable)?.secretRef,
    database.containerSecretName,
    'DATABASE_URL is not bound to the Key Vault secret',
  );

  const secret = values(properties?.configuration?.secrets).get(database.containerSecretName);
  assert.ok(secret, 'the PostgreSQL Key Vault secret is not configured');
  assert.equal(
    secret.keyVaultUrl,
    database.keyVaultSecretUrl,
    'the configured secret does not point at the PostgreSQL URL',
  );
  assert.ok(
    sameResourceId(secret.identity, database.identity),
    'the Key Vault secret does not use the expected managed identity',
  );
  assert.equal((container.volumeMounts ?? []).length, 0, 'the release must not mount a local SQLite share');
  assert.equal((template?.volumes ?? []).length, 0, 'the release must not define a local SQLite volume');
}

function main() {
  const [resourcePath, expectedImage] = process.argv.slice(2);
  if (!resourcePath) {
    throw new Error('usage: node deployment/assert-containerapp.mjs <containerapp-resource.json> [expected-image]');
  }
  const resource = JSON.parse(readFileSync(resourcePath, 'utf8'));
  const contract = JSON.parse(readFileSync(contractUrl, 'utf8'));
  assertContainerAppContract(resource, contract, expectedImage);
  process.stdout.write('Container App PostgreSQL deployment contract is applied.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
