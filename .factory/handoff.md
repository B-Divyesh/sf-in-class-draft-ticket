# Handoff — release-blocking replica-state repair

## Status

Repaired, committed, pushed, and deployed. The live service at
<https://in-class-draft-ticket.sociobot.in> is revision
`sf-in-class-draft-ticket--0000022`, running source commit
`c18b1488a6ee91bfddaa9a56afd3f4a716c361c3` from image digest
`sha256:808b977abf22604ed1b909e2c9abaf389dc862f50046d0a46398e539002da5ca`.

## Reproduction and root cause

Before repair, the deployed candidate `4f094ce9f42be4cf191a125b85c29202d79d07f2`
reported that exact build SHA but its Container App template had only `PORT=8080`,
no `DATABASE_URL` secret reference, no configured secret, and `minReplicas: 1`.
The backend therefore took its intentional no-config SQLite fallback. When the
prior deployment scaled to several replicas, the create request and the next
teacher-token request could use different SQLite files, producing the verifier's
201 followed by 401 failure.

The source PostgreSQL implementation, migration transaction/advisory lock, and
CSV formula protections were already correct. The defect was the deploy path:
a generic ARM PATCH could return success while preserving the old Container App
template, so it never materialized the Key Vault reference in a new revision.

## Repair

- `deployment/deploy.sh` now uses `az containerapp secret set` with the
  Key Vault URL and managed identity, then `az containerapp update` with an
  explicit `DATABASE_URL=secretref:database-url`, 2–3 replica scale, and the
  new image. It verifies those live fields before accepting the deployment.
- `/health` now reports the non-sensitive storage backend and an opaque random
  process identifier. Every response also carries that identifier in
  `x-draft-ticket-replica`; it exposes no host, routing, or secret information.
- `deployment/verify-live.mjs` uses a fresh Chromium process for every create,
  teacher read, student read, ticket write, CSV export, and deletion. It records
  response replica identities and fails unless it reached every currently ready
  replica, so connection affinity cannot hide a replica-local session/token bug.
- The existing PostgreSQL schema remains idempotent and migration-safe; session,
  teacher token, ticket, expiry cleanup, and rate-counter state continue to use
  the same qualified PostgreSQL schema. CSV neutralization is unchanged.

## Regression coverage

- `npm run test:contracts` now has 8 passing contracts, including explicit
  coverage of the Key Vault secret/update deployment path, fresh-browser
  affinity rejection, distinct replica identities, and cross-replica demo,
  teacher-token, student, ticket, export, deletion, capacity, and rate state.
- The local strengthened gate passed with
  `LIVE_BASE_URL=http://127.0.0.1:18080 LIVE_EXPECTED_REPLICAS=1 node deployment/verify-live.mjs`.
- The production deploy gate passed across two distinct response identities,
  including 12 fresh-browser demo create/read cycles and the real-session CSV,
  deletion, and 40/5 rate-limit checks.

## Verification — 29 August 2026 UTC

- Clean dependency install: `npm ci` — PASS, zero high vulnerabilities.
- `npm test` — PASS: 8 release contracts and 36 Playwright tests.
- `npx playwright test --workers=1 --reporter=list` — PASS: 36/36 local,
  desktop and mobile Chromium.
- `npx tsc --noEmit`, `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --all-features -- -D warnings`,
  `cargo test --all-targets` (6/6), `cargo build --release`, and
  `npm audit --audit-level=high` — PASS.
- `npm run build` — PASS; `dist/` produced. Initial JS is 24.15 KiB gzip and
  CSS is 4.06 KiB gzip.
- Local `verify-url.sh` — PASS: title, `lang`, one `h1`, `main`, image alt,
  labeled controls, and no console errors.
- Production health returns `storage_backend: "postgres"`, the deployed SHA,
  and an opaque replica ID. The live Container App configuration has the
  Key Vault `database-url` secret, `DATABASE_URL` secret reference, no volume,
  and `minReplicas: 2`, `maxReplicas: 3`.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test --workers=1 --reporter=list`
  — PASS: 36/36. This includes desktop/mobile, keyboard/focus, privacy,
  service-worker offline reload/update, response headers, accessibility, and
  200% text reflow. Its Playwright Axe scans reported zero serious/critical
  violations on all six public routes at both widths.
- Live `verify-url.sh` — PASS: 622 ms load, no console errors, valid title,
  language, one h1, main landmark, and complete image/control labeling.
- `npx @axe-core/cli` — PASS against the live origin using the matching
  Chrome/ChromeDriver 152 pair installed for this worker; zero violations.

## Known gaps

None.
