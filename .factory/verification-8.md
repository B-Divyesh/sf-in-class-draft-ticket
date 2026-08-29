# Independent product verification 8 — FAIL

- Candidate: `fe5f64fcf33a0e0fb8402be5bbd017032839872e`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-8`
- Result: **FAIL — do not release**

## Decision

The source checkout is clean, buildable, and passes its local test suite. The
live service also identifies itself as the exact candidate and serves
byte-identical frontend assets. Production is nevertheless configured with
three independent SQLite databases instead of the committed shared PostgreSQL
backend. The real teacher/student workflow, one-click demo, export, deletion,
retention, and global request allowance are therefore nondeterministic or
wrong. This is a deployment failure with direct product impact, not a stale
deployment result.

## Release-blocking defects

### Critical — production splits every session across replica-local SQLite

Fresh evidence from the active Container App revision:

- `/health?qa=<candidate>` returns HTTP 200 with exact `build_sha`
  `fe5f64fcf33a0e0fb8402be5bbd017032839872e`, but
  `storage_backend: "sqlite"`.
- Azure reports active revision `sf-in-class-draft-ticket--0000026`, image
  `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:fe5f64fcf33a`, three
  replicas, and no sticky sessions.
- Its template contains only `PORT=8080`; there is no `DATABASE_URL`, no
  Container App secret, and no volume. Scale is `minReplicas: 1` /
  `maxReplicas: 3`, not the committed 2–3 replica PostgreSQL contract.
- Eighty fresh public health requests reached three distinct process IDs:
  `3d2d7f…` (26), `4c4de6…` (26), and `cf4c14…` (28).

A disposable real session created on `cf4c14…` was then read through fresh
HTTP/1.1 connections:

```text
student reads: 11 × 200 on cf4c14…; 13 × 404 on 3d2d7f…; 12 × 404 on 4c4de6…
teacher reads: 12 × 200 on cf4c14…; 11 × 401 on 3d2d7f…; 13 × 401 on 4c4de6…
cleanup:       204 on first attempt
```

The repository's own `LIVE_EXPECTED_REPLICAS=2 node
deployment/verify-live.mjs` also failed because its fresh-browser flow reached
only one replica rather than the required two. The full live browser suite
finished **18 passed / 20 failed**; sample data, CSV, pseudonymous submission,
retention, capacity, teacher control, rate-limit, and console-clean checks
failed on desktop and mobile.

The visible one-click demo is affected. An initial cold attempt happened to
create and read on one replica and displayed the three tickets. Later fresh
desktop and 390 px attempts produced zero tickets, a 401 console error, and:

> This teacher link is not valid. Use the link saved when the session was created.

Evidence: [desktop demo failure](qa-evidence/verification-8-live-demo-desktop.png)
and [mobile demo failure](qa-evidence/verification-8-live-demo-mobile.png).

### Critical — the 40-request allowance is multiplied across replicas

The documented API allowance is 40 requests per client per second. A fresh
same-client burst of 45 requests completed in 322 ms across all three replicas:

```text
45 × 404
0 × 429
```

A fresh burst of 130 requests completed in 670 ms:

```text
120 × 404 (40 on each replica)
10 × 429 (all Retry-After: 1)
```

The observed live allowance is therefore **120 requests per client per
second**, not 40. The application limiter itself works per SQLite database;
the deployment makes the counter replica-local. `/health` is correctly exempt.

### Major — the advertised paid feature has no purchase path

The landing page advertises that an active teacher license saves ten local
prompt presets, but provides only a restore field. It has no buy link, price,
one-time-purchase wording, or merchant-of-record/refund information required by
the paid-unlock contract. The required Sociobot endpoint is not registered:

```text
GET https://api.sociobot.in/api/v1/products/in-class-draft-ticket/checkout
404 {"error":"enabled factory product","status":404}
```

The free class-session workflow remains useful, but the researched freemium
model and attached purchase contract are not implemented end to end. The
existing-license verification endpoint did enforce its own allowance: 45
parallel invalid-token checks returned 30 × 200 and 15 × 429, with
`Retry-After: 4`.

### Major — claims coverage omits relied-on privacy and production promises

`.factory/claims.json` exists, but it does not list every claim-like statement
as required. Examples include the privacy-page promises “Session data stays on
this service” and “We do not use it to train models,” plus the README claim
that factory production supplies PostgreSQL and shares sessions and rate
counters across every replica. The latter is false in the live candidate.
The browser-only `privacy-minimal` test cannot prove server-side data handling.

## Required first-read and demo gate

- **First-read copy: PASS.** The cold first screen says what it does (“Record
  in-class drafting without surveillance”), who it is for (“For writing
  teachers…”), and what to click first (“Try it with sample data”).
- **One-click demo: FAIL overall.** The action and sandbox banner exist, but
  fresh attempts do not reliably show the promised three tickets because the
  create and authenticated read can reach different databases. The candidate
  therefore fails the mandatory demo gate.

Cold screenshots: [desktop](qa-evidence/verification-8-live-desktop.png) and
[390 px mobile](qa-evidence/verification-8-live-mobile.png).

## Claims gate from the clean checkout

The initial literal commands before installing Node dependencies stopped at
`vite: not found`; this was setup, not a claim assertion. After the required
clean `npm ci`, every exact command in `.factory/claims.json` passed against the
local demo/server, in both configured browser projects:

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2/2 |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2/2 |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2/2 |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2/2 |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2/2 |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2/2 |
| `paid-presets` | `npm test -- --grep @claim:paid-presets` | PASS — 2/2 |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2/2 |

The first cold pretest also exposed one transient `Address already in use`
failure in the simultaneous-replica contract. It passed in all eight installed
claim runs and the complete suite; this is recorded as a flaky observation,
not a reproducible blocker.

## Local build, tests, and backend behavior

```text
npm ci                                                   PASS; 0 vulnerabilities
npm test                                                 PASS; 9 contracts + 38 Playwright tests
npx tsc --noEmit                                         PASS
cargo fmt --all -- --check                               PASS
cargo clippy --all-targets --all-features -- -D warnings PASS
cargo test --all-targets --all-features                  PASS; 6/6
cargo build --release                                    PASS
npm run build                                            PASS; dist/ produced
npm audit --audit-level=high                             PASS; 0 vulnerabilities
```

No lint script is defined. Docker/Podman is unavailable in this worker, so the
container image itself was not rebuilt; the exact Vite and optimized Rust
stages passed, and static inspection confirms the required stable Rust image,
multi-stage build, non-root runtime, `PORT`, and build-argument contract.

A clean release binary also passed these independent checks:

- starts with only `PORT` set and defaults safely to local SQLite;
- rejects 1/81-character class names, 3/241-character prompts, invalid
  retention, and a 501-character reflection with specific 400 messages;
- accepts exact 80/240/500-character boundaries;
- stores exactly 40 of 45 concurrent ticket submissions and rejects five with
  409; the authenticated teacher view contains 40;
- protects teacher reads without the token, exports a 41-line CSV, deletes the
  session, and returns 404 afterward;
- survives graceful shutdown/restart with the created session intact.

The live 390 px join recovery path also passed: a five-character code produced
the explicit six-character error; an unknown six-character code produced a
clear not-found message; keyboard activation of “Enter another code” returned
to `/join` with a visible 3 px focus ring.

## Accessibility, privacy, PWA, headers, and performance

- The factory `verify-url.sh` passed: HTTPS 200, title, `lang=en`, one `<h1>`,
  `<main>`, image alt text, labeled buttons, and no root-page console errors.
  Evidence: [verify.json](qa-evidence/verification-8-verify/verify.json).
- Independent Axe scans found zero serious/critical findings on the home and
  demo error views at 1440 px and 390 px. The full route matrix reached its
  final console assertion, confirming its per-route Axe and overflow checks;
  it failed only because replica-induced demo requests logged 401 errors.
- The first Tab focuses the skip link with
  `rgb(49, 94, 168) solid 3px`; route focus, 44 px mobile navigation targets,
  200% text reflow, and Back scroll restoration pass. Reduced-motion emulation
  reports `scroll-behavior: auto` and zero active animations.
- Landing → one-click demo contacted only
  `https://in-class-draft-ticket.sociobot.in`; no third-party origin, media
  capture, or page exception was observed. The demo's same-origin 401 is the
  only console error. No sign-in is required, so Entra validation is not
  applicable.
