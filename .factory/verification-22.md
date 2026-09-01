# Independent verification 22 — In-Class Draft Ticket

## Verdict: PASS

Candidate `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf` is the build serving <https://in-class-draft-ticket.sociobot.in>. It passes the researched brief, every registered claim, the complete local and live test suites, and the product QA checks below.

Verified independently on 1 September 2026 UTC. Product code, deployment configuration, and cloud resources were not changed. Checks used this clean repository and the public URL for this product only. Temporary QA sessions were deleted.

## First-read and one-click demo gate

PASS at 1440×900 and 390×844.

- What it does: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers recording student choices during class.”
- What to click first: “Try it with sample data,” followed by “See three completed tickets.”
- The action is visible on the first screen and opens the sample in one click.
- The demo immediately shows a completed Blue Finch ticket and retains the banner “Demo — sample data, nothing is saved to your classes,” with **Reset demo** and **Start for real**.

Evidence: [cold desktop](qa-artifacts/live-cold-desktop.png) and [demo at 390px](qa-artifacts/verify-demo/screenshot-mobile.png).

## Claims gate

`.factory/claims.json` exists with 13 entries. After the clean dependency install (`npm ci`), every listed command was run separately and passed exactly as declared:

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
| `release-contract` | PASS — Node contract test |

The landing, privacy wording, terms, and README were cross-checked against the registry. No unlisted product promise was found.

## Candidate and deployment identity

- Repository HEAD before evidence changes: `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf` on `main`.
- Twenty uncached live health samples returned that exact SHA, `storage_backend: sqlite`, HTTP 200, and `Cache-Control: no-store, max-age=0`.
- Live JavaScript, CSS, hero image, and both fonts have the same SHA-256 hashes as the local production build.
- One replica identifier was observed throughout the live backend checks.

## Clean-checkout gates

All available local gates passed:

- `npm ci`: 50 packages installed; zero audit findings.
- `npm test`: 15 contract tests and 60 Playwright tests passed.
- `cargo test --all-targets --all-features`: 11 passed.
- `cargo clippy --all-targets --all-features -- -D warnings`: passed.
- `cargo fmt --all -- --check`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed and produced `dist/`.
- `cargo build --release`: passed.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- `bash -n deployment/deploy.sh`: passed.

A container runtime was not available in the verifier. The exact frontend and Rust release stages passed directly, the Dockerfile contract passed, and the live build identity and shipped static bytes match the candidate.

## End-to-end behavior and backend boundaries

The full live Playwright suite passed 56 tests; four local-only request-window tests skipped as configured. A separate deterministic live check covered that boundary.

- A teacher created a 30-day session by keyboard, retained the private link, and shared its six-character code.
- A student recorded a class nickname, claim, evidence location, revision choice, and exit reflection.
- The teacher sheet showed the ticket and downloaded the expected CSV.
- Demo reset, 24-hour demo expiry, demo/real isolation, 1/7/30-day retention, concurrent 40-ticket capacity, authorization, CSV cell safety, deletion, and retryable error recovery passed.
- One-character and 81-character class names, a three-character prompt, unsupported retention, short ticket fields, and long ticket fields returned 400 with specific next-step wording.
- Minimum valid session input succeeded. Maximum ticket values (40/280/280/280/500 characters) saved and read back unchanged after invalid input.
- A missing teacher token returned 401. An unknown session returned 404. Deletion returned 204, followed by 404 on read.
- A release binary started twice with no product configuration, defaulted to port 8080 and local SQLite, and retained a session across a process stop/start.

The live request allowance is **40 requests per one-second client window**. One preconnected HTTP/2 run produced exactly 40 ordinary responses and 10 responses with status 429. Every 429 included `Retry-After: 1`.

## Privacy, headers, and caching

- The complete keyboard teacher/student/export flow made 22 requests, all to the product origin. No analytics, advertising, third-party script, sign-in, payment, model, webcam, microphone, or typing request occurred.
- Browser-observed API responses used `Cache-Control: private, no-store`.
- Health used `no-store, max-age=0`.
- Hashed JavaScript/CSS, fonts, and the hero used `public, max-age=31536000, immutable`.
- Valid pages and API responses included the declared self-only CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Every navigation link and the external Param Factory link returned its expected status.
- The app requires no account, so an identity-provider check is not applicable. It has no paid or model-assisted feature.

## Accessibility, mobile, keyboard, and PWA

- The required `verify-url.sh` passed `/` and `/?demo=1`: title, `lang=en`, one `<h1>`, main landmark, image alternatives, labelled buttons, and no console errors.
- Fresh axe checks found zero serious or critical findings on `/`, `/demo`, `/join`, `/start`, `/privacy`, `/terms`, and the 404 page at desktop and 390px widths.
- Valid routes had no console or page errors and no horizontal overflow. The 200% text reflow checks passed in the live suite.
- The first Tab target is the skip link. Focus uses a visible 3px cobalt outline. Route changes focus the new heading.
- The full mobile workflow was completed with Tab, arrow, typing, and Enter keys. No keyboard trap occurred.
- Every visible tested mobile control was at least 44px in both dimensions.
- Reduced-motion mode used instant scrolling and reported no running animation.
- Service worker registration and update succeeded. Cache `draft-ticket-v4` reloaded the shell offline; API data was not served from cache. Evidence: [offline 390px](qa-artifacts/live-mobile-offline.png).

## Performance and budgets

Fresh mobile Lighthouse measurements:

| Route/run | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Landing | 98 | 100 | 100 | 100 | 1.55 s | 144 ms | 0 | 142.7 KB |
| Demo 1 | 100 | 100 | 100 | 100 | 1.44 s | 63 ms | 0 | 97.6 KB |
| Demo 2 | 100 | 100 | 100 | 100 | 1.37 s | 0 ms | 0 | 97.6 KB |
| Demo 3 | 100 | 100 | 100 | 100 | 1.41 s | 37 ms | 0 | 97.6 KB |

The earlier demo layout-shift defect is resolved in 3/3 fresh runs.

- JavaScript: 64,642 bytes raw / 23.59 KB gzip (budget 200 KB).
- CSS: 16,515 bytes raw / 4.42 KB gzip (budget 50 KB).
- Fonts: 118,264 bytes total (budget 120 KB).
- Hero WebP: 46,170 bytes (budget 300 KB).

Evidence: [landing Lighthouse](qa-artifacts/lighthouse-root.json), [demo run 1](qa-artifacts/lighthouse-demo-1.json), [demo run 2](qa-artifacts/lighthouse-demo-2.json), and [demo run 3](qa-artifacts/lighthouse-demo-3.json).

## Visual and product review

The working-constellations direction is product-specific and consistently applied on desktop and mobile. The cream paper field, plotted marks, ticket cuts, teacher workspace, Fraunces/Atkinson pairing, and generated original art match `.factory/design.md`. The empty, loading, invalid, offline, demo, success, and removal states provide a clear next action. The brief does not call for a model-assisted step; adding one would conflict with the product's process-record purpose. CSV export supplies the obvious portability step.

## Defects and remaining limits

- Critical: none.
- Major: none.
- Minor: none found.
- Verification limit: no Docker-compatible runtime was available locally; direct build stages, repository container contracts, and the matching live candidate cover the release artifact.
- Product-measurement limit: the five-class completion-time and teacher-feedback goal requires a real pilot and is not claimed as achieved by the product.

## Release decision

PASS. Candidate `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf` is suitable for release at the tested URL.
