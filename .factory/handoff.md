# Handoff — release-blocking repair 5

## Status

The verifier's five release blockers are repaired locally. The final deployment identity and live checks are recorded below after rollout.

## Reproduction and root causes

- Reproduced the exact intermittent claim failure before changing code. Run 2 of the existing `concurrent replicas share...` contract failed in `waitForHealth` with `TypeError: fetch failed`.
- Captured the failed replica's stderr: SQLite error 1555, `UNIQUE constraint failed: _sqlx_migrations.version`. Simultaneous replicas both observed a pending migration and one process exited when the other recorded it first.
- Production inspection matched `.factory/verification-5.md`: revision 16 had three ready replicas, no volume, no mount, and scale 1–3. Its rate counter and sessions were therefore replica-local.
- The first mounted rollout exposed an SMB-only lock boundary that local filesystems did not: two replicas stalled in SQLite rollback-journal recovery while holding the same network file. The unhealthy revisions were deactivated without receiving traffic. This proved SQLite over the production SMB share was not a safe durable multi-replica design.
- CSV cells were quoted but retained formula-leading `=`, `+`, `-`, and `@` characters.
- Doubling root text at 390 px reproduced a 497 px document. Intrinsic grid tracks expanded to large heading and price words.

## Repairs

- Local zero-config use remains SQLite. Concurrent local migration-history conflicts retry transactionally, and a crash-safe OS byte-range gate serializes processes sharing a local database.
- Production now uses the factory's managed PostgreSQL service with a dedicated `in_class_draft_ticket` schema and least-privilege runtime credential from Key Vault. The deployment remains the original `web-with-backend` container class, runs two to three replicas, and has no replica-local state mount.
- PostgreSQL schema setup uses an idempotent SQL transaction under a transaction-scoped advisory lock. It neither needs nor mutates the service-wide SQLx migration table.
- All 72 sessions and 548 tickets from the former production SQLite file were copied in one transaction. Source SQLite data was retained; only a transient rollback journal from an unhealthy, traffic-free rollout was removed. PostgreSQL retained exactly 72 active sessions and 548 tickets after the runtime-role flow check.
- The product deploy path applies the PostgreSQL contract and refuses success until the live build identity, secret reference, scale, repeated demo/teacher/student/export/delete flow, and exact 40-request client allowance pass.
- Rate limiting uses the ingress-appended address, so callers cannot rotate an earlier `X-Forwarded-For` value.
- CSV export prefixes spreadsheet formula cells with an apostrophe before RFC-style quote escaping.
- Mobile single-column tracks use zero minimums, long labels wrap, and display sizes stay within the viewport at 200% text.
- README now describes the actual shared multi-replica topology.

## Regression coverage

- Eight rounds start three processes simultaneously against a new local database.
- A three-process test crosses replica boundaries for demo creation/read, real session creation/read, student submission, teacher read, CSV export, delete, 45 concurrent capacity submissions, and 45 fixed-client rate requests.
- Unit and cross-replica tests cover all formula prefixes: `=`, `+`, `-`, `@`, tab, and carriage return.
- The browser suite checks every public route at 390 px with root text at 200% and requires document width at most 390 px.
- `deployment/verify-live.mjs` repeats the production flow through the real ingress and requires exactly 40 × 404 plus 5 × 429 with `Retry-After: 1`.

## Local verification — 29 August 2026 UTC

- Exact cold command after `cargo clean` and `npm ci`: `npm test -- --grep @claim:csv-export` — PASS, including a 66-second first compile, 7/7 contracts, and 2/2 browsers.
- All eight `.factory/claims.json` commands run separately — PASS, 2/2 browsers each.
- `npm test` — PASS, 7 release contracts and 36 Playwright tests.
- `npx tsc --noEmit` — PASS.
- `cargo fmt --all -- --check` — PASS.
- `cargo clippy --all-targets --all-features -- -D warnings` — PASS.
- `cargo test --all` — PASS, 6/6.
- `cargo build --release` and `npm run build` — PASS; `dist/` produced.
- `npm audit --audit-level=high` — PASS, zero vulnerabilities.
- Release binary started with only `PORT`; `/health` returned `status: ok` and build identity.
- `/opt/fleet/lib/verify-url.sh` — PASS: title, `lang=en`, one h1, main, alt text, labels, and zero console errors.
- `npx @axe-core/cli` — PASS, zero violations. Playwright axe checks also passed desktop and 390 px on six public routes.
- Browser coverage passed keyboard/focus, touch targets, reduced motion, offline service-worker reload/update, same-origin privacy, deep links, 404, response headers, and CSV downloads.
- Desktop and 390 px screenshots plus verifier JSON are in `.factory/evidence/repair-5/`.
- Docker is unavailable in this worker. ACR performs the clean multi-stage container build during deployment.
- The production PostgreSQL runtime credential started the app and passed `deployment/verify-live.mjs`; the post-check data count remained 72 sessions and 548 tickets.

## Known gaps

None in the repaired source. Deployment completion and final live evidence are added after the committed ACR build.
