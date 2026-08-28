import assert from 'node:assert/strict';
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

test('claim runner compiles before Playwright starts its server timer', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const playwright = await read('playwright.config.ts');
  assert.match(pkg.scripts.pretest, /cargo build/);
  assert.match(playwright, /command: '\.\/target\/debug\/in-class-draft-ticket'/);
  assert.doesNotMatch(playwright, /command: 'cargo run'/);
});
