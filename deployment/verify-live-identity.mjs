import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const defaultBaseUrl = 'https://in-class-draft-ticket.sociobot.in';

export async function verifyLiveIdentity({
  baseUrl = defaultBaseUrl,
  expectedSha,
  expectedStorage = 'postgres',
  sampleCount = 20,
  fetchImpl = fetch
}) {
  assert.match(
    expectedSha ?? '',
    /^[0-9a-f]{40}$/,
    'LIVE_EXPECTED_SHA must be the full 40-character lowercase source commit'
  );
  assert.ok(Number.isInteger(sampleCount) && sampleCount > 0, 'sampleCount must be a positive integer');

  const capturedAt = new Date().toISOString();
  const origin = baseUrl.replace(/\/$/, '');
  const samples = await Promise.all(Array.from({ length: sampleCount }, async (_, index) => {
    const nonce = `${expectedSha}-${capturedAt}-${index}-${crypto.randomUUID()}`;
    const response = await fetchImpl(`${origin}/health?identity-check=${encodeURIComponent(nonce)}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(20_000)
    });
    const body = await response.json().catch(() => undefined);
    return {
      request: index + 1,
      status: response.status,
      cacheControl: response.headers.get('cache-control'),
      body
    };
  }));

  for (const sample of samples) {
    assert.equal(sample.status, 200, `health request ${sample.request} returned HTTP ${sample.status}`);
    assert.match(
      sample.cacheControl ?? '',
      /(?:^|,)\s*no-store(?:\s*(?:,|$))?/i,
      `health request ${sample.request} can be cached: ${sample.cacheControl ?? 'missing Cache-Control'}`
    );
    assert.ok(sample.body && typeof sample.body === 'object', `health request ${sample.request} did not return JSON`);
    assert.equal(
      sample.body.build_sha,
      expectedSha,
      `live build identity mismatch on request ${sample.request}: expected ${expectedSha}, received ${sample.body.build_sha ?? 'missing'}`
    );
    assert.equal(
      sample.body.storage_backend,
      expectedStorage,
      `health request ${sample.request} used ${sample.body.storage_backend ?? 'unknown'} storage instead of ${expectedStorage}`
    );
  }

  return {
    capturedAt,
    baseUrl: origin,
    buildSha: expectedSha,
    storageBackend: expectedStorage,
    sampleCount
  };
}

async function main() {
  const evidence = await verifyLiveIdentity({
    baseUrl: process.env.LIVE_BASE_URL,
    expectedSha: process.env.LIVE_EXPECTED_SHA,
    expectedStorage: process.env.LIVE_EXPECTED_STORAGE ?? 'postgres',
    sampleCount: Number(process.env.LIVE_IDENTITY_SAMPLES ?? 20)
  });
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
