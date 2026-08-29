import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const baseUrl = (process.env.LIVE_BASE_URL ?? 'https://in-class-draft-ticket.sociobot.in').replace(/\/$/, '');
const expectedReplicas = Number(process.env.LIVE_EXPECTED_REPLICAS ?? 1);
const jsonHeaders = { 'content-type': 'application/json' };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const observedReplicas = new Set();
const persistenceRecordPath = process.env.LIVE_PERSISTENCE_RECORD;

async function browserApi(path, options = {}, label) {
  // A new browser process is deliberate. Reusing Node's socket pool or one
  // browser network service can hide a replica-local write behind connection
  // affinity. Every API operation below therefore crosses a new real browser
  // context, matching the teacher and student flows that previously failed.
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const result = await page.evaluate(async ({ requestPath, requestOptions }) => {
      const response = await fetch(`/api${requestPath}`, requestOptions);
      return {
        status: response.status,
        body: await response.text(),
        replica: response.headers.get('x-draft-ticket-replica')
      };
    }, { requestPath: path, requestOptions: options });
    assert.ok(result.replica, `${label}: response did not identify the serving replica`);
    observedReplicas.add(result.replica);
    return result;
  } finally {
    await browser.close();
  }
}

async function browserJson(path, options, expected, label) {
  const response = await browserApi(path, options, label);
  assert.equal(response.status, expected, `${label}: HTTP ${response.status}: ${response.body}`);
  return response.body ? JSON.parse(response.body) : undefined;
}

async function api(path, options = {}) {
  return fetch(`${baseUrl}/api${path}`, { signal: AbortSignal.timeout(20_000), ...options });
}

async function deleteRecord(record) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await browserApi(`/teacher/${record.session.code}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${record.teacher_token}` }
      }, `cleanup ${record.session.code}`);
      if ([204, 401].includes(response.status)) return;
    } catch {}
    await delay(300);
  }
}

const records = [];
let real;
let persistenceRecord;

if (process.argv.includes('--assert-persistence-record')) {
  assert.ok(persistenceRecordPath, 'LIVE_PERSISTENCE_RECORD is required for restart verification');
  const record = JSON.parse(readFileSync(persistenceRecordPath, 'utf8'));
  const student = await browserApi(`/sessions/${record.session.code}`, {}, 'post-restart student read');
  assert.equal(student.status, 200, `post-restart student read: HTTP ${student.status}: ${student.body}`);
  assert.notEqual(student.replica, record.replica_id, 'revision restart must replace the serving process');
  const teacher = await browserApi(`/teacher/${record.session.code}`, {
    headers: { Authorization: `Bearer ${record.teacher_token}` }
  }, 'post-restart teacher read');
  assert.equal(teacher.status, 200, `post-restart teacher read: HTTP ${teacher.status}: ${teacher.body}`);
  await deleteRecord(record);
  console.log('live PostgreSQL record survived an actual revision restart');
  process.exit(0);
}

try {
  // Twelve independent create/read cycles make each replica prove it can read
  // another replica's write. The x-draft-ticket-replica set below must cover
  // every ready replica reported by the deployment, not merely two responses.
  for (let index = 0; index < 12; index += 1) {
    const demo = await browserJson('/demo', { method: 'POST' }, 201, `demo create ${index + 1}`);
    records.push(demo);
    const authorization = { Authorization: `Bearer ${demo.teacher_token}` };
    const teacher = await browserJson(
      `/teacher/${demo.session.code}`, { headers: authorization }, 200, `demo teacher read ${index + 1}`
    );
    assert.equal(teacher.tickets.length, 3, 'demo must contain three sample tickets');
    const student = await browserJson(
      `/sessions/${demo.session.code}`, {}, 200, `demo student read ${index + 1}`
    );
    assert.equal(student.is_demo, true);
    await delay(260);
  }

  real = await browserJson('/sessions', {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify({
      title: 'Release replica check',
      prompt: 'Where does this draft change direction?',
      retention_days: 1
    })
  }, 201, 'real session create');
  records.push(real);

  const teacherHeaders = { Authorization: `Bearer ${real.teacher_token}` };
  await browserJson(`/sessions/${real.session.code}`, {}, 200, 'real student read');
  await browserJson(`/teacher/${real.session.code}`, { headers: teacherHeaders }, 200, 'real teacher read');

  const ticket = {
    pseudonym: '=HYPERLINK("https://example.invalid")',
    claim: '@SUM(1,1)', evidence: '+2+2', revision: '-1+1', reflection: '=1+1'
  };
  await browserJson(`/sessions/${real.session.code}/tickets`, {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify(ticket)
  }, 201, 'cross-replica ticket submit');
  const teacher = await browserJson(
    `/teacher/${real.session.code}`, { headers: teacherHeaders }, 200, 'teacher reads submitted ticket'
  );
  assert.equal(teacher.tickets.length, 1);

  const exported = await browserApi(`/teacher/${real.session.code}/export`, { headers: teacherHeaders }, 'CSV export');
  assert.equal(exported.status, 200, 'CSV export succeeds');
  for (const safeValue of ["'=HYPERLINK", "'@SUM", "'+2+2", "'-1+1", "'=1+1"]) {
    assert.ok(exported.body.includes(safeValue), `CSV neutralizes ${safeValue.slice(1)}`);
  }
  assert.doesNotMatch(exported.body, /,"[=+@-]/, 'CSV contains no formula-leading data cells');

  // This check is intentionally after the complete browser workflow: a gate
  // may not report success if all fresh contexts happened to stay on one
  // replica. The deployer supplies the actual ready-replica count.
  assert.ok(
    observedReplicas.size >= expectedReplicas,
    `fresh browser flows reached ${observedReplicas.size} replica(s); expected every ready replica (${expectedReplicas})`
  );

  await deleteRecord(real);
  records.splice(records.indexOf(real), 1);
  real = undefined;

  await delay(1_100);
  while (Date.now() % 1_000 > 100) await delay(10);
  const burst = await Promise.all(Array.from({ length: 45 }, () => api('/sessions/ZZZZZZ')));
  assert.equal(burst.filter(response => response.status === 404).length, 40, 'one client receives exactly 40 requests');
  const limited = burst.filter(response => response.status === 429);
  assert.equal(limited.length, 5, 'requests 41–45 are limited across replicas');
  assert.ok(limited.every(response => response.headers.get('retry-after') === '1'), 'every 429 includes Retry-After: 1');

  if (persistenceRecordPath) {
    // Keep one disposable real session through the deployment's actual
    // revision restart. This is intentionally not a process restart or a
    // local filesystem check: it proves the active managed PostgreSQL schema
    // still contains the record after Container Apps replaces the process.
    await delay(1_100);
    const response = await browserApi('/sessions', {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify({
        title: 'Revision restart persistence check',
        prompt: 'Which revision keeps this draft ticket?',
        retention_days: 1
      })
    }, 'persistence record create');
    assert.equal(response.status, 201, `persistence record create: HTTP ${response.status}: ${response.body}`);
    persistenceRecord = JSON.parse(response.body);
    records.push(persistenceRecord);
    writeFileSync(persistenceRecordPath, JSON.stringify({
      ...persistenceRecord,
      replica_id: response.replica
    }));
  }
} finally {
  // The gate owns these temporary records and removes them even after an
  // assertion failure. Demo rows also have a one-day TTL as a fallback.
  await Promise.all(records.filter(record => record !== persistenceRecord).map(deleteRecord));
}

console.log(`live browser replica, export, delete, and rate-limit verification passed across ${observedReplicas.size} replica(s)`);
