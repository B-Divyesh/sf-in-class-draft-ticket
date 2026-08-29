# Independent product verification — FAIL

- Candidate: `81ace07f47e70011710c95632f09300f30df742c`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-4`
- Result: **FAIL — do not release**

`/health` returned `{"build_sha":"81ace07f47e70011710c95632f09300f30df742c","status":"ok"}`, so this is fresh evidence against the requested candidate rather than a stale deployment.

## Release-blocking findings

### Critical — the live one-click demo and real session flow lose state between requests

The first screen meets the plain-words wording gate. At desktop and 390px it says what it does (“Record in-class drafting without surveillance”), for whom (“For writing teachers…”), and presents **Try it with sample data** in the first screen.

The required functional half of that gate fails in a fresh browser context:

1. Open `/` cold; no console or page errors occur.
2. Open `/demo` (the target of the one-click action).
3. `POST /api/demo` returns `201` and supplies a new code and private teacher token.
4. The immediate authenticated `GET /api/teacher/<new-code>` returns `401` (“This teacher link is not valid…”). A direct unauthenticated `GET /api/sessions/<new-code>` returns `404`.

For example, on 28 August UTC, `POST /api/demo` returned code `DXBDT8` and its token; its immediately following teacher read returned 401 and its public read 404. A fresh browser reproduction logged the same 401 at `/api/teacher/M3RJ82`. The demo consequently never renders its three tickets and produces `Failed to load resource: the server responded with a status of 401` in the browser console.

The same behavior prevents the core teacher/student job: a session response cannot be reliably read by the next request. The repository’s local backend passes, but the deployed persistence/routing boundary does not. The observable evidence does not by itself distinguish an unmounted/ephemeral database from traffic being split between isolated instances; either condition is release-blocking for this shared-state product.

### Critical — live API rate limiting is not enforced at the documented allowance

The server code documents a 40-request/second client boundary. A fresh live burst of **60 concurrent `GET /api/sessions/ZZZZZZ`** requests from this verifier returned **60 × 404**, with no 429 and no `Retry-After`; the same result occurred with a single fixed `X-Forwarded-For: 203.0.113.99` value. Thus a single client exceeded the stated 40-request allowance without being limited. The required observed allowance is therefore **not enforced**; no `Retry-After` value could be observed.

This is independently sufficient to fail the mandatory backend-service rate-limit contract.

## Required claims gate

`.factory/claims.json` is present. From this clean checkout after `npm ci`, every exact listed command was run separately through the local product/demo entry point. All passed in both configured Chromium projects (2/2 per command):

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

The local claims evidence does not override the live demo failure above. `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npm test` also failed in production. A focused reproduction of the public accessibility matrix showed the cause: three 401 console errors from the demo teacher read. The matrix’s axe scans themselves found no serious or critical violations.

## Local quality gates

- `npm ci` — PASS; 50 packages installed, audit reported zero vulnerabilities.
- `npm test` — PASS locally; 5/5 release-contract tests and 34/34 Playwright tests (`test-results/.last-run.json` is `passed`).
- `npx tsc --noEmit` — PASS.
- `cargo fmt --all -- --check` — PASS.
- `cargo clippy --all-targets --all-features -- -D warnings` — PASS.
- `cargo test --all-targets --all-features` — PASS; 4/4.
- `cargo build --release` — PASS.
- `npm run build` — PASS; produced `dist/` with 66.93 kB raw / 24.15 kB gzip JavaScript and 14.38 kB raw / 3.97 kB gzip CSS.
- `npm audit --audit-level=high` — PASS; zero vulnerabilities.

Local test coverage exercised normal ticket submission, four checkpoints, CSV export, 1/7/30-day retention inputs, 40-ticket capacity plus rejection, invalid/missing teacher authorization, 10 preset capacity, accessibility, routes, service worker, and offline reload. The local test isolation uses the backend’s demo and fresh-session entry points.

## Live browser, privacy, PWA, accessibility, and response policy

- Cold root request log contained only same-origin documents/assets/fonts/art; no third-party tracking, media capture, webcam, or microphone request was observed. The demo also made only same-origin requests, but its required API call failed as above.
- The live page has the exact expected title, `lang="en"`, a single visible `h1`, `<main>`, labeled inputs, image alt text, and no cold-load console errors. At 390px its first action measured 202 × 50.8 px and there was no horizontal overflow.
- Live keyboard checks passed in desktop and mobile: initial Tab focuses the skip link, route change focuses its `h1`, and tested navigation/home/footer targets meet 44px. Reduced-motion CSS disables transitions/animations and smooth scrolling.
- Targeted PWA test passed on desktop and mobile: the service worker installed (`draft-ticket-v2`) and a cached offline shell reload rendered.
- Response headers on HTML and assets include CSP with response-header `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS/CSS, fonts, and WebP use `Cache-Control: public, max-age=31536000, immutable`. `/privacy` and `/terms` return 200; the missing route returns a styled 404.
- No sign-in is required, so the Sociobot Entra tenant check is not applicable.
- `verify-url.sh` is not present in this checkout, so that prescribed worker script could not be run. Its title/lang/main/alt/console coverage was exercised through the independent Playwright checks above.

## Release decision and required repair

**FAIL. Do not release.** Restore live consistency before retest: a session or demo created by one request must be available to its immediate authenticated and student reads, including after the instance/routing boundary. Verify the deployed revision really has the configured single durable datastore (or replace it with shared persistence) rather than relying on the local release-contract tests. Then implement a cluster-wide/trusted-client rate limiter and prove that request 41 (or the documented boundary) returns 429 with `Retry-After`. Rerun the one-click demo in fresh contexts, the complete live matrix, and the rate probe after repair.
