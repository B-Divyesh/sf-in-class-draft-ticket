import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const repo = new URL('..', import.meta.url);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForHealth(url) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw lastError ?? new Error(`server at ${url} did not become healthy`);
}

function startReplica(port, dataDir) {
  const server = spawn('./target/debug/in-class-draft-ticket', [], {
    cwd: repo,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: 'ignore'
  });
  return {
    url: `http://127.0.0.1:${port}`,
    async stop() {
      if (server.exitCode !== null) return;
      server.kill('SIGTERM');
      await Promise.race([
        new Promise(resolve => server.once('exit', resolve)),
        delay(5_000).then(() => server.kill('SIGKILL'))
      ]);
    }
  };
}

async function inFreshRateWindow() {
  while (Date.now() % 1_000 > 100) await delay(10);
}

test('container build tracks stable Rust instead of a minor release', async () => {
  const dockerfile = await read('Dockerfile');
  assert.match(dockerfile, /^FROM rust:1-(?:alpine|slim) AS backend$/m);
  assert.doesNotMatch(dockerfile, /^FROM rust:1\.\d+/m);
});

test('production replicas share the durable data mount', async () => {
  const deployment = JSON.parse(await read('deployment/containerapp-contract.json'));
  assert.deepEqual(deployment.scale, { minReplicas: 2, maxReplicas: 3 });
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
  assert.deepEqual(rendered.properties.template.scale, { minReplicas: 2, maxReplicas: 3 });
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
  assert.match(deploy, /shared-storage multi-replica contract/);
  assert.match(deploy, /session-data/);
  assert.doesNotMatch(deploy, /deploy-container\.sh/);
});

test('claim runner compiles before Playwright starts its server timer', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const playwright = await read('playwright.config.ts');
  assert.match(pkg.scripts.pretest, /cargo build/);
  assert.match(playwright, /command: '\.\/target\/debug\/in-class-draft-ticket'/);
  assert.doesNotMatch(playwright, /command: 'cargo run'/);
});

test('concurrent replicas share a new demo and enforce one client rate limit', {
  concurrency: false,
  timeout: 45_000
}, async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'draft-ticket-replicas-'));
  const basePort = 19_000 + Math.floor(Math.random() * 1_000);
  const first = startReplica(basePort, dataDir);
  let second;
  let replicas = [first];
  const headers = { 'X-Forwarded-For': '203.0.113.44' };

  try {
    // Start one replica first so migration setup cannot race; both then open the
    // same mounted-style data directory, exactly as independent containers do.
    await waitForHealth(first.url);
    second = startReplica(basePort + 1, dataDir);
    replicas = [first, second];
    await waitForHealth(second.url);
    const created = await Promise.all(replicas.concat(replicas, replicas, replicas).map(async (replica, index) => {
      const response = await fetch(`${replica.url}/api/demo`, { method: 'POST', headers });
      assert.equal(response.status, 201, `demo ${index} should be created`);
      return response.json();
    }));

    await Promise.all(created.flatMap((demo, index) => {
      const other = replicas[(index + 1) % replicas.length];
      return [
        fetch(`${other.url}/api/teacher/${demo.session.code}`, {
          headers: { ...headers, Authorization: `Bearer ${demo.teacher_token}` }
        }).then(async response => {
          assert.equal(response.status, 200, 'cross-replica teacher read');
          assert.equal((await response.json()).tickets.length, 3);
        }),
        fetch(`${other.url}/api/sessions/${demo.session.code}`, { headers }).then(async response => {
          assert.equal(response.status, 200, 'cross-replica student read');
          assert.equal((await response.json()).is_demo, true);
        })
      ];
    }));

    await delay(1_100);
    await inFreshRateWindow();
    const burst = await Promise.all(Array.from({ length: 45 }, (_, index) => fetch(
      `${replicas[index % replicas.length].url}/api/sessions/ZZZZZZ`, { headers }
    )));
    assert.equal(burst.filter(response => response.status === 404).length, 40);
    const limited = burst.filter(response => response.status === 429);
    assert.equal(limited.length, 5);
    assert.ok(limited.every(response => response.headers.get('retry-after') === '1'));
  } finally {
    await Promise.all(replicas.map(replica => replica.stop()));
    await rm(dataDir, { recursive: true, force: true });
  }
});
