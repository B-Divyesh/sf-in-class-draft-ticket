import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const repo = new URL('..', import.meta.url);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForHealth(replica) {
  let lastError;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (replica.process.exitCode !== null) {
      throw new Error(`replica exited with ${replica.process.exitCode}: ${replica.logs()}`);
    }
    try {
      const response = await fetch(`${replica.url}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw new Error(`server at ${replica.url} did not become healthy: ${lastError ?? ''}\n${replica.logs()}`);
}

function startReplica(port, dataDir) {
  const server = spawn('./target/debug/in-class-draft-ticket', [], {
    cwd: repo,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  return {
    process: server,
    url: `http://127.0.0.1:${port}`,
    logs: () => output,
    async stop() {
      if (server.exitCode !== null) return;
      server.kill('SIGTERM');
      await new Promise(resolve => {
        const timeout = setTimeout(() => server.kill('SIGKILL'), 5_000);
        server.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
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

test('production replicas share durable PostgreSQL', async () => {
  const deployment = JSON.parse(await read('deployment/containerapp-contract.json'));
  assert.deepEqual(deployment.scale, { minReplicas: 2, maxReplicas: 3 });
  assert.deepEqual(deployment.database, {
    type: 'AzureDatabaseForPostgreSQL',
    host: 'sociobot-db.postgres.database.azure.com',
    environmentVariable: 'DATABASE_URL',
    containerSecretName: 'database-url',
    keyVaultSecretUrl: 'https://sociobot-keyvault1.vault.azure.net/secrets/sociobot-db-runtime-url',
    identity: '/subscriptions/283af945-693b-4a6e-b952-df928d0a18a9/resourceGroups/sociobot/providers/Microsoft.ManagedIdentity/userAssignedIdentities/factory-worker-identity',
    schema: 'in_class_draft_ticket'
  });
  assert.deepEqual(deployment.runtime.requiredEnvironment, ['PORT']);
  assert.deepEqual(deployment.runtime.optionalEnvironment, ['DATABASE_URL']);
});

test('deployment contract describes the PostgreSQL secret and scale settings', () => {
  const image = 'sociobotregistry.azurecr.io/sf-in-class-draft-ticket:test-sha';
  const rendered = JSON.parse(execFileSync(
    process.execPath,
    ['deployment/render-containerapp.mjs', image],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  ));
  assert.deepEqual(rendered.properties.template.scale, { minReplicas: 2, maxReplicas: 3 });
  assert.deepEqual(rendered.properties.template.volumes, []);
  assert.deepEqual(rendered.properties.configuration.secrets, [{
    name: 'database-url',
    keyVaultUrl: 'https://sociobot-keyvault1.vault.azure.net/secrets/sociobot-db-runtime-url',
    identity: '/subscriptions/283af945-693b-4a6e-b952-df928d0a18a9/resourceGroups/sociobot/providers/Microsoft.ManagedIdentity/userAssignedIdentities/factory-worker-identity'
  }]);
  assert.deepEqual(rendered.properties.template.containers, [{
    name: 'app',
    image,
    resources: { cpu: 0.5, memory: '1Gi' },
    env: [
      { name: 'PORT', value: '8080' },
      { name: 'DATABASE_URL', secretRef: 'database-url' }
    ],
    volumeMounts: []
  }]);
});

test('product deploy path materializes the PostgreSQL secret and starts a two-replica revision', async () => {
  const deploy = await read('deployment/deploy.sh');
  assert.match(deploy, /az containerapp secret set/);
  assert.match(deploy, /keyvaultref:\$\{DATABASE_SECRET_URL\},identityref:\$\{DATABASE_IDENTITY\}/);
  assert.match(deploy, /az containerapp update/);
  assert.match(deploy, /--replace-env-vars PORT=8080 DATABASE_URL=secretref:database-url/);
  assert.match(deploy, /--min-replicas 2/);
  assert.match(deploy, /--max-replicas 3/);
  assert.match(deploy, /verify-live\.mjs/);
  assert.match(deploy, /LIVE_EXPECTED_REPLICAS/);
  assert.match(deploy, /verified shared storage and rate limiting/);
  assert.doesNotMatch(deploy, /az rest --method patch/);
  assert.doesNotMatch(deploy, /deploy-container\.sh/);
});

test('live gate uses fresh browser processes and rejects affinity-only coverage', async () => {
  const gate = await read('deployment/verify-live.mjs');
  assert.match(gate, /from '@playwright\/test'/);
  assert.match(gate, /chromium\.launch/);
  assert.match(gate, /new browser process is deliberate/);
  assert.match(gate, /x-draft-ticket-replica/);
  assert.match(gate, /observedReplicas\.size >= expectedReplicas/);
  assert.match(gate, /demo teacher read/);
  assert.match(gate, /real teacher read/);
});

test('claim runner compiles before Playwright starts its server timer', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const playwright = await read('playwright.config.ts');
  assert.match(pkg.scripts.pretest, /cargo build/);
  assert.match(playwright, /command: '\.\/target\/debug\/in-class-draft-ticket'/);
  assert.doesNotMatch(playwright, /command: 'cargo run'/);
});

test('simultaneous replica starts never race migration history', {
  concurrency: false,
  timeout: 45_000
}, async () => {
  // This is the exact cold-start boundary that intermittently failed the
  // verifier's required claim command with a duplicate _sqlx_migrations row.
  for (let round = 0; round < 8; round += 1) {
    const dataDir = await mkdtemp(join(tmpdir(), 'draft-ticket-cold-start-'));
    const basePort = 20_000 + Math.floor(Math.random() * 10_000);
    const replicas = Array.from({ length: 3 }, (_, index) => startReplica(basePort + index, dataDir));
    try {
      await Promise.all(replicas.map(waitForHealth));
    } finally {
      await Promise.all(replicas.map(replica => replica.stop()));
      await rm(dataDir, { recursive: true, force: true });
    }
  }
});

test('replicas share demo, teacher, student, export, delete, capacity, and rate state', {
  concurrency: false,
  timeout: 60_000
}, async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'draft-ticket-replicas-'));
  const basePort = 19_000 + Math.floor(Math.random() * 1_000);
  const first = startReplica(basePort, dataDir);
  const second = startReplica(basePort + 1, dataDir);
  const third = startReplica(basePort + 2, dataDir);
  const replicas = [first, second, third];
  const headers = { 'X-Forwarded-For': '198.51.100.2, 203.0.113.44' };

  try {
    // Cold-start both replicas at once. This includes the shared schema lock
    // path that previously made one live replica crash-loop.
    await Promise.all(replicas.map(waitForHealth));
    const health = await Promise.all(replicas.map(replica => fetch(`${replica.url}/health`)));
    const identities = new Set(health.map(response => response.headers.get('x-draft-ticket-replica')));
    assert.equal(identities.size, 3, 'every process exposes a distinct opaque replica identity');
    assert.ok([...identities].every(Boolean));
    const healthBodies = await Promise.all(health.map(response => response.json()));
    assert.ok(healthBodies.every(body => body.storage_backend === 'sqlite'));
    const created = await Promise.all(replicas.concat(replicas).map(async (replica, index) => {
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

    const sessionResponse = await fetch(`${first.url}/api/sessions`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Replica boundary seminar',
        prompt: 'Where does the draft change direction?',
        retention_days: 7
      })
    });
    assert.equal(sessionResponse.status, 201);
    const session = await sessionResponse.json();
    assert.equal((await fetch(`${second.url}/api/sessions/${session.session.code}`, { headers })).status, 200);

    const formulaTicket = {
      pseudonym: '=HYPERLINK("https://example.invalid")',
      claim: '@SUM(1,1)',
      evidence: '+2+2',
      revision: '-1+1',
      reflection: '=1+1'
    };
    const submitted = await fetch(`${third.url}/api/sessions/${session.session.code}/tickets`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(formulaTicket)
    });
    assert.equal(submitted.status, 201);

    const teacherHeaders = { ...headers, Authorization: `Bearer ${session.teacher_token}` };
    const teacher = await fetch(`${second.url}/api/teacher/${session.session.code}`, { headers: teacherHeaders });
    assert.equal(teacher.status, 200);
    assert.equal((await teacher.json()).tickets.length, 1);
    const exported = await fetch(`${first.url}/api/teacher/${session.session.code}/export`, { headers: teacherHeaders });
    assert.equal(exported.status, 200);
    const csv = await exported.text();
    for (const safeValue of ["'=HYPERLINK", "'@SUM", "'+2+2", "'-1+1", "'=1+1"]) {
      assert.match(csv, new RegExp(safeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.doesNotMatch(csv, /,"[=+@-]/);

    const capacityResponse = await fetch(`${second.url}/api/sessions`, {
      method: 'POST',
      headers: { 'X-Forwarded-For': '203.0.113.45', 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Capacity seminar',
        prompt: 'Where does this paragraph change?',
        retention_days: 1
      })
    });
    assert.equal(capacityResponse.status, 201);
    const capacity = await capacityResponse.json();
    const ticketBody = {
      pseudonym: 'Blue Finch',
      claim: 'A focused working claim.',
      evidence: 'Page 4, paragraph 2.',
      revision: 'I moved the quotation earlier.',
      reflection: 'I will explain the image next.'
    };
    const submissions = await Promise.all(Array.from({ length: 45 }, (_, index) => fetch(
      `${replicas[index % replicas.length].url}/api/sessions/${capacity.session.code}/tickets`, {
        method: 'POST',
        headers: {
          'X-Forwarded-For': `198.51.100.${index + 1}, 203.0.114.${index + 1}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ ...ticketBody, pseudonym: `Blue Finch ${index}` })
      }
    )));
    assert.equal(submissions.filter(response => response.status === 201).length, 40);
    assert.equal(submissions.filter(response => response.status === 409).length, 5);
    const capacityTeacher = await fetch(`${third.url}/api/teacher/${capacity.session.code}`, {
      headers: { 'X-Forwarded-For': '203.0.113.46', Authorization: `Bearer ${capacity.teacher_token}` }
    });
    assert.equal(capacityTeacher.status, 200);
    assert.equal((await capacityTeacher.json()).tickets.length, 40);

    await delay(1_100);
    await inFreshRateWindow();
    const burst = await Promise.all(Array.from({ length: 45 }, (_, index) => fetch(
      `${replicas[index % replicas.length].url}/api/sessions/ZZZZZZ`, {
        headers: { 'X-Forwarded-For': `198.51.100.${index + 1}, 203.0.113.200` }
      }
    )));
    assert.equal(burst.filter(response => response.status === 404).length, 40);
    const limited = burst.filter(response => response.status === 429);
    assert.equal(limited.length, 5);
    assert.ok(limited.every(response => response.headers.get('retry-after') === '1'));

    const deleted = await fetch(`${third.url}/api/teacher/${session.session.code}`, {
      method: 'DELETE', headers: teacherHeaders
    });
    assert.equal(deleted.status, 204);
    assert.equal((await fetch(`${first.url}/api/sessions/${session.session.code}`, { headers })).status, 404);
    assert.equal((await fetch(`${second.url}/api/teacher/${session.session.code}`, { headers: teacherHeaders })).status, 401);
  } finally {
    await Promise.all(replicas.map(replica => replica.stop()));
    await rm(dataDir, { recursive: true, force: true });
  }
});
