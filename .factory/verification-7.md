# Independent verification 7 — FAIL

**Candidate:** `8b150695ace6e3165a6af8081e5b5a63e29a2098`  
**Live URL:** <https://in-class-draft-ticket.sociobot.in>  
**Verified:** 29 August 2026 UTC

## Verdict

**FAIL — release blocking.** The deployed build identifies itself as the candidate, but its multi-replica backend runs the SQLite fallback rather than the committed production PostgreSQL configuration. A session created on one replica is not reliably readable on another, and the required per-client rate limit is multiplied by replicas.

## First-read and demo gate

Cold desktop visit passed the first-read gate. The first screen says it records in-class drafting without surveillance, names writing teachers as its audience, and presents **Try it with sample data** with the immediate result (“See three completed tickets”). One click opens the persistent Demo banner and three fictional tickets.

## Release-blocking defects

### Critical — live state is replica-local

- `GET /health` returned HTTP 200 with the exact candidate `build_sha`, but also `storage_backend: "sqlite"`.
- The candidate’s deployment contract and README require a Key Vault supplied `DATABASE_URL`, managed PostgreSQL, and 2–3 replicas. SQLite is only the no-configuration local fallback.
- Repeated live responses exposed different opaque replica IDs, including `1da7e9b768794033947fa722c5a30c35`, `3f5ce8867bbe4552bf86541d774a5f03`, and `820247dea869478e942177b573ca0080`.
- The repository’s own fresh-browser live gate failed with `LIVE_EXPECTED_REPLICAS=1 node deployment/verify-live.mjs`: **“demo teacher read 5: HTTP 401: This teacher link is not valid.”** The demo was created with its private token in one Chromium process and read in a fresh one.
- Its normal two-replica invocation also failed: `LIVE_EXPECTED_REPLICAS=2 node deployment/verify-live.mjs` observed only one replica across its run and failed its required coverage assertion. Combined with the explicit later 401 and the response headers above, this is not a successful shared-state deployment.

Impact: teachers and students can be routed to different data stores. Private teacher links can fail, tickets can be invisible, and deletion/export are not reliable. This violates the core job-to-be-done and backend persistence contract.

### Critical — per-client API limit is not enforced across replicas

The documented allowance is 40 requests per client per second, followed by `429` with `Retry-After: 1`.

- A synchronized burst of **45** `GET /api/sessions/ZZZZZZ` requests from one client (`X-Forwarded-For: 203.0.113.222`) returned **45 × 404**, no 429.
- A 130-request burst from one client returned **80 × 404 and 50 × 429**; every 429 did contain `Retry-After: 1`.

The observed allowance is therefore 40 **per SQLite replica** (at least 80 requests across the live deployment), not 40 per client as required. This is a release-blocking backend-service failure.

## Local quality gates

After `npm ci`, all declared claim commands passed against the product demo entry point:

| Claim IDs | Result |
| --- | --- |
| sample-demo, csv-export, pseudonymous-flow, session-retention | PASS |
| free-capacity, privacy-minimal, paid-presets, teacher-control | PASS |

The initial direct claim invocation before dependency installation could not find `vite`; the declared `npm ci` installs it, and the exact same eight commands then passed.

- `cargo test`: PASS, 6 tests.
- `npm test`: PASS, 36 Playwright tests plus 8 deployment-contract tests.
- `npm run build`: PASS; `dist/` produced. Initial JS 24.15 KiB gzip; CSS 4.06 KiB gzip.
- `npx tsc --noEmit`, `cargo fmt --check`, and `cargo build --release`: PASS.
- No lint script is defined in `package.json`.
- Docker image build was not executable in this worker because `docker` is not installed (`docker: command not found`).

## Live client, privacy, and accessibility checks

These passed and do not offset the backend failure.

- Candidate identity: `/health` reports the exact tested SHA.
- Playwright request log for landing → one-click demo contained only `https://in-class-draft-ticket.sociobot.in`; no analytics, capture, or third-party requests. No console or page errors occurred.
- Axe scan found zero serious/critical findings on `/`, `/demo`, `/join`, `/start`, `/privacy`, `/terms`, and `/missing` at 1440px and 390px. Each route had one `main h1` and no horizontal overflow.
- Keyboard starts at the skip link; focused outline was a visible cobalt 3px solid ring. Reduced motion reported `scroll-behavior: auto`.
- Service worker installed and an offline reload after the first visit showed the landing h1 successfully.
- Headers include CSP with `frame-ancestors 'none'`, `nosniff`, and strict referrer policy. Hashed JS and self-hosted font assets have `Cache-Control: public, max-age=31536000, immutable`.

## Required remediation and re-verification

Deploy the candidate with the documented Key Vault-backed `DATABASE_URL` and the configured PostgreSQL schema, then prove `/health` returns `storage_backend: "postgres"`. Re-run the fresh-browser live gate until teacher read, ticket submission, export, delete, and rate state succeed across every ready replica. A 45-request single-client burst must produce five 429s, each with `Retry-After: 1`.
