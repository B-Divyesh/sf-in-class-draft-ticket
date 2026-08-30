# Independent product verification 18 — FAIL

- Candidate commit: `32d8eefd699a611d5b39ef7ea77f827df1009555`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 30 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-18`
- Decision: **FAIL — production does not serve the candidate build.**

## Release-blocking finding

`LIVE_EXPECTED_SHA=32d8eefd699a611d5b39ef7ea77f827df1009555 LIVE_IDENTITY_SAMPLES=20 npm run verify:live-identity`
failed on its first fresh, cache-busted `/health` request. The live response is
HTTP 200, PostgreSQL-backed and no-store, but reports:

```json
{"build_sha":"7864b293028bf0ed1bc99911a766418437933494","status":"ok","storage_backend":"postgres"}
```

The requested candidate is `32d8eefd…`; the active deployment is
`7864b293…`. Candidate and live `index.html`, JS, and CSS currently have
identical SHA-256 bytes, but that does not satisfy the required deployed build
identity. The candidate must be deployed and the identity gate re-run before
release acceptance.

## Required claims

`.factory/claims.json` exists and contains ten claims. From the clean checkout
I ran every exact declared command, after `npm ci` (50 packages; audit reported
zero vulnerabilities). All passed:

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS — three isolated, 24-hour sample tickets and reset |
| `csv-export` | PASS — CSV header and three sample rows |
| `pseudonymous-flow` | PASS — nickname plus four checkpoints reach teacher view |
| `session-retention` | PASS — 1/7/30-day expiry and cleanup |
| `free-capacity` | PASS — 40 accepted, 41st rejected |
| `privacy-minimal` | PASS — no capture/tracking and same-origin session requests |
| `data-storage-minimization` | PASS — schema/hash/expiry inspection |
| `no-ai-detection-or-authorship-verdict` | PASS — boundary copy and no detection endpoints |
| `free-no-account-core-flow` | PASS — complete free workflow without sign-in/payment |
| `teacher-control` | PASS — anonymous teacher read/export/delete rejected; bearer token accepted |

## Local gates

All passed on commit `32d8eefd…`:

```text
npm test: PASS — 15 contract tests, 58 Playwright tests
npx tsc --noEmit: PASS
cargo fmt --check: PASS
cargo clippy --all-targets --all-features -- -D warnings: PASS
cargo test: PASS — 9/9
cargo build --release: PASS
npm run build: PASS — dist/ produced
npm audit --audit-level=high: PASS — 0 vulnerabilities
bash -n deployment/deploy.sh; node --check deployment/verify-live-identity.mjs: PASS
```

The production frontend build is 63.06 kB raw / 22.87 kB gzip JavaScript and
16.05 kB raw / 4.29 kB gzip CSS, within the static budgets.

## Cold first read and demo

Fresh desktop load passes the first-read gate. It says **“Record in-class
drafting without surveillance,”** identifies **writing teachers** as its users,
and presents **“Try it with sample data”** with the outcome **“See three
completed tickets.”**

A fresh 390px reduced-motion context clicked that action once and reached
`/?demo=1`. It displayed the persistent demo banner and Blue Finch, Copper
Kite, and Quiet Maple; stored only `demo:workspace`; and had no console or page
errors. `scrollWidth` equalled 390. The registered service worker was present.

## Live verification

- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`:
  PASS, **58/58**. This exercises normal and invalid/retryable flows,
  persistence/teacher controls, retention, CSV, capacity/concurrency, mobile,
  keyboard, reduced motion, service-worker update/offline reload, and axe.
- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang=en`, exactly one
  h1, main landmark, image alt coverage, labeled buttons, and no browser errors.
- Independent demo request log contained only the product origin: document,
  self-hosted JS/CSS/fonts/art, `POST /api/demo`, and authorized same-origin
  teacher read. No analytics, third-party tracker, media capture, authentication,
  payment, or model request appeared.
- Response headers on `/`, `/health`, assets, and `/404` include response-header
  CSP with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS/CSS/fonts have
  one-year immutable cache policy; `/health` is `no-store, max-age=0`.
- Independent axe scan on the live demo found **zero serious/critical** findings.
  Keyboard focus landed on a labeled button with a visible `rgb(49, 94, 168)
  solid 3px` outline.
- One client issued 45 simultaneous API requests: **40** received 404 for the
  synthetic code and **5** received **429** with `Retry-After: 1`. Observed
  allowance: **40 API requests per client per one-second window**. Health is
  exempt. No sign-in exists, so Entra tenant validation is not applicable.

## Defects by severity

| Severity | Finding |
| --- | --- |
| Blocker | Live `/health` build identity is `7864b293…`, not requested candidate `32d8eefd…`; production therefore cannot be accepted as this candidate. |
| Critical | None |
| Major | None |
| Minor | None |

No product code was changed during verification.
