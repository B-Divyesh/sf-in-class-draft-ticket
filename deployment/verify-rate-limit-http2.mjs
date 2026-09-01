import assert from 'node:assert/strict';
import { connect, constants } from 'node:http2';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function oneBurst(origin, requestCount, connectImpl, alignToWindow) {
  const client = connectImpl(origin);
  client.setTimeout(20_000, () => client.destroy(new Error('HTTP/2 rate-check connection timed out')));
  try {
    await once(client, 'connect');
    const protocol = client.alpnProtocol || 'h2c';
    if (alignToWindow) await delay(1_075 - (Date.now() % 1_000));
    const startedAt = Date.now();
    const responses = await Promise.all(Array.from({length:requestCount}, (_, index) => new Promise((resolve, reject) => {
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
    return {protocol, startedAt, elapsed:Date.now() - startedAt, responses};
  } finally {
    client.close();
  }
}

export async function verifyHttp2RateLimit({
  baseUrl = 'https://in-class-draft-ticket.sociobot.in',
  requestCount = 50,
  allowedCount = 40,
  attempts = 3,
  alignToWindow = true,
  connectImpl = connect
} = {}) {
  assert.ok(requestCount > allowedCount, 'requestCount must exceed the allowed request count');
  assert.ok(attempts > 0, 'attempts must be positive');
  const origin = new URL(baseUrl).origin;
  const evidence = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // Connect first, then start just inside a fresh wall-clock second. All
    // streams are opened before any response is awaited, avoiding handshake,
    // connection-pool, and window-boundary false negatives.
    const burst = await oneBurst(origin, requestCount, connectImpl, alignToWindow);
    const ordinary = burst.responses.filter(response => response.status === 404);
    const limited = burst.responses.filter(response => response.status === 429);
    const result = {
      attempt,
      protocol:burst.protocol,
      startedMod:burst.startedAt % 1_000,
      elapsed:burst.elapsed,
      counts:Object.fromEntries([...new Set(burst.responses.map(response => response.status))].sort().map(status => [status, burst.responses.filter(response => response.status === status).length])),
      retryAfter:[...new Set(limited.map(response => response.retryAfter))],
      replicas:[...new Set(burst.responses.map(response => response.replica).filter(Boolean))]
    };
    evidence.push(result);
    if (ordinary.length === allowedCount && limited.length === requestCount - allowedCount && limited.every(response => response.retryAfter === '1')) {
      if (origin.startsWith('https:')) assert.equal(burst.protocol, 'h2', `rate check negotiated ${burst.protocol} instead of h2`);
      return result;
    }
  }
  assert.fail(`HTTP/2 rate boundary was not exact after ${attempts} attempt(s): ${JSON.stringify(evidence)}`);
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
