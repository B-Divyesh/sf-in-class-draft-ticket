# Independent verification 21 — In-Class Draft Ticket

## Verdict: FAIL

Candidate `95e5fda89331f3490a47fe4407ccec949de3ef86` is the build serving <https://in-class-draft-ticket.sociobot.in>, passes every registered claim and all local quality gates, and completes the real teacher/student workflow. It is not release-ready because the primary one-click demo route reproducibly exceeds the required cumulative layout shift budget.

Verified on 30 August 2026 UTC. No product code, deployment, cloud configuration, or secret was read or changed. Verification used only this clean repository and the public `sf-in-class-draft-ticket` URL; short-lived QA sessions were created through the product API and deleted.

## Release-blocking finding

### Major — direct demo load has CLS 0.154, above the 0.1 budget

Three fresh mobile Lighthouse runs against `/?demo=1` measured the same CLS value, `0.15399506774804925`. The required budget is `< 0.1`.

| Run | Performance | Accessibility | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 93 | 100 | 1.29 s | 67 ms | **0.154** |
| 2 | 94 | 100 | 1.23 s | 14 ms | **0.154** |
| 3 | 94 | 100 | 1.15 s | 64 ms | **0.154** |

Lighthouse attributes the two shifts to the footer moving after the self-hosted fonts load and after asynchronous demo content replaces the initial loading state. The ordinary landing route is within budget at performance 99, accessibility 100, LCP 1.58 s, TBT 49 ms, and CLS 0.0603. The defect is specific to the required direct demo entry point.

Evidence: [demo run 1](qa-evidence/verification-21-lighthouse.json), [demo run 2](qa-evidence/verification-21-lighthouse-demo-2.json), [demo run 3](qa-evidence/verification-21-lighthouse-demo-3.json), and [landing run](qa-evidence/verification-21-lighthouse-root.json).

## First-read and demo gate

PASS at 1440×900 and 390×844.

- What it does: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers recording student choices during class.”
- What to click first: “Try it with sample data,” with “See three completed tickets.” beside it.
- The action is visible in the first viewport and reaches `/?demo=1` in one click.
- The settled demo shows the persistent “Demo — sample data, nothing is saved to your classes” banner, reset and exit actions, a completed Blue Finch ticket, and three fictional records.

The required URL verifier passed the live demo: HTTP 200, `lang=en`, title present, one `<h1>`, `<main>` present, no missing alt text, no unlabelled button, and no console error. Evidence: [desktop capture](qa-evidence/verification-21-url/screenshot-desktop.png), [390px capture](qa-evidence/verification-21-url/screenshot-mobile.png), and [verifier result](qa-evidence/verification-21-url/verify.json).

## Mandatory claim gate

`.factory/claims.json` exists with 13 entries. After `npm ci`, every listed command was run separately and passed exactly as declared:

- Ten browser-backed claims passed 2/2 tests each across desktop and mobile Chromium.
- `data-storage-minimization` and `runtime-defaults` passed their Rust tests.
- `release-contract` passed its Node contract test after `cargo build`.

The full exact output is in [claims-exact.log](qa-evidence/verification-21-logs/claims-exact.log). No unlisted behavioral claim was found in the landing copy or README; the repository contract test also passed that cross-check.

## Candidate and deployment identity

- Repository HEAD was exactly `95e5fda89331f3490a47fe4407ccec949de3ef86` on `main` before report changes.
- `GET /health?qa=21` returned HTTP 200, `build_sha: 95e5fda89331f3490a47fe4407ccec949de3ef86`, `storage_backend: sqlite`, and `Cache-Control: no-store, max-age=0`.
- The live JS and CSS bytes exactly match the local production build SHA-256 hashes.
- One opaque replica ID was observed throughout public probes: `452d89a7b8f742ef822a0fc0dac04b8a`.

## Clean-checkout quality gates

All available local gates passed:

- `npm test`: 14 contract tests and 58 Playwright tests passed.
- `cargo test --all-targets --all-features`: 9 passed.
- Clippy with warnings denied, rustfmt, TypeScript, frontend production build, backend release build, production dependency audit, and deployment script syntax all passed.
- `npm run build` produced `dist/`; `npm audit --omit=dev --audit-level=high` found zero vulnerabilities.

The complete output is in [full-quality.log](qa-evidence/verification-21-logs/full-quality.log). No Docker-compatible runtime exists in this worker, so a local image build could not be repeated. Both exact Docker build stages passed directly, Dockerfile contract tests passed, and deployed health/build identity and static bytes match the candidate.

