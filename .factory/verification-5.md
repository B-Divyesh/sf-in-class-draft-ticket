# Independent product verification — FAIL

- Candidate: `c4111b365b26e105a8c093e119972ebba23e9212`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-5`
- Result: **FAIL — do not release**

The live service identifies the exact candidate and serves byte-identical frontend artifacts, but the deployed backend still splits session state and rate counters across three ephemeral replicas. The one-click demo and the real teacher/student workflow therefore fail. This is fresh evidence, not a carry-over of the builder's deployment note.

## Release-blocking findings

### Critical — production still has three isolated SQLite databases

`GET /health` returned:

```json
{"build_sha":"c4111b365b26e105a8c093e119972ebba23e9212","status":"ok"}
```

Read-only Azure inspection of ready revision `sf-in-class-draft-ticket--0000016` found the exact image `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:c4111b365b26`, but also found:

```text
active ready replicas: 3
scale:                 min 1 / max 3
template volumes:      null
container mounts:      none
running state:         RunningAtMaxScale
```

The configured environment storage `in-class-draft-ticket-data` exists and points to Azure Files share `sf-in-class-draft-ticket-data`, but revision 16 does not attach it. This contradicts the committed deployment contract (`min 2 / max 3` with `/app/data` mounted) and leaves each replica using its own ephemeral `./data/tickets.db`.

Fresh observable effects:

- Twelve independent `POST /api/demo` calls returned 201, but **12/12** immediate authenticated teacher reads returned 401.
- A real session was created as `B4WEUC`. Across eight repeated rounds, its public student read returned **2 × 200 and 6 × 404**; its authenticated teacher read returned **3 × 200 and 5 × 401**.
- A fresh browser at `/demo` displayed “This teacher link is not valid” instead of the promised three tickets. Evidence: [verification-5-live-demo-failure.png](qa-evidence/verification-5-live-demo-failure.png).
- The complete production Playwright run finished **32 passed / 2 failed**. Both desktop and mobile public-route tests failed because `/demo` logged 401 resource errors. The axe scans themselves had no serious or critical findings.

This breaks the brief's smallest useful product: students cannot reliably open or submit to a session, and teachers cannot reliably read, refresh, export, or delete it.

### Critical — the required 40-request allowance is multiplied to 120

The API documents and locally enforces 40 requests per client per one-second window. Production does not enforce that allowance across replicas:

```text
55-request burst, one fixed X-Forwarded-For: 55 × 404, 0 × 429
150-request burst, one fixed X-Forwarded-For: 120 × 404, 30 × 429
Retry-After on 429:                      1
```

The observed production allowance is **120 requests per second**, exactly 40 on each of three isolated replicas. A client can exceed 40 without receiving 429, so the mandatory backend rate-limit contract fails.

The separate Sociobot license-verification endpoint did enforce its own allowance: a 45-request burst returned 30 × 200 and 15 × 429 with `Retry-After: 4`. Its observed allowance was 30.

### Major — one exact required claim command failed twice

`.factory/claims.json` exists. After clean `npm ci`, every listed command was run separately. Seven passed in both configured browser projects. The exact CSV command failed on its first run and exact retry before Playwright could start:

```text
npm test -- --grep @claim:csv-export
not ok — concurrent replicas share a new demo and enforce one client rate limit
TypeError: fetch failed
at waitForHealth (...release-contract.test.mjs:16:24)
```

The later complete `npm test` passed, and six additional standalone contract runs passed. That makes the failure intermittent, not acceptable: the acceptance contract says any failing claim command is release-blocking, and README line 35 specifically claims the first claim command is reliable on a clean checkout.

| Claim | Exact command result after install |
| --- | --- |
| `sample-demo` | PASS — 2/2 projects |
| `csv-export` | **FAIL twice in mandatory pretest; CSV assertion not reached** |
| `pseudonymous-flow` | PASS — 2/2 projects |
| `session-retention` | PASS — 2/2 projects |
| `free-capacity` | PASS — 2/2 projects |
| `privacy-minimal` | PASS — 2/2 projects |
| `paid-presets` | PASS — 2/2 projects |
| `teacher-control` | PASS — 2/2 projects |

### Major — CSV export permits spreadsheet formula injection

All ticket fields are student-controlled. Inputs starting with spreadsheet formula characters are accepted and exported unchanged. The local release server produced:

```csv
"=1+1","@SUM(1,1)","+2+2","-1+1","=HYPERLINK(""https://example.invalid"")",...
```

CSV quoting does not neutralize formulas in common spreadsheet applications. A student can place a formula in a nickname or checkpoint and have it evaluated when the teacher opens the export. Prefix formula-leading cells safely (or otherwise neutralize them) while preserving the readable value.

## First-read and demo gate

The wording portion passes at desktop and 390 px:

- What it does: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers who need useful evidence of student choices during class.”
- What to click: “Try it with sample data,” with “See three completed tickets.” beside it.

The headline, audience, primary action, and three facts are visible on the first screen. Evidence: [desktop](qa-evidence/verification-5-live-desktop.png) and [390 px](qa-evidence/verification-5-live-mobile-390.png).

The combined mandatory gate nevertheless **fails** because the one-click action does not load sample data; it lands on the 401 error described above.

## End-to-end and boundary coverage

Local behavior against a fresh release server is substantially correct:

- Normal flow: create session, open student ticket, submit all four checkpoints, read in teacher view, export CSV, and delete — PASS in the Playwright suite.
- Exact maximums — 80-character class name, 240-character prompt, 40-character nickname, 280-character checkpoint fields, and 500-character reflection — returned 201.
- An 81-character class name, 3-character prompt, unsupported two-day retention, 1-character nickname, and 501-character reflection returned specific 400 errors.
- Missing and incorrect teacher tokens returned specific 401 errors.
- Malformed JSON returned 400.
- Concurrent free capacity stored 40 tickets and rejected five overflow requests in automated coverage.
- Local persistence across restart and cross-process shared-directory behavior passed the Rust and release-contract tests.

Production supersedes those local results: the real flow fails at the replica boundary as quantified above.

## Local quality gates

```text
npm ci                                             PASS; 0 vulnerabilities
npm test                                           PASS; 6 contracts + 34 Playwright tests
npx tsc --noEmit                                   PASS
cargo fmt --all -- --check                         PASS
cargo clippy --all-targets --all-features -- -D warnings  PASS
cargo test --all                                   PASS; 4/4
cargo build --release                              PASS
npm run build                                      PASS; dist/ produced
npm audit --audit-level=high                       PASS; 0 vulnerabilities
docker build                                       NOT RUN; no Docker/Podman binary
```

The exact CSV claim-command failures above occurred independently of the later passing complete run and remain a release blocker.

## Accessibility, privacy, PWA, routing, and headers

- `/opt/fleet/lib/verify-url.sh` passed on the live root: title present, `lang=en`, one `h1`, `main`, all images have alt text, no unlabeled buttons, and no cold-root console errors. Evidence: [verify.json](evidence/verification-5-url/verify.json).
- Axe found zero serious or critical issues on `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` at desktop and 390 px before the production console assertion failed.
- Keyboard order starts with the skip link, all tested controls show a 3 px cobalt focus outline, there are no traps, and tested targets are at least 44 px high.
- Reduced-motion emulation reports `scroll-behavior: auto` and zero-duration button transitions.
- **Medium accessibility defect:** text-only resizing to 200% at a 390 px viewport produces a 497 px document width, forcing horizontal scrolling across first-screen content and the pricing form. Evidence: [verification-5-text-200.png](qa-evidence/verification-5-text-200.png).
- The landing-to-demo request log contained only `https://in-class-draft-ticket.sociobot.in`. No tracking, third-party script/font, or media API call was observed.
- The service worker installed and updated, cache `draft-ticket-v2` appeared, and the landing shell reloaded offline with an offline status message.
- All discovered links returned 200, excluding the intentional `mailto:` link. Public deep links return 200 and an unknown route returns the styled 404.
- HTML responses include CSP (with header-delivered `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Hashed assets, fonts, and images use one-year immutable caching. HSTS and Permissions-Policy are absent.
- No sign-in is required, so the Microsoft Entra tenant requirement is not applicable.

## Performance and artifact identity

Mobile Lighthouse on the live landing page:

```text
Performance 98 · Accessibility 100 · Best Practices 100 · SEO 100
FCP 1.4 s · LCP 1.7 s · TBT 140 ms · CLS 0.029 · Speed Index 1.4 s
```

```text
JavaScript transfer  23,909 bytes (66,933 raw)
CSS transfer          3,951 bytes (14,388 raw)
Fonts                118,264 bytes total
Hero WebP             46,170 bytes
```

All declared budgets pass. The live `index.html`, hashed JS, hashed CSS, service worker, manifest, and hero WebP are SHA-256 identical to the local production build. This and `/health` confirm that the live frontend/backend image is the candidate; the failure is its unapplied deployment topology.

## Documentation mismatch

README line 46 says production keeps exactly one replica and checkpoints a local database to durable storage. The committed contract instead requires two to three replicas opening a shared database, while production currently runs three replicas with no storage. README line 48 also says the generic three-replica deployer is invalid, yet that is the observed live topology. The operational handoff is therefore unsafe and must be corrected alongside deployment.

## Release decision

**FAIL. Do not release.** Attach and verify durable shared persistence in the live revision, or move multi-replica state to a database designed for concurrent network clients. Then prove repeated demo and real-session reads across replicas, and prove request 41 returns 429 with `Retry-After`. Also neutralize formula-leading CSV cells, make every exact claim command reliable from a clean install, fix 200% text reflow, and update README to the actual supported topology before re-verification.
