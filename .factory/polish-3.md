# Polish round 3 — zero-finding repair

- Work order: `in-class-draft-ticket-polish-3`
- Reviewed release: `233798a4d8a30cb308a7c4c456098d69a057fcf4`
- Review report: `58a6b1a340b4bbbed18d63bacf86ff6a1af76148`
- Deployed repair: `8f17bd2d94dfb72a9be7e819d324d63df30114d2`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Result: every finding from rounds 1–3 is resolved; no severity remains open.

## Round 3 finding

| Finding | Change made | Test evidence | Screenshot and live evidence |
| --- | --- | --- | --- |
| F-3-1 | Removed `production-topology` from the product-claim registry and deleted the test-shaped deployment wrapper. `npm run deploy:release` is now an explicit release operation. README labels it as live-changing release evidence. Added a contract that rejects claim commands or sandboxes containing deploy, Azure, live-verifier, or live-domain references. | `every product claim runs in a clean local sandbox` and `every listed product claim has exactly one tagged regression test` passed in the exact deployed clean clone. All ten remaining claim commands passed independently. | `/health` returned deployed SHA `8f17bd2…` and `storage_backend: postgres`; [health.json](evidence/polish-3-live-root/health.json). ACR run `ch17s` produced digest `sha256:54904c8bb3a26d9169da9ad686ca3f0e9798702ba781b754d8cba8fa98e70ae9`. The release gate passed fresh-browser flows, rate limiting, and PostgreSQL record survival after a replacement replica. |

## Round 2 findings rechecked

| Finding | Change remains in place | Test evidence | Screenshot and live evidence |
| --- | --- | --- | --- |
| F-2-1 | Privacy lists class content, random IDs, hashed teacher credentials, timestamps, demo markers, and rotating one-way rate keys with their lifetime. | `@claim:data-storage-minimization` inspected every table and column, legacy hashing, four-second rate-key cleanup, and cascading expiry deletion. | [Live privacy at 390 px](evidence/polish-3-live-privacy-mobile.png); `/privacy` returned 200 in the live route suite. |
| F-2-2 | The compact completed Blue Finch ticket remains before demo controls. | `first screens show all three facts and one completed sample ticket` passed at 390×844 and 1440×900. | [Live demo mobile](evidence/polish-3-live-demo/screenshot-mobile.png) and [desktop](evidence/polish-3-live-demo/screenshot-desktop.png); cold `/?demo=1` showed the claim and revision in the first viewport. |
| F-2-3 | Mobile still places all three plain facts before the artwork. | The same first-screen test checks each fact ends above 844 px. | [Live landing mobile](evidence/polish-3-live-root/screenshot-mobile.png); all three facts are visible before the first fold. |
| F-2-4 | Demo entry, reset, and exit preserve a seeded real browser key and authenticated backend session. | `@claim:sample-demo demo is isolated, seeded, and expires after 24 hours` compares both real records through the full demo lifecycle. | [Live demo mobile](evidence/polish-3-live-demo/screenshot-mobile.png); live claim test passed in both browser projects. |
| F-2-5 | Privacy regression types into every student field, compares storage and requests, and uses an exact endpoint allowlist. | `@claim:privacy-minimal no tracking, keystroke logging, or capture occurs` passed clean and live. | [Live privacy](evidence/polish-3-live-privacy-mobile.png); cold request checks reported no console errors or third-party traffic. |
| F-2-6 | The demo claim, copy, and docs state exactly 24 hours. | `@claim:sample-demo` asserts `expires_at - created_at === 86,400,000 ms`; the database claim proves cleanup. | `/?demo=1` loaded three fictional tickets from a fresh context. |
| F-2-7 | Landing copy factually lists claim, evidence location, revision, and next step. | `@claim:pseudonymous-flow teacher sees four submitted checkpoints` passed clean and live. | [Live landing mobile](evidence/polish-3-live-root/screenshot-mobile.png). |
| F-2-8 | Landing copy says teachers can read each ticket beside the student's draft. | `@claim:pseudonymous-flow` completes the teacher read path. | Cold `/` and `/?demo=1` both showed the read workflow. |
| F-2-9 | The audience sentence remains factual: “For writing teachers recording student choices during class.” | `first screens show all three facts and one completed sample ticket`; round-3 copy audit. | [Live landing mobile](evidence/polish-3-live-root/screenshot-mobile.png). |
| F-2-10 | README uses sample session, demo, and classes consistently. | `@claim:sample-demo`; `.factory/copy-audit.md` terminology table. | README points to the live `/?demo=1` route, which returned 200 and the Demo title. |
| F-2-11 | README says a session has a deletion date, not a timer. | `@claim:session-retention supports every retention choice and deletes an expired session`. | Live `/start` returned 200 and the route suite passed. |
| F-2-12 | The 404 h1 remains “Page not found.” | `direct 404 keeps the shared navigation, legal links, and complete metadata`. | [Live 404 mobile](evidence/polish-3-live-404-mobile.png); `/not-a-route` returned 404 with the shared shell. |
| F-2-13 | Raw Open Graph and Twitter descriptions remain factual. | `raw social metadata uses factual product copy`; `public deep links return 200 documents and route metadata changes`. | Cold `/` returned the expected description with no console error. |

