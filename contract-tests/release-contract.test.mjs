import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('container build tracks stable Rust instead of a minor release', async () => {
  const dockerfile = await read('Dockerfile');
  assert.match(dockerfile, /^FROM rust:1-(?:alpine|slim) AS backend$/m);
  assert.doesNotMatch(dockerfile, /^FROM rust:1\.\d+/m);
});

test('production SQLite uses one replica and a durable data mount', async () => {
  const deployment = JSON.parse(await read('deployment/containerapp-contract.json'));
  assert.deepEqual(deployment.scale, { minReplicas: 1, maxReplicas: 1 });
  assert.deepEqual(deployment.storage, {
    type: 'AzureFile',
    environmentStorageName: 'in-class-draft-ticket-data',
    accountName: 'sociobotblob',
    shareName: 'sf-in-class-draft-ticket-data',
    volumeName: 'session-data',
    mountPath: '/app/data',
    accessMode: 'ReadWrite'
  });
  assert.deepEqual(deployment.runtime.requiredEnvironment, ['PORT']);
});

test('deployment renderer applies the storage and scale contract atomically', () => {
  const image = 'sociobotregistry.azurecr.io/sf-in-class-draft-ticket:test-sha';
  const rendered = JSON.parse(execFileSync(
    process.execPath,
    ['deployment/render-containerapp.mjs', image],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  ));
  assert.deepEqual(rendered.properties.template.scale, { minReplicas: 1, maxReplicas: 1 });
  assert.deepEqual(rendered.properties.template.volumes, [{
    name: 'session-data', storageType: 'AzureFile', storageName: 'in-class-draft-ticket-data'
  }]);
  assert.deepEqual(rendered.properties.template.containers, [{
    name: 'app',
    image,
    resources: { cpu: 0.5, memory: '1Gi' },
    env: [{ name: 'PORT', value: '8080' }],
    volumeMounts: [{ volumeName: 'session-data', mountPath: '/app/data' }]
  }]);
});

test('product deploy path uses the contract renderer instead of the generic three-replica deployer', async () => {
  const deploy = await read('deployment/deploy.sh');
  assert.match(deploy, /render-containerapp\.mjs/);
  assert.match(deploy, /az rest --method patch/);
  assert.doesNotMatch(deploy, /deploy-container\.sh/);
});

test('claim runner compiles before Playwright starts its server timer', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const playwright = await read('playwright.config.ts');
  assert.match(pkg.scripts.pretest, /cargo build/);
  assert.match(playwright, /command: '\.\/target\/debug\/in-class-draft-ticket'/);
  assert.doesNotMatch(playwright, /command: 'cargo run'/);
});
