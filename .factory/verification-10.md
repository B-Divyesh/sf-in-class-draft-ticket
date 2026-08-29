# Independent product verification 10 — FAIL

- Candidate: `3c100005ac85d2c93384905f25acf4125f5fefa6`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-10`
- Result: **FAIL — do not release**

## Decision

The live URL serves the requested SHA, but not the required durable PostgreSQL
deployment. Fresh `/health` responses report `storage_backend: "sqlite"`, and
traffic reaches three distinct process identities. Session data and the rate
counter are consequently process-local. Live verification reproduced invalid
demo teacher links, missing student sessions, console errors, and no enforced
request allowance.

## Required first-read and demo gate

- **First-read: PASS.** Cold landing copy says “Record in-class drafting without
  surveillance,” names writing teachers, and visibly offers **Try it with sample
  data** / “See three completed tickets.”
- **Demo gate: FAIL.** Fresh contexts were inconsistent: some showed the three
  fictional tickets, while others rendered “This teacher link is not valid” and
  “Reload sample data” after creating the demo. The failed network read is 401.

## Release-blocking defects

### Critical — isolated SQLite replicas rather than shared PostgreSQL

- `GET /health` returned HTTP 200 and exact candidate SHA but
  `storage_backend: "sqlite"`.
- A fresh request burst observed three replica headers:
  `b8979a43ae0e4ed9a1679e877212a23c`, `8ab7978426e149568e8af696a05ba7a6`,
  and `2da4a351e63d4b80bd6303f03a1cb76c`.
- The full live Playwright suite failed 19/46. Its demo trace shows the invalid
  private-link panel. Its student flow shows “That session code was not found”
  immediately after session creation. A one-replica teacher/student/CSV/delete
  flow can succeed, but it is nondeterministic and not sufficient.

### Critical — rate limit is not enforced in the deployed topology

- The required allowance is 40 requests/second and then 429 with
  `Retry-After: 1`. A fresh same-client 45-request burst returned **45 × 404**,
  **0 × 429**, no `Retry-After`, and used all three replicas.
- The live suite independently failed both rate-limit tests; one saw 45
  ordinary responses when no more than 40 should be allowed.

### Major — live demo has console errors

- The mobile `/demo` accessibility run captured `Failed to load resource: the
  server responded with a status of 401 ()`, then showed the invalid teacher
  link recovery state. It violates the no-console-errors baseline.

## Local verification

- `npm ci`: pass; 0 audited vulnerabilities.
- Every command in `.factory/claims.json`: **pass** — all seven tagged browser
  claims plus `npm run test:production-topology`.
- `npm test`: **pass, 46/46** including ten release-contract checks.
- `npx tsc --noEmit`, Rust format, Clippy, `cargo test` (6/6),
  `cargo build --release`, and `npm run build`: pass.
- Frontend output: JS 61,635 bytes raw / 22.47 kB gzip; CSS 14,613 bytes raw /
  4.02 kB gzip.

## Other live checks

- Live suite result: 27 passed, 19 failed. PWA offline/service-worker,
  deep-link, metadata, most public route, and other browser checks passed.
- Cold landing network log was same-origin document, JS, CSS, self-hosted fonts,
  and the local illustration only: no tracking, analytics, or media capture.
- Live axe route scans reported no serious/critical violation. Keyboard starts
  at the visibly focused skip link. `/demo` still fails the console check.
- Root has CSP with `frame-ancestors 'none'`, nosniff, and strict-origin
  referrer policy. `/health` is no-store; hashed JS and local fonts are
  immutable cached.
- Invalid session input gets an actionable 400, malformed ticket JSON gets 422,
  and missing teacher authorization gets 401. The core failure is shared live
  state, not these input boundaries.

Evidence: `.factory/qa-evidence/verification-10/` contains headers, cold-page
read, demo/flow records, live Playwright result, and rate-limit evidence.

## Required repair

Deploy with the PostgreSQL `DATABASE_URL` secret actually bound. Confirm live
`/health` reports `postgres`, all active replicas share demo/session/rate state,
and a restart preserves a session. Re-run the 45-request burst and prove 40
allowed responses followed by 429 responses with `Retry-After: 1`.
