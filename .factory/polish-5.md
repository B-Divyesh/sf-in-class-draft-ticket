# Polish round 5 — zero-finding repair

- Work order: `in-class-draft-ticket-polish-5`
- Released candidate: `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf`
- Adversarial review: `73ebb1cc551c2daf06371a1a4839f2d25e6af29c`
- Repair commit: `7e3360b7cdab03c9f25209fe8bb85c3fdc114542`
- Deployed image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:7e3360b7cdab`
- Image digest: `sha256:1b02d234e405a79da03058d97644781231bfc4027800047c18eef34e4284cc6a`
- ACR run: `ch1qk`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Result: **PASS.** Every finding from reviews 1–5 is resolved and rechecked on the deployed service.

## Finding reconciliation

| Finding | Change or retained repair | Test evidence | Screenshot path | Cold live check |
| --- | --- | --- | --- | --- |
| F-1-1 | Retained focused claims for no AI/authorship verdict and free, no-account core use. | `@claim:no-ai-detection-or-authorship-verdict`; `@claim:free-no-account-core-flow`; both passed clean and live. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | `/` and `/demo` made no model, payment, or sign-in request. |
| F-1-2 | Retained the real 404 with the shared header, footer, legal links, metadata, and one h1. | `direct 404 keeps the shared navigation, legal links, and complete metadata` passed live, including axe. | `.factory/evidence/polish-5/live-404/screenshot-mobile.png` | `/not-a-route` returned HTTP 404 with “Page not found.” |
| F-1-3 | Kept Demo and Privacy visible in the four-link mobile header with 44 px targets. | `mobile wordmark, navigation, and footer links meet the 44px target`; 200% reflow test. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | Cold 390 px `/` showed all four navigation links without overflow. |
| F-1-4 | Kept README and landing prose within the 22-word limit and refreshed the round-5 copy audit. | `README behavioral promises are all registered claims`; `.factory/copy-audit.md`. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | `/` retains the short factual first-screen copy. |
| F-2-1 | Retained the exact privacy inventory, hashed teacher credentials, rotating one-way rate keys, and cleanup window. | `claim_data_storage_minimization_inventory_hashes_and_deletion` passed from the clean clone. | `.factory/evidence/polish-5/live-privacy/screenshot-mobile.png` | `/privacy` returned 200 with one h1 and no console errors. |
| F-2-2 | Kept Blue Finch’s completed claim and revision before demo administration controls. | `first screens show all three facts and one completed sample ticket` passed at both viewports locally and live. | `.factory/evidence/polish-5/live-demo/screenshot-mobile.png` | Cold `/demo` showed the completed ticket in the first 390 × 844 viewport. |
| F-2-3 | Kept all three product facts before the artwork on phones. | `first screens show all three facts and one completed sample ticket` checks each fact against the viewport edge. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | All three facts appeared in the first cold mobile screen with no overflow. |
| F-2-4 | Kept the demo in `demo:workspace`; entry, reset, and exit preserve seeded real browser and backend data. | `@claim:sample-demo demo is isolated, seeded, and expires after 24 hours` passed clean and live. | `.factory/evidence/polish-5/live-demo/screenshot-mobile.png` | `/demo` showed the isolation banner, Reset demo, and Start for real. |
| F-2-5 | Kept the privacy regression that types in every field, blocks capture, and permits only documented same-origin requests. | `@claim:privacy-minimal no tracking, keystroke logging, or capture occurs` passed clean and live. | `.factory/evidence/polish-5/live-privacy/screenshot-mobile.png` | The live suite found no third-party or typing request and no console error. |
| F-2-6 | Kept the exact 24-hour demo expiry in copy, the claim, and the backend assertion. | `@claim:sample-demo demo is isolated, seeded, and expires after 24 hours`; database minimization test. | `.factory/evidence/polish-5/live-demo/screenshot-mobile.png` | A fresh `/demo` workspace returned the tested 24-hour timestamps. |
| F-2-7 | Kept the factual list of claim, evidence location, revision, and exit reflection. | `@claim:pseudonymous-flow teacher sees four submitted checkpoints`; terminology regression. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | `/` contains the four field names and no effectiveness claim. |
| F-2-8 | Kept the concrete teacher action: read each ticket beside the draft and export CSV. | `@claim:pseudonymous-flow`; `@claim:csv-export demo CSV contains every ticket`. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | Live `/demo` rendered all tickets and exported all three rows. |
| F-2-9 | Kept the factual audience sentence without the former “useful” adjective. | `first screens show all three facts and one completed sample ticket`; copy audit. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | Cold `/` says “For writing teachers recording student choices during class.” |
| F-2-10 | Standardized docs and product navigation on **demo**, **session**, and **classes**; `/demo` is now the documented address. | `@claim:sample-demo`; `the sitemap and public links use the canonical demo route`. | `.factory/evidence/polish-5/live-demo/screenshot-mobile.png` | README and the live landing action both point to `/demo`. |
| F-2-11 | Kept “session with a deletion date” and all one-, seven-, and thirty-day choices. | `@claim:session-retention supports every retention choice and deletes an expired session`. | `.factory/evidence/polish-5/live-start/screenshot-mobile.png` | `/start` returned 200 and showed the deletion-date control. |
| F-2-12 | Kept “Page not found” as the direct and client-rendered 404 heading. | `direct 404 keeps the shared navigation, legal links, and complete metadata`. | `.factory/evidence/polish-5/live-404/screenshot-mobile.png` | `/not-a-route` returned 404 with the exact heading and a route home. |
| F-2-13 | Kept factual Open Graph and Twitter descriptions in raw and hydrated HTML. | `raw social metadata uses factual product copy`; route metadata test. | `.factory/evidence/polish-5/live-root/screenshot-desktop.png` | Cold `/` loaded the expected metadata with no console error. |
| F-3-1 | Kept production-changing operations out of product claim tests; every registered command is locally sandboxed. | `every product claim runs in a clean local sandbox`; all 13 claim commands passed independently. | `.factory/evidence/polish-5/live-root/screenshot-desktop.png` | `/health` reported the repair SHA; deployment evidence is separate from claims. |
| F-4-1 | Kept **exit reflection** as the fourth checkpoint in landing, form, README, and teacher sheet. | `landing uses the same fourth checkpoint name and capacity unit as the student ticket`. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | `/` and the live student flow use the same field name. |
| F-4-2 | Kept the exact capacity unit: up to 40 draft tickets per free session. | `@claim:free-capacity concurrent requests store exactly 40 free-session tickets`; terminology regression. | `.factory/evidence/polish-5/live-root/screenshot-mobile.png` | Cold `/` shows “Free sessions accept up to 40 draft tickets.” |
| F-5-1 | Made `/demo` the landing, header, 404, README, claim-sandbox, and sitemap address. The `?demo=1` alternate remains functional but declares `/demo` canonical. | `the sitemap and public links use the canonical demo route`; `public deep links use route metadata and one canonical demo address`. | `.factory/evidence/polish-5/live-demo/screenshot-mobile.png`; `.factory/evidence/polish-5/live-demo-query/screenshot-mobile.png` | `/demo` and `/?demo=1` returned 200, both used the Demo title and `/demo` canonical; `/sitemap.xml` lists `/demo` only. |

## Clean-clone claims

The clean clone `/tmp/in-class-polish5-clean.ynpESN/repo` started at repair commit `7e3360b7cdab03c9f25209fe8bb85c3fdc114542`. `npm ci` completed with zero vulnerabilities. Every command in `.factory/claims.json` then ran exactly as declared.

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS — 2 browser projects |
| `csv-export` | PASS — 2 browser projects |
| `pseudonymous-flow` | PASS — 2 browser projects |
| `session-retention` | PASS — 2 browser projects |
| `free-capacity` | PASS — 2 browser projects |
| `privacy-minimal` | PASS — 2 browser projects |
| `data-storage-minimization` | PASS — Rust claim test |
| `no-ai-detection-or-authorship-verdict` | PASS — 2 browser projects |
| `free-no-account-core-flow` | PASS — 2 browser projects |
| `teacher-control` | PASS — 2 browser projects |
| `runtime-defaults` | PASS — Rust claim test |
| `health-build-identity` | PASS — 2 browser projects |
| `release-contract` | PASS — local contract test |

## Complete verification

- Local `npm test`: 16 contract tests and 60 Playwright tests passed.
- Live `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`: 56 passed; four local-only rate-window cases skipped as designed.
- Rust: format check, clippy with warnings denied, 11 tests, and release build passed.
- Frontend: TypeScript passed; Vite produced `dist/`; JavaScript is 64.63 kB raw / 23.58 kB gzip and CSS is 16.51 kB raw / 4.42 kB gzip.
- Accessibility: the browser suite’s axe checks found no serious or critical issue on all public routes and the 404. The factory URL verifier passed `/`, `/demo`, `/?demo=1`, `/privacy`, and `/start` with no console error, one h1, one main, complete alt text, and labelled buttons.
- Privacy and resilience: same-origin request enforcement, typing privacy, service-worker offline reload, reduced motion, route focus, keyboard flow, 200% reflow, and mobile touch targets passed.
- Rate limit: the live HTTP/2 probe observed exactly 40 ordinary responses and 10 HTTP 429 responses, all with `Retry-After: 1`.
- Local Lighthouse: Performance 98, Accessibility 100, Best Practices 100, SEO 100; LCP 1.89 s, TBT 110 ms, CLS 0.
- Live Lighthouse: 100 in all four categories; LCP 1.65 s, TBT 4 ms, CLS 0. Report: `.factory/evidence/polish-5/live-lighthouse.json`.
- Deployment: ACR run `ch1qk` produced the image digest above. The release gate verified one ready replica, mounted SQLite, no runtime secret, all browser flows, and a persisted record after an actual revision restart.
- Cold live health: build SHA `7e3360b7cdab03c9f25209fe8bb85c3fdc114542`, `storage_backend: sqlite`, status `ok`.

No finding, deferred minor issue, unfinished item, or known product gap remains.