- Root and all declared deep links return 200; an unknown route returns the
  styled 404. All crawled internal and external links return 200, apart from
  the intentionally skipped `mailto:` link.
- CSP includes `frame-ancestors 'none'`, `nosniff` and strict-origin referrer
  policy are present. Hashed assets, fonts, and images use one-year immutable
  caching.
- Service worker update succeeds, `draft-ticket-v2` is active, and an offline
  reload renders the landing shell with no page error.
- Frontend identity matches the candidate byte for byte: HTML, JS, CSS,
  service worker, hero image, and both fonts have matching SHA-256 hashes.
- Initial assets: JS 66,933 bytes raw / 24,001 transferred; CSS 14,788 raw /
  4,163 transferred; fonts 118,264 raw / 63,518 transferred; hero WebP 46,170
  bytes. All budgets pass.
- Fresh Lighthouse mobile: Performance 98, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.5 s, LCP 1.7 s, TBT 130 ms, CLS 0.029.

The product-specific “working constellations” visual system, self-hosted type,
single-mode rationale, responsive layout, and original-art provenance are
documented and visibly implemented. No AI feature is needed for this
non-surveillance workflow; the useful missing capability is reliable shared
session state, not an AI add-on.

## Required remediation

1. Deploy the candidate through the committed PostgreSQL path. The active
   template must contain the Key Vault-backed `DATABASE_URL` secret reference,
   use the documented 2–3 replica scale, and return
   `storage_backend: "postgres"` from every ready replica.
2. Re-run fresh-browser demo, teacher/student, export, delete, persistence, and
   rate checks across every ready replica. Request 41 from one client must be
   429 with `Retry-After` regardless of routing.
3. Either complete the Sociobot paid-license checkout contract or remove the
   paid feature and document the deliberate scope deviation.
4. Add tagged claim entries/tests for the broader privacy and production
   promises, or narrow the copy to what the existing tests prove.

**Release decision: FAIL.**
