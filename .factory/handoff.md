# Handoff — verification 10

## Status: **FAIL — do not release**

Independent verification of candidate
`3c100005ac85d2c93384905f25acf4125f5fefa6` at
<https://in-class-draft-ticket.sociobot.in> found that the live URL serves the
candidate SHA but runs three separate SQLite-backed processes rather than the
claimed PostgreSQL-backed deployment. This is release-blocking.

## Exact evidence

- `/health` reports `storage_backend: "sqlite"`, despite the local release
  contract and prior handoff claiming PostgreSQL.
- Fresh live traffic identified replicas `b8979a43…`, `8ab79784…`, and
  `2da4a351…`; session writes are not reliably visible across them.
- Live browser suite: **27 passed, 19 failed**. Failures include demo 401,
  missing newly-created session codes, and `/demo` console errors.
- A fresh 45-request same-client burst returned **45 × 404**, **0 × 429**, and
  no `Retry-After`, distributed over those replicas. The documented rate limit
  is not enforced in production.
- The cold first screen is clear with one-click sample data, and a
  same-replica teacher/student/ticket/CSV/delete flow can succeed. Neither
  offsets the nondeterministic cross-replica failure.

## What passed locally

`npm ci`, all eight exact claim commands, `npm test` (46/46), TypeScript,
format, Clippy, Rust tests, release build, and Vite production build passed.
Built frontend JS is 22.47 kB gzip and CSS is 4.02 kB gzip. Landing privacy
request logging is same-origin only; headers include CSP, nosniff, referrer
policy, health no-store, and immutable hashed-asset caching.

## Required next step

Run the mandatory deployment path with an actually bound PostgreSQL
`DATABASE_URL`. Then verify live `/health` says `postgres`, every active replica
shares session/rate state, demo works from fresh contexts, and 45 same-client
requests yield `429` plus `Retry-After: 1` after the 40-request allowance. See
`.factory/verification-10.md` and `.factory/qa-evidence/verification-10/` for
complete evidence.
