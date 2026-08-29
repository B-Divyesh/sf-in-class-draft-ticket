import assert from 'node:assert/strict';

const baseUrl = (process.env.LIVE_BASE_URL ?? 'https://in-class-draft-ticket.sociobot.in').replace(/\/$/, '');
const jsonHeaders = { 'content-type': 'application/json' };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function responseJson(response, expected, label) {
  const body = await response.text();
  assert.equal(response.status, expected, `${label}: HTTP ${response.status}: ${body}`);
  return body ? JSON.parse(body) : undefined;
}

async function api(path, options = {}) {
  return fetch(`${baseUrl}/api${path}`, { signal: AbortSignal.timeout(20_000), ...options });
}

const demos = [];
let real;
try {
  // Repetition makes the ingress cross the active replica set. Every read must
  // see the write that preceded it, regardless of which replica receives it.
  for (let index = 0; index < 12; index += 1) {
    const demo = await responseJson(await api('/demo', { method: 'POST' }), 201, `demo create ${index + 1}`);
    demos.push(demo);
    const authorization = { Authorization: `Bearer ${demo.teacher_token}` };
    for (let read = 0; read < 2; read += 1) {
      const teacher = await responseJson(
        await api(`/teacher/${demo.session.code}`, { headers: authorization }),
        200,
        `demo teacher read ${index + 1}.${read + 1}`
      );
      assert.equal(teacher.tickets.length, 3, 'demo must contain three sample tickets');
      const student = await responseJson(
        await api(`/sessions/${demo.session.code}`),
        200,
        `demo student read ${index + 1}.${read + 1}`
      );
      assert.equal(student.is_demo, true);
    }
    assert.equal((await api(`/teacher/${demo.session.code}`, {
      method: 'DELETE', headers: authorization
    })).status, 204, `demo delete ${index + 1}`);
    assert.equal((await api(`/sessions/${demo.session.code}`)).status, 404, `deleted demo ${index + 1} stays absent`);
    demos.pop();
    // Stay below the separate 40 requests/second client boundary while
    // checking enough load-balanced requests to cover all replicas.
    await delay(260);
  }

  await delay(1_100);
  real = await responseJson(await api('/sessions', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      title: 'Release replica check',
      prompt: 'Where does this draft change direction?',
      retention_days: 1
    })
  }), 201, 'real session create');

  for (let read = 0; read < 9; read += 1) {
    await responseJson(await api(`/sessions/${real.session.code}`), 200, `real student read ${read + 1}`);
    await responseJson(await api(`/teacher/${real.session.code}`, {
      headers: { Authorization: `Bearer ${real.teacher_token}` }
    }), 200, `real teacher read ${read + 1}`);
  }

  const ticket = {
    pseudonym: '=HYPERLINK("https://example.invalid")',
    claim: '@SUM(1,1)',
    evidence: '+2+2',
    revision: '-1+1',
    reflection: '=1+1'
  };
  await responseJson(await api(`/sessions/${real.session.code}/tickets`, {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify(ticket)
  }), 201, 'cross-replica ticket submit');
  const teacherHeaders = { Authorization: `Bearer ${real.teacher_token}` };
  const teacher = await responseJson(await api(`/teacher/${real.session.code}`, {
    headers: teacherHeaders
  }), 200, 'teacher reads submitted ticket');
  assert.equal(teacher.tickets.length, 1);

  const exportResponse = await api(`/teacher/${real.session.code}/export`, { headers: teacherHeaders });
  assert.equal(exportResponse.status, 200, 'CSV export succeeds');
  const csv = await exportResponse.text();
  for (const safeValue of ["'=HYPERLINK", "'@SUM", "'+2+2", "'-1+1", "'=1+1"]) {
    assert.ok(csv.includes(safeValue), `CSV neutralizes ${safeValue.slice(1)}`);
  }
  assert.doesNotMatch(csv, /,"[=+@-]/, 'CSV contains no formula-leading data cells');

  assert.equal((await api(`/teacher/${real.session.code}`, {
    method: 'DELETE', headers: teacherHeaders
  })).status, 204, 'session delete succeeds');
  for (let read = 0; read < 6; read += 1) {
    assert.equal((await api(`/sessions/${real.session.code}`)).status, 404, 'deleted session stays absent');
  }
  real = undefined;

  await delay(1_100);
  while (Date.now() % 1_000 > 100) await delay(10);
  const burst = await Promise.all(Array.from({ length: 45 }, () => api('/sessions/ZZZZZZ')));
  assert.equal(burst.filter(response => response.status === 404).length, 40, 'one client receives exactly 40 requests');
  const limited = burst.filter(response => response.status === 429);
  assert.equal(limited.length, 5, 'requests 41–45 are limited across replicas');
  assert.ok(limited.every(response => response.headers.get('retry-after') === '1'), 'every 429 includes Retry-After: 1');
} finally {
  // Live verification owns these ephemeral records and removes them even when
  // a later assertion fails. Demo rows also have a one-day TTL as fallback.
  const records = [...demos, ...(real ? [real] : [])];
  for (const record of records) {
    try {
      await api(`/teacher/${record.session.code}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${record.teacher_token}` }
      });
    } catch {}
  }
}

console.log('live replica, export, delete, and rate-limit verification passed');
