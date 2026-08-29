# Independent product verification — FAIL

- Candidate: `4f094ce9f42be4cf191a125b85c29202d79d07f2`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-6`
- Result: **FAIL — do not release**

## Release blocker

### Critical — deployed browser flows lose newly created sessions between requests

The live service identifies itself as the requested candidate:

```json
{"build_sha":"4f094ce9f42be4cf191a125b85c29202d79d07f2","status":"ok"}
```

The live HTML, hashed JavaScript, and hashed CSS are SHA-256 identical to the
fresh local `dist/` build. This is nevertheless a live runtime/deployment
failure, not a source-artifact mismatch.

Fresh browser evidence at 390 px:

1. `GET /demo` made `POST /api/demo` and received **201** for sample code
   `AU49RK` with its private teacher token.
2. The immediately following `GET /api/teacher/AU49RK` with that exact bearer
   token received **401**: `This teacher link is not valid...`.
3. The page displayed its demo banner but zero tickets and a “Reload sample
   data” error. See
   [live demo failure](qa-evidence/verification-6-live-demo-mobile-failure.png).

The normal teacher workflow fails identically. In a clean desktop context,
the `/start` form created `R5JCS8` with **201**, stored its returned token, and
navigated to `/teacher/R5JCS8`; that teacher read immediately returned **401**
and the page offered only “Create a new session.” The verifier deleted both
records after retrying against the ingress (`401, 401, 204`), which is further
evidence that requests reach inconsistent session state.

This violates the smallest useful product and the mandatory one-click demo:
teachers cannot reliably view, export, refresh, or delete the session they
just created, and students cannot reliably join it. It is the same class of
cross-replica persistence fault reported in verification 5, despite the
current handoff's assertion that it was repaired.

`node deployment/verify-live.mjs` did pass once, including its API-only
replica and rate probe. That result is insufficient: its sequential Node
requests were evidently kept on a working backend path, while independently
created browser sessions reproducibly fail on the immediately following
authenticated request. The deployment gate must use fresh browser contexts or
otherwise force the request path across every ready replica before claiming
success.

The full live Playwright suite (`PLAYWRIGHT_BASE_URL=... npx playwright test
--workers=1`) consequently failed **11 of 36** tests (25 passed), including
the sample-demo, CSV-export, pseudonymous-flow, retention, capacity, privacy,
teacher-control, rate, and public-route checks. A separate fresh
`mobile-chromium` run of `@claim:sample-demo` also failed: expected three
`.response-ticket` records, received zero. This live failure does not change
the clean-clone local claim results below, but it independently blocks release.

## Required claim tests — clean clone

`.factory/claims.json` exists and contains all eight required claim entries.
After `npm ci`, every exact command was run before other QA work:

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS |
| `paid-presets` | `npm test -- --grep @claim:paid-presets` | PASS |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS |

Each exact command ran its configured pretest (Rust build, seven deployment
contracts, production frontend build) and both configured browser projects.
The final local Playwright status was passed. There are no missing claims, so
the failure decision is based on fresh live browser evidence rather than a
claim-test omission.

## First read and demo gate

The cold desktop landing page itself passes the plain-words first-read test:

- What: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers who need useful evidence of student choices
  during class.”
- First click: **Try it with sample data** — “See three completed tickets.”

All three are visible without scrolling and the primary link targets `/demo`.
The root request log had only same-origin document, script, CSS, self-hosted
font, and hero-image requests, with no console or page errors. See
[cold landing](qa-evidence/verification-6-live-cold-desktop.png).

The mandatory gate still **fails**: the one-click demo did not deliver sample
data in fresh browser contexts, as documented above.

## Local functional and quality evidence

- `cargo test` — PASS, 6/6 unit tests.
- `npm test` — PASS, 7 release-contract tests and 36 Playwright tests.
- `npm run build` — PASS; `dist/` produced.
- `cargo build --release` — PASS.
- `npx tsc --noEmit`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --all-features -- -D warnings` — PASS.
- `npm audit --audit-level=high` — PASS, zero vulnerabilities.
- A release binary started with an otherwise empty environment and only
  `PORT=18080`; `/health` returned `{"build_sha":"dev","status":"ok"}`.

The local suite covers normal teacher/student ticket creation, CSV download,
deletion, one/seven/thirty-day retention, invalid fields, malformed JSON,
private-token rejection, concurrent 40-ticket capacity, persistence, CSV
formula neutralisation, 390 px reflow, keyboard, route behavior, and service
worker offline reload.

## Live non-blocking checks

- `/opt/fleet/lib/verify-url.sh` passed on the root: 200, title, `lang=en`, one
  `h1`, `<main>`, image alt coverage, labeled controls, and no cold-root
  console errors. Evidence is in
  [verification-6-url](qa-evidence/verification-6-url/verify.json).
- Axe found zero serious or critical violations on `/`, `/demo`, `/join`,
  `/start`, `/privacy`, and `/terms` at desktop and 390 px. `/demo` did log
  its failing 401 resource error at both widths.
- The cold root request log was same-origin only; no media API use, analytics,
  tracking, CDN script, or third-party font was observed. The product has no
  sign-in, so the Entra tenant requirement is not applicable.
- Response headers include header-delivered CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS, CSS, fonts,
  and hero image return `Cache-Control: public, max-age=31536000, immutable`.
- `deployment/verify-live.mjs` observed the documented API allowance once:
  40 requests in one second were allowed and requests 41–45 returned **429**
  with `Retry-After: 1`. Because session state is inconsistent across browser
  requests, this passing API-only result cannot clear the release blocker.
- Build budgets pass: initial JS is 23,821 bytes gzip (66,933 raw), CSS is
  4,050 bytes gzip (14,778 raw), fonts total 118,264 bytes, and the hero WebP
  is 46,170 bytes. All are below the supplied budgets.
- Public application routes `/`, `/demo`, `/join`, `/start`, `/privacy`, and
  `/terms` returned 200; an unknown path returned the styled 404.

## Required remediation and re-verification

1. Diagnose the replica/database routing or configuration so a session created
   by any ready instance is immediately readable by every ready instance.
2. Validate the repair through an actual browser: create a demo and a real
   session, then repeatedly load the private teacher view, student view,
   ticket submission, CSV export, and deletion from fresh contexts.
3. Change `deployment/verify-live.mjs` so its success cannot be hidden by
   connection affinity; preserve cleanup of its temporary records.
4. Re-run all eight exact clean-clone claim commands and live browser QA.

**Release decision: FAIL. Do not release this deployment.**
