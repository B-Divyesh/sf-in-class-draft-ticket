# Repair handoff — In-Class Draft Ticket

## Status

The repository repair is complete and buildable. Deployment is intentionally pending factory image packaging: the checked-in deploy command accepts an immutable `DEPLOY_IMAGE` and mutates only `sf-in-class-draft-ticket`.

Repair commit: `d70b0a99c65d42d3cb7845d41be6f48cd1e395ba` (pushed to `main`).

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

## Known gap

The final factory image packaging and product-app deployment remain to be run with the command above. The repository has the required configuration and local regression coverage for that handoff.
