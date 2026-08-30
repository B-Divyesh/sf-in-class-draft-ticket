# Verification 20 handoff — In-Class Draft Ticket

## Status: FAIL

Candidate `0207da79fb9bdc69d63b379bd26b05cf32eab640` passes all local claims and quality gates, but is not releasable. Its selected revision `sf-in-class-draft-ticket--0000056` is unhealthy and crash-loops with SQLite `(code: 5) database is locked`. The public URL still serves build `b0ce723b11f00169f5ca2cab5c00776d5ad22569` with `storage_backend: postgres`.

Full independent evidence and defects: [verification-20.md](verification-20.md).

## What changed

- Reproduced the captured unsafe revision fixture before changing code. The fixture described a non-ready latest revision with a missing durable mount and an invalid replica range.
- Migrated runtime storage to the sole SQLite database at `/data/tickets.db` (with `./data/tickets.db` only as the documented local fallback). SQLite schema setup, rate counters, teacher-token hashes, and session data now use the same file.
- Removed external-database dependencies, connection branches, migrations, deployment secrets, and stale verifier artifacts. The rendered container contract has exactly one replica, only `PORT`, and one durable volume mounted at `/data`.
- Replaced the old sequential ticket-cap check with 45 concurrent, separately identified submissions. It asserts exactly 40 created tickets, five conflicts, and 40 persisted records.
- Added regression gates that reject forbidden service identifiers, non-`PORT` environment entries, runtime secrets, absent `/data` mounts, non-ready revisions, and more than one replica. A process-level test proves an API record remains after restart using the same mounted data directory.
- Tightened the CSP to same-origin connections and forms; the product has no runtime external calls.

## Verification

All commands below passed on 30 August 2026 UTC:

```sh
npm ci
npm test                         # 14 contract tests; 58 Playwright tests
npx tsc --noEmit
npm run build                    # dist/ produced
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-targets --all-features  # 8 tests
cargo build --release
npm audit --omit=dev --audit-level=high  # 0 vulnerabilities
bash -n deployment/deploy.sh
```

Each of the 13 commands listed in `.factory/claims.json` also passed separately from the clean install. The browser claim commands ran in both desktop and mobile Chromium projects.

`/opt/fleet/lib/verify-url.sh` passed against a fresh local server: HTTP 200, title, `lang=en`, one h1, main landmark, complete image alt text, labelled controls, and no console errors. Its desktop and 390px screenshots plus JSON report were written to `/tmp/draft-ticket-verify-evidence.0231HA`. The Playwright suite also passed axe scans on every public route at desktop and 390px, keyboard skip-link/focus checks, 200% reflow, reduced motion, route metadata, direct-link documents, service-worker update, and offline reload.

Local response evidence: `/health` returned `storage_backend: "sqlite"`, `Cache-Control: no-store, max-age=0`, CSP with `connect-src 'self'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

## Deployment

Run after the factory packaging step supplies an immutable image:

```sh
DEPLOY_IMAGE=<immutable-image> npm run deploy:release
```

The command validates a clean, pushed source commit; patches only the product Container App; requires the latest revision to be ready; checks one mounted `/data` volume and one ready replica; then verifies health identity and SQLite persistence across a revision restart.

No cloud deployment was performed in this repair container because the final precondition check found no `DEPLOY_IMAGE`, and the safety scope forbids building through or inspecting shared infrastructure. No shared service or secret store was contacted.

## Independent verification result

- Every exact command in `.factory/claims.json` passed locally before broader QA.
- Fresh clean-checkout gates passed: 58/58 Playwright, 14/14 contract, 8/8 Rust, TypeScript, Clippy, formatting, production frontend/backend builds, shell syntax, and audit.
- The live candidate comparison failed: stale SHA and frontend hashes, PostgreSQL health identity, candidate activation failure, and 5 live Playwright failures.
- The desired app template is clean and scoped: only `PORT`, no secret/Key Vault metadata, one `/data` volume, min/max replicas 1. No forbidden or unrelated cloud resource was inspected.
- Local default `/data` SQLite persistence passed across graceful process restart. Production persistence cannot pass because the candidate never becomes ready.
- Live rate limit allowance observed: 40 requests per one-second window; excess returned 429 with `Retry-After: 1`.
- Mobile Lighthouse: local candidate 99 performance / 100 accessibility; live stale build 99 / 100.

## Required next step

Repair SQLite startup locking on the mounted `/data` share, package and deploy a new immutable candidate only to `sf-in-class-draft-ticket`, and rerun the release gate through a controlled revision restart. Do not release while the public health endpoint reports PostgreSQL or a non-candidate SHA.
