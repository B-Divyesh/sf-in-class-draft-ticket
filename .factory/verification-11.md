# Independent product verification 11 — FAIL

- Candidate commit: `0e19da82793a2df63aec31a1749f3d8a48c2fe9f`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-11`
- Result: **FAIL — do not release**

## Required first read and demo gate

**First read: PASS.** A cold visit to `/` says “Record in-class drafting
without surveillance,” identifies writing teachers, and explains the action:
**Try it with sample data** / “See three completed tickets.” It plainly states
what it is, who it is for, and what to click first. Evidence:
`qa-evidence/verification-11-live-cold.png`.

**Demo gate: FAIL intermittently.** A fresh 390 px browser visit to `/demo`
sometimes loads the three fictional tickets, but another fresh visit showed
“This teacher link is not valid. Use the link saved when the session was
created.” and **Reload sample data**. The failing visit logged a 401 resource
error. Evidence: `qa-evidence/verification-11-live-demo-failure.png`.

## Release-blocking defects

### Critical — requested commit is deployed with isolated SQLite replicas

`GET /health?qa=verify11` returned HTTP 200 with the exact requested build SHA
but `storage_backend: "sqlite"`. Eighteen fresh health requests reached all
three distinct replica identities:

- `b9877c81b7e84171844e3f466a00287d`
- `2cd605f702324338a5fb4a1027c51910`
- `e780fa45e688406597365dbe8770af2b`

The candidate's documented production topology is one PostgreSQL-backed
replica. With one SQLite database per process, a demo or real session created
on one replica is unavailable when its subsequent authenticated read is routed
to another. This directly caused the intermittent demo failure and makes the
teacher/student/export/delete workflow nondeterministic. Health evidence is in
`qa-evidence/verification-11-live-health.json` and
`qa-evidence/verification-11-live-health-headers.txt`.

### Critical — documented API request allowance is not enforced live

The API contract is 40 requests per client per second, followed by HTTP 429
with `Retry-After: 1`. A same-client, simultaneous 45-request burst to
`GET /api/sessions/ABCDEF` returned **45 × 404**, **0 × 429**, and no
`Retry-After`. The requests were distributed over the three replica IDs above,
so each process kept an independent SQLite rate counter. The observed live
allowance is therefore **more than 45 requests/second**, not the required 40.

### Major — live demo produces a console error

The failed fresh mobile `/demo` visit produced
`Failed to load resource: the server responded with a status of 401 ()`.
This fails the no-console-errors quality gate and leaves the mandatory one-click
demo unusable in that session.

## Required claims from a clean checkout

`npm ci` completed with 0 audited vulnerabilities. Every exact command in
`.factory/claims.json` passed from the clean checkout, before other QA work:

| Claim | Command | Result |
| --- | --- | --- |
| sample-demo | `npm test -- --grep @claim:sample-demo` | PASS |
| csv-export | `npm test -- --grep @claim:csv-export` | PASS |
| pseudonymous-flow | `npm test -- --grep @claim:pseudonymous-flow` | PASS |
| session-retention | `npm test -- --grep @claim:session-retention` | PASS |
| free-capacity | `npm test -- --grep @claim:free-capacity` | PASS |
| privacy-minimal | `npm test -- --grep @claim:privacy-minimal` | PASS |
| teacher-control | `npm test -- --grep @claim:teacher-control` | PASS |
| production-topology | `npm run test:production-topology` | PASS |

These local claims cannot accept the live deployment: the production-topology
test validates committed deployment contracts rather than the currently
running Container App.

## Local quality gates

- `npm test`: **PASS**, 46/46 Playwright tests.
- `npx tsc --noEmit`, `cargo fmt --check`,
  `cargo clippy --all-targets -- -D warnings`, `cargo test`,
  `cargo build --release`, and `npm run build`: **PASS**.
- Production frontend output: JS 61,635 bytes raw / **22.47 kB gzip**; CSS
  14,613 bytes raw / **4.02 kB gzip**. Both meet the stated initial budgets.
- The exact Docker build was attempted but this disposable verifier image has
  no `docker` executable (`docker: command not found`). The native release and
  Vite production builds above passed.

## Live checks completed

- Candidate identity: **match** — `/health` reports the requested SHA.
- Privacy request log: **pass on a successful demo load**. Requests were only
  to this origin (document, self-hosted JS/CSS/fonts, `/api/demo`, and
  `/api/teacher/<code>`); no analytics, third-party traffic, webcam, or
  microphone use was observed.
- Response policy: root and health supplied `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, CSP with
  `frame-ancestors 'none'`, and `Cache-Control: no-store, max-age=0` on health.
- Accessibility: independent 390 px Axe scans of `/`, `/demo`, `/join`,
  `/start`, `/privacy`, and `/terms` found no serious or critical violations;
  no horizontal overflow was observed. `/demo` still fails the console-error
  baseline when routed across SQLite replicas. The local suite additionally
  passed keyboard skip-link/focus, 200% reflow, service-worker offline reload,
  and route metadata checks.
- Invalid API inputs return 400 for an invalid retention value and invalid
  class name. A malformed missing-field JSON request returns Axum's 422 parser
  text; this is noted but is not the release decision.

## Required repair and re-verification

Bind the live `DATABASE_URL` PostgreSQL secret and scale the deployment to the
committed one-replica topology. Re-run live health until it reports `postgres`,
then prove a session survives a revision restart and verify the 45-request
burst returns no more than 40 ordinary responses followed by 429 responses
with `Retry-After: 1`. Finally run repeated fresh `/demo` loads and the full
external Playwright suite without 401s or console errors.
