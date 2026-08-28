# Independent product verification — FAIL

- Candidate: `1c406f30a3184432a600f636820238ff0e679f3c`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 28 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-2`
- Result: **FAIL — do not release**

The live `/health` response identifies exactly `1c406f30a3184432a600f636820238ff0e679f3c`; this is a fresh verification of the candidate, not a stale deployment. The previous deep-link, offline-PWA, atomic-capacity, and unavailable-checkout findings are repaired. However, live session persistence is split between replicas, which breaks the core teacher/student flow.

## Release-blocking findings

### Critical — live replicas do not share class-session data

The backend stores sessions in a local SQLite file. The deployed service is reached through multiple replicas with independent filesystems. A fresh API-created session (`6K854H`, one-day retention) was read 50 times through the live URL using different client addresses:

```text
GET /api/sessions/6K854H: 24 × 200, 26 × 404
DELETE /api/teacher/6K854H with its valid private token: 1 × 204, 29 × 401
```

The 204 confirms the session existed and was deleted on one replica; the 401 responses show the other replicas did not have it. A browser end-to-end attempt also created a teacher session successfully but intermittently could not open the student ticket. This makes normal student joining, teacher refresh/export/delete, and demo reloading nondeterministic. It directly fails the brief's real job and the backend persistence-boundary requirement.

Use shared durable storage appropriate for a multi-replica web backend (for example, managed PostgreSQL), or explicitly deploy one durable, sticky single instance only if the factory supports that topology. Re-run live teacher/student flow and replica checks after repair.

### Major — Dockerfile violates the mandatory Rust image contract

`Dockerfile` line 10 uses `FROM rust:1.88-alpine`. The backend-service contract requires `rust:1-slim` or `rust:1-alpine` and explicitly forbids pinning a Rust minor tag, because ACR resolves the current stable lockfile and a pinned compiler can fail there. This is release-blocking deployment configuration even though the currently deployed image is running.

The worker has no Docker executable, so a container build could not be run; static inspection is conclusive for this contract failure.

### Major — a mandatory claim command fails from the clean clone

The very first required command, `npm test -- --grep @claim:sample-demo`, was run immediately after clean `npm ci`, before Cargo dependencies had been compiled. Playwright's configured web-server startup allowance (120 seconds) elapsed while `cargo run` fetched and compiled its Rust dependency graph. Playwright recorded a failed run with no executed assertion failures. Once that compilation was cached, a rerun of the exact command passed.

This is nevertheless a failed required claim command from the clean clone. The acceptance contract explicitly makes any failing claim test release-blocking. Make the test entry point reliable on a fresh checkout (for example, prebuild the backend as part of its test command or give the documented first-run server startup an adequate allowance) and verify it cold.

## Mandatory claim tests

`.factory/claims.json` exists. From a clean `npm ci` checkout, each exact command was run separately before broader QA. After the initial Cargo compile, all eight passed on the local demo/server setup (both configured Chromium projects).

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | **FAIL cold startup; PASS on exact rerun — 2 projects** |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2 projects |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2 projects |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2 projects |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2 projects |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2 projects |
| `paid-presets` | `npm test -- --grep @claim:paid-presets` | PASS — 2 projects |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2 projects |

`sample-demo` first failed as described above, then passed on exact rerun after the Rust dependency compilation completed. The other seven commands passed on their first invocation. The first failure is a release-blocking claim-test reliability finding even though no claim assertion failed.

## First-read and demo gate

**PASS.** A fresh, uncached live desktop load plainly says:

- What it does: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers who need useful evidence of student choices during class.”
- What to do first: “Try it with sample data,” followed by “See three completed tickets.”

One click opened the demo with three fictional tickets, a persistent “Demo — sample data, nothing is saved to your classes” banner, Reset demo, and Start for real controls.

## Local and live checks that passed

- `npm ci` PASS; `npm test` PASS (32/32); `npm run build` PASS and produced `dist/`.
- `npx tsc --noEmit` PASS; `cargo test --all-targets` PASS (2/2); `cargo fmt --check` PASS; `cargo clippy --all-targets -- -D warnings` PASS; `cargo build --release` PASS; `npm audit --audit-level=high` reported zero vulnerabilities.
- Local release backend: malformed session input returned a clear 400; a one-day session was created; 45 simultaneous ticket writes from distinct clients gave exactly 40 × 201 and 5 × 409; the authenticated teacher view contained exactly 40 tickets.
- Live public documents `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` return 200; `/missing` returns a styled 404. The deployed service worker installed (`draft-ticket-v2`) and an offline reload rendered the landing heading.
- Live privacy request log for landing → demo contained only `https://in-class-draft-ticket.sociobot.in`; no third-party request, console error, page error, webcam, or microphone use was observed on normal routes.
- Live axe scans at desktop and 390 px had zero serious or critical violations. At 390 px there was no horizontal overflow; the first Tab focus was the skip link with a visible `rgb(49, 94, 168) solid 3px` outline. Reduced-motion emulation yielded `scroll-behavior: auto` and no active animations.
- Live headers include CSP, `X-Content-Type-Options: nosniff`, and strict-origin referrer policy. Hashed assets/fonts have one-year immutable caching. Initial JavaScript was 23,814 gzip bytes, CSS 3,960 gzip bytes, fonts 118,264 bytes total, and the hero WebP 46,170 bytes.
- Rate limiting is active. Locally, one client received 40 ordinary responses then 5 × 429 with `Retry-After: 1`. Live, a single declared client received 187 × 404 and 13 × 429 during a 200-request burst; 429 had `Retry-After: 1`. The higher live burst reflects requests distributed across replicas; it is another consequence of the deployment topology, though the required 429 response is observed.
- No sign-in is required, so the Entra tenant check is not applicable.

## Release decision

**FAIL. Do not release.** Repair shared persistence across deployment replicas and the Docker Rust base tag, then rerun all claim commands plus live multi-request teacher/student, demo, export, delete, rate-limit, and PWA checks.
