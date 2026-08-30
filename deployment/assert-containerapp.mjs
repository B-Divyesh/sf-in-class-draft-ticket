import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const contractUrl = new URL('./containerapp-contract.json', import.meta.url);

/**
 * Proves the product revision uses exactly one durable SQLite volume. This is
 * intentionally separate from browser checks: a healthy page cannot prove a
 * revision has no unexpected runtime secret or replica-local state.
 */
export function assertContainerAppContract(resource, contract, expectedImage) {
  const properties = resource?.properties ?? resource;
  const template = properties?.template;
  const container = template?.containers?.find(item => item.name === 'app');
  const { scale, runtime, storage } = contract;

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
  assert.equal(properties?.configuration?.activeRevisionsMode, 'Single', 'the release must use one active revision');
  assert.deepEqual(
    template?.scale && { minReplicas: template.scale.minReplicas, maxReplicas: template.scale.maxReplicas },
    scale,
    'the release replica range does not match the one-replica deployment contract',
  );
  assert.deepEqual(container.env ?? [], [{ name: 'PORT', value: String(runtime.port) }], 'only PORT may be configured');
  assert.deepEqual(properties?.configuration?.secrets ?? [], [], 'the product must not configure runtime secrets');
  assert.deepEqual(
    container.volumeMounts ?? [],
    [{ volumeName: storage.volumeName, mountPath: storage.dataDirectory }],
    'the durable SQLite directory is not mounted at /data',
  );
  assert.deepEqual(
    template?.volumes ?? [],
    [{ name: storage.volumeName, storageType: 'AzureFile', storageName: storage.storageName }],
    'the revision does not define the product durable-data volume',
  );
}

function main() {
  const [resourcePath, expectedImage] = process.argv.slice(2);
  if (!resourcePath) {
    throw new Error('usage: node deployment/assert-containerapp.mjs <containerapp-resource.json> [expected-image]');
  }
  const resource = JSON.parse(readFileSync(resourcePath, 'utf8'));
  const contract = JSON.parse(readFileSync(contractUrl, 'utf8'));
  assertContainerAppContract(resource, contract, expectedImage);
  process.stdout.write('Container App SQLite deployment contract is applied.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
