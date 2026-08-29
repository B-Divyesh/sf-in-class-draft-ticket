# Independent verification 13 — PASS

**Candidate:** `7c5d302535fac3ab95637edc3d82b1be147b078b`  
**Live URL:** <https://in-class-draft-ticket.sociobot.in>  
**Verified:** 2026-08-29 UTC  
**Decision:** **PASS — release candidate accepted.** No release-blocking defects found.

## First read

A fresh desktop browser context opened `/` cold with no cache or stored data.
The first screen says: “Record in-class drafting without surveillance.” It says
this is “For writing teachers who need useful evidence of student choices during
class.” The primary first action is the visible one-click **Try it with sample
data**, with the plain outcome “See three completed tickets.” This satisfies the
plain-words and demo gate.

That cold visit made only same-origin requests (document, app JS/CSS, two
self-hosted fonts, and the self-hosted artwork), and had no browser console or
page errors.

## Mandatory claims gate

From a clean checkout, `npm ci` completed with zero audit vulnerabilities. I
then ran every command listed in `.factory/claims.json`, separately, before
broader QA. The browser claim tests use the product's local demo-backed entry
point and each ran in desktop and mobile Chromium where applicable.

| Claim | Declared command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS (2 projects) |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS (2 projects) |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS (2 projects) |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS (2 projects) |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS (2 projects) |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS (2 projects) |
| `no-ai-detection-or-authorship-verdict` | `npm test -- --grep @claim:no-ai-detection-or-authorship-verdict` | PASS (2 projects) |
| `free-no-account-core-flow` | `npm test -- --grep @claim:free-no-account-core-flow` | PASS (2 projects) |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS (2 projects) |
| `production-topology` | `npm run test:production-topology` | PASS |

The landing copy and README claim-like statements match the registered claims;
no unlisted reliance claim was found.

## Local gates

| Check | Result |
| --- | --- |
| `npm test` | PASS — 12 release-contract tests and 52 Playwright tests |
| `cargo test` | PASS — 8 tests |
| `cargo fmt --check` | PASS |
| `cargo clippy --all-targets --all-features -- -D warnings` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS; generated `dist/` |
| `cargo build --release` | PASS |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |

The exact frontend production output is 61.90 kB raw / 22.51 kB gzip JavaScript
and 15.06 kB raw / 4.09 kB gzip CSS, within the static-product budgets.

The local Docker client is unavailable in this disposable verifier environment,
so I could not execute `docker build`. This is a verification-environment
limitation, not a product failure: the optimized backend/frontend builds passed,
the Dockerfile is multi-stage and non-root, and the deployed candidate was
verified independently below.

## Live deployment, product flow, and backend

`GET /health` returned HTTP 200, `cache-control: no-store, max-age=0`,
`build_sha: "7c5d302535fac3ab95637edc3d82b1be147b078b"`, and
`storage_backend: "postgres"`. SHA-256 hashes of the deployed application JS,
CSS, and hero artwork exactly equal this checkout's `dist/` assets.

`PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npm test` passed
all 52 live browser checks (one worker to keep rate-limit observations
independent). This exercises the complete teacher creation → pseudonymous
student ticket → private teacher review/export/delete flow; sample demo,
reset and leave-demo behavior; retention; capacity; authorization; CSV; legal
routes; direct 404; metadata; keyboard; 390 px and 200% text reflow; service
worker offline reload; accessibility; console; and response behavior.

I also ran an independent live mobile exercise at 390 × 844 with reduced-motion
emulation. Empty setup and ticket submissions were stopped by native required
field validation (“Please fill out this field.” for all required fields). After
filling the fields, a `Silver Sparrow` ticket was recorded and appeared in the
private teacher view; cleanup returned 204. There was no horizontal overflow,
no console/page error, the first Tab focused the skip link with a designed 3 px
blue outline, and reduced-motion reported zero running animations.

For the required server allowance check, a fresh one-second, single-client
burst of 45 `GET /api/sessions/ABCDEF` requests yielded **40 × 404** then
**5 × 429**, with `Retry-After: 1` on the limited responses. Thus the observed
allowance is 40 requests per client per one-second window. `/health` remains
exempt as intended.

No sign-in is required, so the Entra authority condition is not applicable.

## Privacy, accessibility, headers, and caching

- Fresh landing and demo request logs stayed at
  `https://in-class-draft-ticket.sociobot.in`; there was no third-party
  analytics/tracking request or media-capture call. The live suite also
  verifies the privacy claim and absence of AI detection/authorship routes.
- Axe scans on `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` at
  desktop and 390 px found zero serious or critical issues. The full live
  suite reported no console/page errors.
- The service worker installed (`draft-ticket-v2`) and a controlled page
  reloaded the shell offline successfully. The suite verifies update/cache
  behavior as well.
- Live responses provide `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP with
  `frame-ancestors 'none'`. Hashed JS/CSS and self-hosted fonts are cached
  `public, max-age=31536000, immutable`; health is deliberately no-store.
- Root includes `lang="en"`, a descriptive title, one h1, main landmark,
  skip link, self-hosted fonts/art, and no external CDN scripts.

## Defects by severity

| Severity | Findings |
| --- | --- |
| Blocker | None |
| Critical | None |
| Major | None |
| Minor | None |

## Evidence commands

The verification was performed with the exact commands listed above plus:

```sh
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npm test
curl -fsS -D - https://in-class-draft-ticket.sociobot.in/health
```

The live health identity, byte-for-byte static-asset hash comparison, fresh
request log, response-header inspection, 45-request allowance observation,
and manual mobile recovery exercise are recorded in this report.
