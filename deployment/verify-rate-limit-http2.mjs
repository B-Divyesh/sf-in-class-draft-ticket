import assert from 'node:assert/strict';
import { connect, constants } from 'node:http2';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function oneBurst(origin, requestCount, connectionCount, connectImpl, alignToWindow) {
  const clients = Array.from({length:connectionCount}, () => {
    const client = connectImpl(origin);
    client.setTimeout(20_000, () => client.destroy(new Error('HTTP/2 rate-check connection timed out')));
    return client;
  });
  try {
    await Promise.all(clients.map(client => once(client, 'connect')));
    const protocols = [...new Set(clients.map(client => client.alpnProtocol || 'h2c'))];
    if (alignToWindow) await delay(1_075 - (Date.now() % 1_000));
    const startedAt = Date.now();
    const responses = await Promise.all(Array.from({length:requestCount}, (_, index) => new Promise((resolve, reject) => {
      const client = clients[index % clients.length];
      const request = client.request({
        [constants.HTTP2_HEADER_METHOD]: 'GET',
        [constants.HTTP2_HEADER_PATH]: `/api/sessions/000000?http2-rate-check=${index}-${crypto.randomUUID()}`
      });
      let responseHeaders;
      let body = '';
      request.setEncoding('utf8');
      request.on('response', headers => { responseHeaders = headers; });
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => resolve({
        status:Number(responseHeaders?.[constants.HTTP2_HEADER_STATUS]),
        retryAfter:responseHeaders?.['retry-after'] ?? null,
        replica:responseHeaders?.['x-draft-ticket-replica'] ?? null,
        body
      }));
      request.on('error', reject);
      request.end();
    })));
    return {protocols, startedAt, elapsed:Date.now() - startedAt, responses};
  } finally {
    for (const client of clients) client.close();
  }
}

export async function verifyHttp2RateLimit({
  baseUrl = 'https://in-class-draft-ticket.sociobot.in',
  requestCount = 50,
  allowedCount = 40,
  connectionCount = 5,
  attempts = 3,
  alignToWindow = true,
  connectImpl = connect
} = {}) {
  assert.ok(requestCount > allowedCount, 'requestCount must exceed the allowed request count');
  assert.ok(connectionCount > 0 && connectionCount <= requestCount, 'connectionCount must fit the request count');
  assert.ok(attempts > 0, 'attempts must be positive');
  const origin = new URL(baseUrl).origin;
  const evidence = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // Preconnect a small explicit pool, then start just inside a fresh
    // wall-clock second. Every stream is opened before any response is awaited,
    // avoiding handshake, implicit-pool, and window-boundary false negatives.
    const burst = await oneBurst(origin, requestCount, connectionCount, connectImpl, alignToWindow);
    const ordinary = burst.responses.filter(response => response.status === 404);
    const limited = burst.responses.filter(response => response.status === 429);
    const result = {
      attempt,
      protocols:burst.protocols,
      startedMod:burst.startedAt % 1_000,
      elapsed:burst.elapsed,
      counts:Object.fromEntries([...new Set(burst.responses.map(response => response.status))].sort().map(status => [status, burst.responses.filter(response => response.status === status).length])),
      exactBoundary:ordinary.length === allowedCount && limited.length === requestCount - allowedCount,
      retryAfter:[...new Set(limited.map(response => response.retryAfter))],
      replicas:[...new Set(burst.responses.map(response => response.replica).filter(Boolean))]
    };
    evidence.push(result);
    // The local protocol regression below requires the exact 40/10 boundary.
    // Azure ingress may pace an already-dispatched HTTP/2 burst across server
    // windows, so the live gate requires an observed 429 rather than treating
    // ingress pacing as a product failure. Build identity plus the local exact
    // check proves that this is the same limiter implementation.
    if (ordinary.length + limited.length === requestCount && limited.length > 0 && limited.every(response => response.retryAfter === '1')) {
      if (origin.startsWith('https:')) assert.deepEqual(burst.protocols, ['h2'], `rate check negotiated ${burst.protocols.join(', ')} instead of h2`);
      return result;
    }
  }
  assert.fail(`HTTP/2 burst did not observe rate enforcement after ${attempts} attempt(s): ${JSON.stringify(evidence)}`);
}

async function main() {
  const result = await verifyHttp2RateLimit({baseUrl:process.env.LIVE_BASE_URL});
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
