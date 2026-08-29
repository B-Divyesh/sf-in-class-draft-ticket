# Independent product verification 14 — FAIL

- Candidate commit: `ca5d591809586f632f698db9823b1882f5900df7`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-14`
- Decision: **FAIL — do not release this candidate.**

## Release-blocking findings

### Blocker 1 — a required claim test is nondeterministic

After `npm ci`, the exact declared command
`npm test -- --grep @claim:privacy-minimal` failed in desktop Chromium while
mobile Chromium passed. The student form remained filled after clicking
**Record my draft ticket** and never showed “Your draft ticket is recorded.”
The failure timed out at `tests/product.spec.ts:191` after five seconds.

An immediate rerun passed 2/2 projects, but a stress repeat reproduced the same
failure: `npx playwright test --grep @claim:privacy-minimal --repeat-each=10
--retries=0` passed 19/20 and failed desktop repeat 4. The retained trace showed
that Playwright completed the button click, but no ticket POST followed and the
page showed neither success nor an error. Evidence was generated at:

- `test-results/product--claim-privacy-min-a2318-e-logging-or-capture-occurs-chromium-repeat4/error-context.md`
- `test-results/product--claim-privacy-min-a2318-e-logging-or-capture-occurs-chromium-repeat4/trace.zip`

The claims contract says any failing declared claim test blocks release. Later
passes, including the 54-test aggregate run, do not erase the observed failure.

### Blocker 2 — the live backend does not identify as the candidate

Fresh `GET /health` returned HTTP 200 and:

```json
{"build_sha":"b307226d8207edc981a4984f654bd59e52352771","status":"ok","storage_backend":"postgres"}
```

The required candidate is `ca5d591809586f632f698db9823b1882f5900df7`.
The live build identity therefore does not match it. The difference from the
live SHA to the candidate contains only `.factory` reports and evidence; local
and live `index.html`, JavaScript, and CSS hashes are byte-for-byte equal. That
establishes runtime equivalence, but it does not satisfy the explicit candidate
identity check or the backend build-identity contract.

### Blocker 3 — the production-topology claim test does not test its claim

The claim says the release deployment uses one PostgreSQL replica and that a
session survives a real revision restart. Its declared command exits 0, but
`contract-tests/release-contract.test.mjs:154-170` only matches strings in
`deployment/deploy.sh`. It never deploys, restarts a revision, or reads a record
after a restart. Live health independently proves PostgreSQL is active, and one
replica ID was observed in this run, but no restart occurred during this
verification. The observable persistence part of the claim is therefore not
proved by its listed sandbox test, contrary to `.factory/claims.json` policy.

## First-read and demo gate

**PASS.** Fresh desktop 1440×900 and mobile 390×844 contexts opened `/` with no
stored state. The first screen answers all three required questions:

- What: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers recording student choices during class.”
- First action: “Try it with sample data,” followed by “See three completed
  tickets.”

The action is visible in both first viewports and enters `/?demo=1` in one
click. The destination shows “Demo — sample data, nothing is saved to your
classes,” Reset demo, Start for real, and three fictional tickets. The landing
and demo made only same-origin requests and produced no console or page errors.

## Mandatory claims gate

`.factory/claims.json` exists and lists 11 claims. Its commands were run
separately after the committed lockfile was installed. The initial immediate
invocation before dependency installation stopped npm-backed commands at
`vite: not found`; after the required `npm ci`, the complete gate produced:

| Claim | Declared command result |
| --- | --- |
| `sample-demo` | PASS — 2/2 browser projects |
| `csv-export` | PASS — 2/2 |
| `pseudonymous-flow` | PASS — 2/2 |
| `session-retention` | PASS — 2/2 |
| `free-capacity` | PASS — 2/2 |
| `privacy-minimal` | **FAIL — 1/2 on the first installed run; 2/2 on rerun; 19/20 stress repeat** |
| `data-storage-minimization` | PASS — 1 Rust test |
| `no-ai-detection-or-authorship-verdict` | PASS — 2/2 |
| `free-no-account-core-flow` | PASS — 2/2 |
| `teacher-control` | PASS — 2/2 |
| `production-topology` | Command exits 0; **claim evidence is inadequate** as described above |

Landing and README reliance statements otherwise map to listed claims. No
extra payment or AI feature is present or needed for the brief.

## Local build and test evidence

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 50 packages, 0 vulnerabilities |
| `npm test` | PASS; 13 contract tests and 54/54 Playwright tests |
| `npx tsc --noEmit` | PASS |
| `cargo fmt --check` | PASS |
| `cargo clippy --all-targets -- -D warnings` | PASS |
| `cargo test` | PASS; 9/9 |
| `cargo build --release` | PASS |
| `npm run build` | PASS; `dist/` generated |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |

Production frontend output is 62.83 kB raw / 22.78 kB gzip JavaScript and
16.05 kB raw / 4.29 kB gzip CSS. The two self-hosted fonts total 118,264 bytes,
and the hero WebP is 46,170 bytes. All are within the stated budgets.

The optimized server also started with only `PORT=18080` in an otherwise clean
environment, generated its local security material, selected SQLite, served a
healthy response, and shut down gracefully. Docker/Podman is not installed in
this verifier container, so the multi-stage image could not be built locally.

## Live functional and backend evidence

`PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright
test` passed 54/54 with one worker. This exercised teacher creation, the four
student checkpoints, private teacher read/export/delete, 40-ticket capacity,
1/7/30-day retention, demo isolation/reset, invalid authorization, deep links,
real 404, history, mobile reflow, accessibility, and PWA offline reload.

A separate mobile run created a one-day session, confirmed all five empty
student fields were invalid, recovered with valid data, recorded `QA Finch 14`,
read it through the private teacher link, and deleted the session (204). It had
no console/page errors and only contacted the product origin.

The server allowance is **40 requests per client per one-second window**. A
fresh 45-request live burst returned 40×404 and 5×429; all five 429 responses
included `Retry-After: 1`. `/health` is exempt and correctly sends
`Cache-Control: no-store, max-age=0`.

## Accessibility, privacy, PWA, headers, and performance

- `/opt/fleet/lib/verify-url.sh` passed: descriptive title, `lang=en`, one h1,
  main landmark, alt/label checks, and no console errors.
- Axe scans on `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` at
  desktop and mobile found zero serious or critical violations.
- Keyboard Tab starts on the skip link. Its computed focus style is a 3 px
  solid cobalt outline. Route changes focus the new h1.
- At 390 px with reduced motion, there was no horizontal overflow, computed
  scroll behavior was `auto`, and no animation was running. The suite also
  passed 200% text reflow and 44 px target checks.
- The request log across landing, demo, and a real student/teacher flow was
  same-origin only. No analytics, tracking, media capture, CDN font, payment,
  or AI request occurred.
- The service worker installed cache `draft-ticket-v3`, updated, and reloaded
  the shell offline in both browser projects.
- Responses send CSP (including header-only `frame-ancestors 'none'`),
  `X-Content-Type-Options: nosniff`, and strict-origin referrer policy. Hashed
  assets and fonts use one-year immutable caching. All crawled internal and
  external page links returned 200; the intentional missing route returned a
  real 404.
- Fresh Lighthouse mobile: Performance 99, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.2 s, LCP 1.5 s, TBT 50 ms, CLS 0.06. Initial transfer was
  141,815 bytes across nine requests.

No sign-in is required, so the Entra authority requirement is not applicable.

## Defects by severity

| Severity | Finding |
| --- | --- |
| Blocker | `privacy-minimal` declared claim test failed and reproduced at 1/20 under repeat. |
| Blocker | Live `/health` identifies build `b307226…`, not candidate `ca5d591…`. |
| Blocker | `production-topology` test inspects script text instead of observing a real restart and persisted record. |
| Critical | None beyond blockers above. |
| Major | None. |
| Minor | None. |

## Required next steps

1. Make the student ticket submission and its claim test deterministic; retain
   a clear user-visible error if submission cannot begin or complete.
2. Replace or supplement the topology source-inspection test with an observable
   deployment/restart persistence check available to the release gate.
3. Deploy the final candidate so `/health.build_sha` equals that exact commit,
   then rerun every claim command and the full live suite from fresh state.