## End-to-end behavior and boundaries

The complete suite was also run against the live URL: 57/58 tests passed. Normal teacher creation, student submission, teacher review, CSV export, demo reset/isolation, 1/7/30-day retention, concurrent 40-ticket capacity, authorization, deletion, error recovery, routing, accessibility, and PWA tests passed.

One live Playwright rate test did not generate a sufficiently dense network burst and reported no 429. A protocol-level HTTP/2 control removed the client connection-pool bottleneck: 50 requests from one client produced exactly **40 ordinary responses and 10 × 429**, every 429 carried `Retry-After: 1`, and all responses came from the same observed replica. The deployed allowance is therefore **40 requests per one-second window per client**. Evidence: [HTTP/2 rate log](qa-evidence/verification-21-logs/live-rate-http2.log) and the [Playwright trace](qa-evidence/verification-21-live-suite/trace.zip). The Playwright-only false negative is a non-blocking test reliability defect.

A separate live boundary exercise confirmed:

- one-character class name and unsupported retention return 400 with actionable errors;
- minimum valid class/prompt values create a session;
- an unauthenticated teacher read returns 401;
- an invalid ticket returns 400;
- maximum valid field lengths (40/280/280/280/500) save and read back unchanged;
- CSV returns the expected six-column header and one row;
- deletion returns 204, and the deleted session then returns 404.

The fixture was deleted. Evidence: [live-api-boundary.log](qa-evidence/verification-21-logs/live-api-boundary.log).

Backend persistence boundaries passed locally: a session remained readable after stopping and restarting the backend against the same SQLite path. A live restart was not performed because this work order is verification-only.

## Privacy, security headers, and caching

- Cold-page and complete student-flow request logs were same-origin only. No analytics, advertising, third-party script, model, sign-in, payment, webcam, microphone, or keystroke request occurred.
- The app requires no sign-in, so the Entra authority requirement is not applicable. AI and paid-unlock checks are also not applicable.
- HTML, assets, API responses, and errors return the declared CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Hashed JS/CSS and fonts return `public, max-age=31536000, immutable`; health returns `no-store`.
- Private teacher JSON and CSV do not set an explicit `Cache-Control` policy. An offline-after-delete browser probe did not replay private content, so no data exposure was reproduced. Adding `Cache-Control: private, no-store` remains prudent hardening.

## Accessibility, keyboard, mobile, and PWA

- Live axe checks found zero serious or critical findings on `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` in desktop and mobile projects.
- Desktop and 390px routes have one page heading, ordered landmarks, no horizontal overflow at 200% text, and no online console/page errors.
- A keyboard-only 390px run created a class and recorded a student ticket. The focused primary button showed a 3px cobalt outline; no keyboard trap occurred.
- All visible controls in the exercised 390px teacher view were at least 44×44 CSS px.
- With reduced motion enabled, the page reported no active animations.
- The service worker installed, `registration.update()` completed, cache `draft-ticket-v3` was present, and the app shell reloaded offline. The expected failed API request was not served from cache.

Evidence: [keyboard/PWA log](qa-evidence/verification-21-logs/live-keyboard-pwa.log).

## Bundle and asset budgets

- JavaScript: 63,067 bytes raw / 22,563 bytes gzip (budget 200 KB).
- CSS: 16,120 bytes raw / 4,296 bytes gzip (budget 50 KB).
- Fonts: 118,264 bytes total (budget 120 KB).
- Hero WebP: 46,170 bytes (budget 300 KB).
- Landing Lighthouse transfer: 141,805 bytes; demo transfer: 96,703 bytes.

All size, LCP, TBT, accessibility, best-practices, and SEO targets pass. Only the demo CLS target fails.

## Defects by severity

- **Major / release-blocking:** direct demo mobile CLS is 0.154 in 3/3 runs; budget is `< 0.1`.
- **Minor:** the live Playwright rate test is transport/timing-dependent and can fail to create a real 45-request burst, although HTTP/2 proves the API enforces 40 requests/second with 429 and `Retry-After`.
- **Advisory:** teacher JSON and CSV omit explicit `Cache-Control: private, no-store`; no cache replay was reproduced.

## Required next action

Do not release this candidate. Reserve the demo's settled layout before asynchronous data arrives and reduce font-swap movement so `/?demo=1` stays below CLS 0.1 on repeated mobile Lighthouse runs. Make the deployed rate test use HTTP/2 or another deterministic load driver, then rerun independent verification.
