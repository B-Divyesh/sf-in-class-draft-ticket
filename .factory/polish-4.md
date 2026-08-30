# Polish round 4 — zero-finding repair

- Work order: `in-class-draft-ticket-polish-4`
- Reviewed candidate: `cb7a010d3ab5cc304821e75d5db348d350dd8278`
- Adversarial review: `1a1fe42250c6a5d6403edac9efc7681d50bc6f1a`
- Repair commit: `beffeac4bdc7178165888184c318b844addc5295`
- Deployed image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:beffeac4bdc7`
- Image digest: `sha256:6e89452d7e689e524f2a83e1a1cfa0dd3ee7b7c3dfb2538f7a4bb3d5778b8678`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Result: **PASS.** Every finding from reviews 1–4 is resolved and rechecked on the deployed service.

## Finding reconciliation

| Finding | Change made | Evidence | Cold live check |
| --- | --- | --- | --- |
| F-1-1 | Registered and retained focused claims for no AI/authorship verdict and free, no-account core use. | `@claim:no-ai-detection-or-authorship-verdict`; `@claim:free-no-account-core-flow`; claim-registry contract. | Root and demo passed the full live suite with no model, payment, or sign-in request. |
| F-1-2 | Kept the designed direct 404 document with shared header, footer, legal links, metadata, icons, and HTTP 404. | `direct 404 keeps the shared navigation, legal links, and complete metadata`; [`live 404`](evidence/polish-4/live-404-mobile.png). | <https://in-class-draft-ticket.sociobot.in/not-a-route> returned 404 with the headers in [`live-404-headers.txt`](evidence/polish-4/live-404-headers.txt). |
| F-1-3 | Kept all four 44px mobile navigation links visible, including Demo and Privacy. | `mobile wordmark, navigation, and footer links meet the 44px target`; [`live landing`](evidence/polish-4/live-landing-mobile.png). | Cold 390px landing shows Demo, Join, Start a class, and Privacy. |
| F-1-4 | Kept README prose within the plain-word limit and documented the release operation as an operation, not a claim. | `.factory/copy-audit.md`; `every product claim runs in a clean local sandbox`. | README at deployed SHA has no overlong reviewed sentence. |
| F-2-1 | Kept the specific privacy inventory, hashed teacher credential, rotating one-way rate key, and short rate-counter cleanup. | `cargo test claim_data_storage_minimization -- --nocapture`. | <https://in-class-draft-ticket.sociobot.in/privacy> passed the live route and accessibility checks. |
| F-2-2 | Kept Blue Finch’s completed ticket ahead of session controls in demo. | `first screens show all three facts and one completed sample ticket`; [`live demo`](evidence/polish-4/live-demo-mobile.png). | Cold <https://in-class-draft-ticket.sociobot.in/?demo=1> shows Blue Finch’s claim and revision in the first phone viewport. |
| F-2-3 | Kept the three facts before artwork on the phone layout. | `first screens show all three facts and one completed sample ticket`; [`live landing`](evidence/polish-4/live-landing-mobile.png). | All three facts are visible inside the cold 390 × 844 screenshot. |
| F-2-4 | Kept the demo’s separate browser namespace and authenticated backend workspace; entry, reset, and exit preserve a seeded real session. | `@claim:sample-demo demo is isolated, seeded, and expires after 24 hours`. | Live claim suite passed in Chromium and mobile Chromium. |
| F-2-5 | Kept the privacy regression that types every student field, rejects capture, and allows only documented same-origin requests. | `@claim:privacy-minimal no tracking, keystroke logging, or capture occurs`. | Full live suite passed with no console errors or third-party requests. |
| F-2-6 | Kept the exact 24-hour demo promise in product copy and sandbox. | `@claim:sample-demo demo is isolated, seeded, and expires after 24 hours`; database inventory claim. | Cold demo provisions the sample and its banner; live claim suite passed. |
| F-2-7 | Replaced the old effectiveness language with the four factual fields, now consistently ending in **exit reflection**. | `@claim:pseudonymous-flow teacher sees four submitted checkpoints`; `landing uses the same fourth checkpoint name and capacity unit as the student ticket`. | Landing, student form, and teacher sheet passed in the live suite. |
| F-2-8 | Kept the concrete teacher action: read each ticket beside the draft and export CSV. | `@claim:pseudonymous-flow teacher sees four submitted checkpoints`; `@claim:csv-export demo CSV contains every ticket`. | Live demo export and teacher read both passed. |
| F-2-9 | Kept the factual audience sentence without the untested “useful” claim. | `first screens show all three facts and one completed sample ticket`; copy audit. | Cold mobile landing shows “For writing teachers recording student choices during class.” |
| F-2-10 | Kept README demo/session terminology and removed the remaining fourth-field drift in this repair. | `.factory/copy-audit.md`; `landing uses the same fourth checkpoint name and capacity unit as the student ticket`. | <https://in-class-draft-ticket.sociobot.in/?demo=1> has the Demo title and isolated sample. |
| F-2-11 | Kept “deletion date” wording and all one-, seven-, and thirty-day choices. | `@claim:session-retention supports every retention choice and deletes an expired session`. | <https://in-class-draft-ticket.sociobot.in/start> passed in the live route suite. |
| F-2-12 | Kept “Page not found” on the SPA and direct 404. | `direct 404 keeps the shared navigation, legal links, and complete metadata`; [`live 404`](evidence/polish-4/live-404-mobile.png). | Direct unknown route returned HTTP 404 and that exact heading. |
| F-2-13 | Kept factual raw Open Graph and Twitter descriptions. | `raw social metadata uses factual product copy`; `public deep links return 200 documents and route metadata changes`. | Cold root passed the live metadata route test. |
| F-3-1 | Kept deployment topology out of product claims; each listed claim is a local disposable-sandbox command. | `every product claim runs in a clean local sandbox`; all ten declared commands passed from a clean clone. | Deployment is recorded as SHA-bound release evidence below, not a product claim. |
| F-4-1 | Replaced both landing uses of “next step” with **exit reflection**, matching the student form, README, and teacher sheet. The helper now asks “What will you revisit after class?” | `landing uses the same fourth checkpoint name and capacity unit as the student ticket`; full local and live Playwright suites. | [`live landing`](evidence/polish-4/live-landing-mobile.png) and the live student-form regression passed. |
| F-4-2 | Replaced the ambiguous class-size fact with **“Free sessions accept up to 40 draft tickets.”** Updated terms, README, claim wording, claim location, audit, and catalog description. | `@claim:free-capacity concurrent requests store exactly 40 free-session tickets`; `landing uses the same fourth checkpoint name and capacity unit as the student ticket`. | Cold mobile landing shows the exact tested capacity unit. |

## Verification

Clean clone: `/tmp/in-class-draft-ticket-polish4-clean.rl405g`, cloned after push at `beffeac4bdc7178165888184c318b844addc5295`.

- `npm ci`: passed with zero vulnerabilities.
- Every command declared in `.factory/claims.json` passed independently from that clone: nine tagged browser commands passed in both browser projects, and `cargo test claim_data_storage_minimization -- --nocapture` passed.
- Clean clone full gate: `npm test` passed 15 contracts and 58 browser tests; `cargo test` passed 9 tests; `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo build --release`, and `npm audit --omit=dev --audit-level=high` passed.
- Live gate: `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test` passed 58/58. This includes axe serious/critical checks, keyboard/skip-link/focus, 200% reflow, reduced motion, offline shell reload, route metadata, direct 404, demo isolation, privacy requests, CSV, retention, capacity, and 429 `Retry-After` coverage.
- Release gate: ACR run `ch1b2` built the listed image. The release check observed the repair SHA 20 times on PostgreSQL, verified browser flow/export/delete/rate limiting, restarted the revision, and confirmed the PostgreSQL record survived a real process replacement.
- Cold visual evidence: [`live landing mobile`](evidence/polish-4/live-landing-mobile.png), [`live demo mobile`](evidence/polish-4/live-demo-mobile.png), [`live 404 mobile`](evidence/polish-4/live-404-mobile.png), and [`live landing desktop`](evidence/polish-4/live-landing-desktop.png).
- Live mobile Lighthouse: [JSON report](evidence/polish-4/live-lighthouse-mobile.json) — Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.5s, LCP 1.5s, TBT 0ms, CLS 0.048.

There are no deferred findings, TODOs, or known gaps in this repair.