## Round 1 findings rechecked

| Finding | Change remains in place | Test evidence | Screenshot and live evidence |
| --- | --- | --- | --- |
| F-1-1 | AI/authorship and free/no-account boundaries remain registered user-facing claims. | `@claim:no-ai-detection-or-authorship-verdict` and `@claim:free-no-account-core-flow` passed clean and live in both projects. | [Live landing mobile](evidence/polish-3-live-root/screenshot-mobile.png); the live core flow completed without sign-in, checkout, or model requests. |
| F-1-2 | Direct 404 retains header, footer, legal links, title, description, canonical, social metadata, and icons. | `direct 404 keeps the shared navigation, legal links, and complete metadata`, including axe. | [Live 404 mobile](evidence/polish-3-live-404-mobile.png); cold status was 404. |
| F-1-3 | Demo and Privacy remain visible in the 390 px four-link header with 44 px targets. | `mobile wordmark, navigation, and footer links meet the 44px target`; 200% reflow test. | [Live landing mobile](evidence/polish-3-live-root/screenshot-mobile.png) and [demo mobile](evidence/polish-3-live-demo/screenshot-mobile.png). |
| F-1-4 | README sentences remain within 22 words and the live-changing release command is now described plainly. | `.factory/copy-audit.md`; `@claim:free-no-account-core-flow`; sandbox-safety contract. | Cold landing wording is visible in [live mobile](evidence/polish-3-live-root/screenshot-mobile.png). |

## Claims from the exact deployed clean clone

Clone: `/tmp/in-class-polish3-clean-8f17bd2`, detached at `8f17bd2d94dfb72a9be7e819d324d63df30114d2`. `npm ci` completed before any test.

| Claim | Declared command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2 browser projects |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2 browser projects |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2 browser projects |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2 browser projects |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2 browser projects |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2 browser projects |
| `data-storage-minimization` | `cargo test claim_data_storage_minimization -- --nocapture` | PASS — 1 Rust test |
| `no-ai-detection-or-authorship-verdict` | `npm test -- --grep @claim:no-ai-detection-or-authorship-verdict` | PASS — 2 browser projects |
| `free-no-account-core-flow` | `npm test -- --grep @claim:free-no-account-core-flow` | PASS — 2 browser projects |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2 browser projects |

## Complete verification

- Exact deployed clean clone: `npm test` passed 14 release contracts and 56 browser tests.
- Live after deployment: `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test` passed 56/56.
- Rust: format, clippy with warnings denied, 9 tests, and release build passed.
- Frontend: TypeScript passed; Vite produced `dist/`, 63.01 kB raw / 22.87 kB gzip JavaScript, and 16.05 kB raw / 4.29 kB gzip CSS.
- Privacy/security: dependency audit found zero vulnerabilities; live CSP, `nosniff`, strict-origin referrer policy, no-store health, and 429 with `Retry-After` passed.
- Accessibility: factory URL verifier found no console errors, one h1, `lang=en`, one main, complete alt text, and labelled buttons. Axe found zero violations on live root and demo.
- Offline/mobile: service-worker offline reload, reduced motion, 200% text reflow, 390 px overflow, 44 px targets, keyboard focus, and browser Back restoration passed.
- Performance: live mobile Lighthouse scored Performance 99, Accessibility 100, Best Practices 100, and SEO 100. FCP 1.2 s, LCP 1.5 s, TBT 30 ms, CLS 0.061.
- Runtime: a default local server accepted 100 concurrent health requests with 100 responses at HTTP 200 and shut down gracefully.

There are no unresolved findings, deferred minor items, TODOs, or known product gaps in this work order.
