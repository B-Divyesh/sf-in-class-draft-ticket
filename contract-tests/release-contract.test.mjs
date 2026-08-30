import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertContainerAppContract } from '../deployment/assert-containerapp.mjs';
import { verifyLiveIdentity } from '../deployment/verify-live-identity.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const repo = new URL('..', import.meta.url);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const escapeRegExp = value => value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

function startServer(port, dataDir) {
  const child = spawn('./target/debug/in-class-draft-ticket', [], {
    cwd: repo,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  return {
    process: child,
    url: 'http://127.0.0.1:' + port,
    logs: () => output,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await new Promise(resolve => {
        const timeout = setTimeout(() => child.kill('SIGKILL'), 5_000);
        child.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  };
}

async function waitForHealth(server) {
  let lastError;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (server.process.exitCode !== null) {
      throw new Error('server exited with ' + server.process.exitCode + ': ' + server.logs());
    }
    try {
      const response = await fetch(server.url + '/health');
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw new Error('server did not become healthy: ' + (lastError ?? '') + '\n' + server.logs());
}

function safeRevision(image) {
  return {
    properties: {
      latestRevisionName: 'sf-in-class-draft-ticket--0000060',
      latestReadyRevisionName: 'sf-in-class-draft-ticket--0000060',
      configuration: { activeRevisionsMode: 'Single', secrets: [] },
      template: {
        containers: [{
          name: 'app',
          image,
          env: [{ name: 'PORT', value: '8080' }],
          volumeMounts: [{ volumeName: 'durable-data', mountPath: '/data' }]
        }],
        scale: { minReplicas: 1, maxReplicas: 1 },
        volumes: [{
          name: 'durable-data',
          storageType: 'AzureFile',
          storageName: 'sf-in-class-draft-ticket-data'
        }]
      }
    }
  };
}

test('container build tracks stable Rust and includes only SQLite inputs', async () => {
  const [dockerfile, buildScript] = await Promise.all([read('Dockerfile'), read('build.rs')]);
  assert.match(dockerfile, /^FROM rust:1-(?:alpine|slim) AS backend$/m);
  assert.doesNotMatch(dockerfile, /^FROM rust:1\.\d+/m);
  assert.match(dockerfile, /mkdir -p \/app \/data/);
  assert.doesNotMatch(dockerfile, new RegExp('migrations-' + 'post' + 'gres', 'i'));
  assert.match(buildScript, /cargo:rerun-if-env-changed=BUILD_SHA/);
});

test('raw social metadata uses factual product copy', async () => {
  const html = await read('index.html');
  assert.match(html, /property="og:description" content="Record in-class drafting choices without surveillance\."/);
  assert.match(html, /name="twitter:description" content="Record in-class drafting choices without surveillance\."/);
});

test('production uses one mounted SQLite replica and no optional runtime environment', async () => {
  const deployment = JSON.parse(await read('deployment/containerapp-contract.json'));
  assert.deepEqual(deployment.scale, { minReplicas: 1, maxReplicas: 1 });
  assert.deepEqual(deployment.storage, {
    type: 'SQLite',
    dataDirectory: '/data',
    volumeName: 'durable-data',
    storageName: 'sf-in-class-draft-ticket-data'
  });
  assert.deepEqual(deployment.deploy, { data_dir: '/data' });
  assert.deepEqual(deployment.runtime.requiredEnvironment, ['PORT']);
  assert.deepEqual(deployment.runtime.optionalEnvironment, []);
});

test('deployment renderer mounts /data and configures only PORT', () => {
  const image = 'factory.example/sf-in-class-draft-ticket:test-sha';
  const rendered = JSON.parse(execFileSync(
    process.execPath,
    ['deployment/render-containerapp.mjs', image],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  ));
  assert.deepEqual(rendered.properties.configuration, { activeRevisionsMode: 'Single', secrets: [] });
  assert.deepEqual(rendered.properties.template.scale, { minReplicas: 1, maxReplicas: 1 });
  assert.deepEqual(rendered.properties.template.volumes, [{
    name: 'durable-data',
    storageType: 'AzureFile',
    storageName: 'sf-in-class-draft-ticket-data'
  }]);
  assert.deepEqual(rendered.properties.template.containers, [{
    name: 'app',
    image,
    resources: { cpu: 0.5, memory: '1Gi' },
    env: [{ name: 'PORT', value: '8080' }],
    volumeMounts: [{ volumeName: 'durable-data', mountPath: '/data' }]
  }]);
});

test('@claim:release-contract rejects the captured unsafe revision shape and every forbidden runtime setting', async () => {
  const contract = JSON.parse(await read('deployment/containerapp-contract.json'));
  const image = 'factory.example/sf-in-class-draft-ticket:repair';
  const revision = safeRevision(image);
  assert.doesNotThrow(() => assertContainerAppContract(revision, contract, image));

  const notReady = structuredClone(revision);
  notReady.properties.latestReadyRevisionName = 'sf-in-class-draft-ticket--0000059';
  assert.throws(
    () => assertContainerAppContract(notReady, contract, image),
    /requested revision sf-in-class-draft-ticket--0000060 is not ready/
  );
  const noMount = structuredClone(revision);
  noMount.properties.template.containers[0].volumeMounts = [];
  assert.throws(() => assertContainerAppContract(noMount, contract), /mounted at \/data/);
  const manyReplicas = structuredClone(revision);
  manyReplicas.properties.template.scale.maxReplicas = 3;
  assert.throws(() => assertContainerAppContract(manyReplicas, contract), /one-replica/);

  const forbidden = [
    'sociobot' + '-v2',
    'sociobot' + '-db',
    'sociobot' + '-keyvault1',
    'shared post' + 'gres',
    'pg' + 'bouncer',
    'post' + 'gres',
    'DATA' + '_URL'
  ];
  const secrets = structuredClone(revision);
  secrets.properties.configuration.secrets = [{ name: forbidden[1], value: 'blocked' }];
  assert.throws(() => assertContainerAppContract(secrets, contract), /runtime secrets/);
  for (const name of forbidden) {
    const externalEnv = structuredClone(revision);
    externalEnv.properties.template.containers[0].env.push({ name, value: 'blocked' });
    assert.throws(() => assertContainerAppContract(externalEnv, contract), /only PORT/);
  }
});

test('repository, deployment files, and dependency lock contain no forbidden storage references', async () => {
  const forbidden = [
    'sociobot' + '-v2',
    'sociobot' + '-db',
    'sociobot' + '-keyvault1',
    'shared post' + 'gres',
    'pg' + 'bouncer',
    'post' + 'gres',
    'DATABASE' + '_URL'
  ];
  // Verifier reports are historical evidence and quote the failed backend.
  // Scan only source and packaging inputs that can enter the release image.
  const skip = new Set(['.factory', '.git', 'node_modules', 'target', 'dist', 'graphify-out']);
  async function filesAt(path) {
    const files = [];
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const child = join(path, entry.name);
      if (entry.isDirectory()) files.push(...await filesAt(child));
      else if (entry.isFile()) files.push(child);
    }
    return files;
  }
  const files = await filesAt(new URL('..', import.meta.url).pathname);
  for (const file of files) {
    const content = await readFile(file, 'utf8').catch(() => '');
    for (const name of forbidden) {
      assert.ok(!content.toLowerCase().includes(name.toLowerCase()), file + ' contains forbidden storage reference ' + name);
    }
  }
});

test('deployment script only mutates this app and verifies mounted SQLite persistence', async () => {
  const deploy = await read('deployment/deploy.sh');
  assert.match(deploy, /APP_NAME=sf-in-class-draft-ticket/);
  assert.match(deploy, /DEPLOY_IMAGE=/);
  assert.match(deploy, /az rest --method patch/);
  assert.match(deploy, /render-containerapp\.mjs/);
  assert.match(deploy, /--revision "\$READY_REVISION"/);
  assert.match(deploy, /az containerapp revision restart/);
  assert.match(deploy, /--assert-persistence-record/);
  assert.match(deploy, /health\.storage_backend === 'sqlite'/);
  assert.doesNotMatch(deploy, /az acr build/);
  assert.equal((deploy.match(/verify-live-identity\.mjs/g) ?? []).length, 2);
});

test('live identity gate rejects stale builds and expects SQLite', async () => {
  const expectedSha = '32d8eefd699a611d5b39ef7ea77f827df1009555';
  const staleSha = '7864b293028bf0ed1bc99911a766418437933494';
  let reportedSha = staleSha;
  const requestUrls = [];
  const server = createServer((request, response) => {
    requestUrls.push(request.url);
    response.writeHead(200, { 'cache-control': 'no-store, max-age=0', 'content-type': 'application/json' });
    response.end(JSON.stringify({
      build_sha: reportedSha,
      replica_id: 'fixture-replica',
      status: 'ok',
      storage_backend: 'sqlite'
    }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = 'http://127.0.0.1:' + address.port;
  try {
    await assert.rejects(
      verifyLiveIdentity({ baseUrl, expectedSha }),
      new RegExp('live build identity mismatch.*expected ' + expectedSha + ', received ' + staleSha)
    );
    assert.equal(requestUrls.length, 20);
    assert.equal(new Set(requestUrls).size, 20);
    reportedSha = expectedSha;
    const evidence = await verifyLiveIdentity({ baseUrl, expectedSha });
    assert.deepEqual(
      { buildSha: evidence.buildSha, storageBackend: evidence.storageBackend, sampleCount: evidence.sampleCount },
      { buildSha: expectedSha, storageBackend: 'sqlite', sampleCount: 20 }
    );
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('health remains no-store while reporting the SQLite identity', async () => {
  const server = await read('src/main.rs');
  assert.match(server, /let is_health = req\.uri\(\)\.path\(\) == "\/health"/);
  assert.match(server, /HeaderValue::from_static\("no-store, max-age=0"\)/);
  assert.match(server, /"storage_backend": state\.db\.storage_backend\(\)/);
});

test('a mounted SQLite file persists an API record across a process restart', {
  concurrency: false,
  timeout: 30_000
}, async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'draft-ticket-mounted-data-'));
  const port = 20_000 + Math.floor(Math.random() * 10_000);
  let first = startServer(port, dataDir);
  try {
    await waitForHealth(first);
    const create = await fetch(first.url + '/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.90' },
      body: JSON.stringify({
        title: 'Restart record',
        prompt: 'Where does the draft change direction?',
        retention_days: 1
      })
    });
    assert.equal(create.status, 201);
    const record = await create.json();
    assert.equal(existsSync(join(dataDir, 'tickets.db')), true);
    await first.stop();
    const second = startServer(port, dataDir);
    await waitForHealth(second);
    const restored = await fetch(second.url + '/api/sessions/' + record.session.code);
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).title, 'Restart record');
    await second.stop();
  } finally {
    await first.stop();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('claim runner compiles before Playwright starts its server timer', async () => {
  const [pkg, playwright] = await Promise.all([read('package.json').then(JSON.parse), read('playwright.config.ts')]);
  assert.match(pkg.scripts.pretest, /cargo build/);
  assert.match(playwright, /command: '\.\/target\/debug\/in-class-draft-ticket'/);
  assert.match(playwright, /workers: externalBaseUrl \? 1 : undefined/);
  assert.doesNotMatch(playwright, /command: 'cargo run'/);
});

test('every listed product claim has exactly one tagged regression test', async () => {
  const claims = JSON.parse(await read('.factory/claims.json'));
  const testSources = await Promise.all([
    read('tests/product.spec.ts'),
    read('contract-tests/release-contract.test.mjs'),
    read('src/main.rs'),
    read('src/db.rs')
  ]);
  for (const claim of claims) {
    const matches = testSources.join('\n').match(new RegExp('@claim:' + claim.id + '\\b', 'g')) ?? [];
    assert.equal(matches.length, 1, claim.id + ' needs exactly one tagged test');
  }
});

test('every product claim runs in a clean local sandbox', async () => {
  const claims = JSON.parse(await read('.factory/claims.json'));
  assert.equal(claims.length, 13, 'the registry must include every public product and runtime promise');
  const unsafe = /(?:deploy|production-topology|verify-live|\baz\b|sociobot\.in)/i;
  for (const claim of claims) {
    assert.doesNotMatch(claim.test, unsafe, claim.id + ' must not deploy or call the live service');
    assert.doesNotMatch(claim.sandbox, unsafe, claim.id + ' must describe a disposable local sandbox');
  }
});

test('README behavioral promises are all registered claims', async () => {
  const [readme, claims] = await Promise.all([
    read('README.md'),
    read('.factory/claims.json').then(JSON.parse)
  ]);
  const promiseCoverage = [
    ['six-character code', 'pseudonymous-flow'],
    ['exports the full session as CSV', 'csv-export'],
    ['expires after 24 hours', 'sample-demo'],
    ['one, seven, or thirty days', 'session-retention'],
    ['up to 40 draft tickets', 'free-capacity'],
    ['does not detect AI', 'no-ai-detection-or-authorship-verdict'],
    ['without an account', 'free-no-account-core-flow'],
    ['SQLite stores runtime state', 'runtime-defaults'],
    ['build SHA and selected storage backend', 'health-build-identity'],
    ['release gate requires one ready replica', 'release-contract']
  ];
  for (const [text, claimId] of promiseCoverage) {
    assert.match(readme, new RegExp(escapeRegExp(text)));
    const claim = claims.find(item => item.id === claimId);
    assert.ok(claim, claimId + ' must be listed for README promise: ' + text);
    assert.match(claim.where, /README/);
  }
});
