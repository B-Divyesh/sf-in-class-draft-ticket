# Independent verification 23 — In-Class Draft Ticket

## Verdict: PASS

Candidate `aa987380d6e85b95ed170925fbc82ef36d29e3f8` is the candidate serving <https://in-class-draft-ticket.sociobot.in>. It passes the researched brief, all registered claims, local quality gates, and live product QA checks.

Verified on 1 September 2026 UTC. The verification changed no product code or deployment configuration. Temporary sessions created by the product QA checks were removed by the suite cleanup.

## Mandatory claim checks

`.factory/claims.json` is present with 13 claims. After `npm ci`, each listed command was started separately before the cold-read and broader QA checks. The sequence completed without a failing command. The subsequent complete local suite also passed 16 contract checks and 60 browser checks, which includes every browser-backed claim.

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS — isolated three-ticket demo and 24-hour duration |
| `csv-export` | PASS — header plus three sample rows |
| `pseudonymous-flow` | PASS — nickname and four checkpoints are shown to the teacher |
| `session-retention` | PASS — one, seven, and thirty-day choices and cleanup |
| `free-capacity` | PASS — exact 40-ticket boundary |
| `privacy-minimal` | PASS — same-origin request allowance and no typing request |
| `data-storage-minimization` | PASS — Rust database inventory and cleanup check |
| `no-ai-detection-or-authorship-verdict` | PASS — boundary wording and no related path |
| `free-no-account-core-flow` | PASS — teacher/student workflow without sign-in or payment |
| `teacher-control` | PASS — unauthenticated read, export, and delete are refused |
| `runtime-defaults` | PASS — zero-config port and SQLite path selection |
| `health-build-identity` | PASS — build identity, SQLite, and no-store response |
| `release-contract` | PASS — unsafe release shapes are refused by the local contract check |

## First-read and one-click sample

PASS on a cold desktop browser.

- What it does: **“Record in-class drafting without surveillance.”**
- For whom: **“For writing teachers recording student choices during class.”**
- First click: **“Try it with sample data”**, followed by **“See three completed tickets.”**

The action is visible in the first screen. It opens `/demo` in one click. The sample screen includes three fictional records, the persistent “Demo — sample data, nothing is saved to your classes” notice, **Reset demo**, and **Start for real**. The page request log contains only this product origin and no console or page errors.

## Candidate and live identity

- Repository HEAD: `aa987380d6e85b95ed170925fbc82ef36d29e3f8`.
- Twenty uncached `GET /health` samples returned HTTP 200 with that exact `build_sha`, `storage_backend: sqlite`, and `Cache-Control: no-store, max-age=0`.
- One replica ID was consistently observed: `c9c1a76e3e1343a4b90ff2c99084ec52`.
- Fresh byte comparisons matched local production output to the live files:
  - JavaScript: `93165335a93f7fe8ab426c54b16322803d9fcb43dd2a89bad7175efc5c16842a`
  - CSS: `e8fb0cbb245bff48f430210b0c155746ced75c29b998dfc179519b43a8659303`
  - Atkinson font: `833b4e79c549e3f407fecf03b5c9e6dbfb94a80c86f35fe4f12d32b5936eccba`
  - Hero image: `8401a36a3c21bc746fa164bef4252e1bf36fe909d4e031ef6249d3f85e51bc73`

## Clean checkout gates

All available checks passed:

- `npm ci`: completed; 50 packages; zero audit findings.
- `npm test`: 16 Node contract checks and 60 Playwright checks passed.
- `cargo test --all-targets --all-features`: 11 passed.
- `npx tsc --noEmit`, Rust formatting, Clippy with warnings denied, Rust release build, Vite build, production dependency audit, and deployment-script syntax check: passed.
- `npm run build` created `dist/`.

The production bundle is within budget: JavaScript is 64.63 kB raw / 23.58 kB gzip and CSS is 16.51 kB raw / 4.42 kB gzip.

## End-to-end, boundary, and backend checks

The live browser suite reported 60 checks passed at the candidate URL. It confirms normal teacher creation, six-character session-code sharing, four-field student submission, teacher review, CSV export, temporary error recovery, validation, 1/7/30-day retention, demo isolation/reset, authorization controls, deletion, one-replica behavior, and concurrent 40-ticket capacity.

The local backend contract check confirmed a mounted SQLite record remains available after a process stop/start. The live health identity confirms SQLite storage at the deployed candidate.

The deterministic live HTTP/2 rate check made 50 preconnected requests to the same API path. It observed exactly 40 ordinary responses and 10 responses with status 429. Every rate-limited response had `Retry-After: 1`. Observed documented allowance: **40 requests per one-second client window**.

## Privacy, accessibility, mobile, and PWA

- Cold-page and workflow request logs remained on `https://in-class-draft-ticket.sociobot.in`; no third-party scripts, analytics, sign-in, payment, model, webcam, microphone, or typing requests were observed.
- Live headers include self-only CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Health uses no-store; hashed assets use one-year immutable caching.
- The complete live browser run passed axe serious/critical checks, console/page-error checks, one-heading/landmark checks, 390px layout and 200% text reflow, keyboard-only flow, skip link, visible focus, 44px control targets, reduced motion, service-worker update, and offline shell reload.
- Required routes `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml` returned 200. An unknown route returned the designed 404 response.
- The product has no sign-in requirement, so an identity-provider integration check is not applicable. It has no paid or model-assisted flow.

## Defects by severity

- Critical: none found.
- Major: none found.
- Minor: none found.

## Release decision

**PASS.** The candidate is suitable for release at the tested URL. The five-class pilot measure in the brief requires classroom use and remains a future outcome rather than a shipped claim.
