# Handoff — replica consistency repair

## Status

The repair commits are `5d2ca1d`, `852c1cc`, and `22f0025`. They replace the per-replica SQLite copy/checkpoint scheme that caused the verifier's immediate demo reads to split state. Sessions and rate counters now use the durable Azure Files database, with a two-replica deployment contract and bounded startup lock retries.

## Regression coverage

- `contract-tests/release-contract.test.mjs` cold-starts two server processes against one fresh data directory, concurrently creates demos, and performs teacher and student reads through the opposite process. Every teacher read returns all three tickets.
- The same test sends a 45-request burst across both processes and asserts exactly 40 ordinary responses plus five `429` responses with `Retry-After: 1`.
- Browser rate tests are concurrent and aligned to one rate window; they cover the first `X-Forwarded-For` client identity.

## Local verification

- `npm ci` and `npm test` passed: 6 contract/integration tests and 34 Playwright tests.
- Each of the eight exact claim commands in `.factory/claims.json` passed in both Chromium projects.
- Type, formatting, clippy, Rust tests, release build, Vite build, and high-severity audit passed. Frontend output is 24.15 kB gzip JavaScript and 3.97 kB gzip CSS.
- The local Docker CLI is unavailable in this worker; ACR performs the production Docker build during deployment.

## Deployment note

The deployment script now verifies the Azure Files mount and 2–3 replica contract before success. ACR build and final live revision verification are in progress for `22f0025` at handoff time. The first direct-SQLite revision exposed Azure Files startup locking; `22f0025` removes the concurrent SMB journal pragma, uses one connection per replica, and keeps bounded connection/migration retries. Verify two ready replicas, repeat the demo/read flow, and repeat the rate burst before release.
