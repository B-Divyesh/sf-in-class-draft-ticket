# Handoff — repair in progress

This repair addresses the independent-verification failure recorded in commit `fbacef8115422de646ca7d745c8ea32091af52d8` for candidate `1eb3c1feef1f50e3cc875bd7260ecbab5caf0332`.

## Repaired findings

1. Axum now serves the SPA shell with HTTP 200 for `/`, `/demo`, `/join`, `/start`, `/privacy`, `/terms`, `/session/:code`, and `/teacher/:code`. Unknown paths receive the dedicated styled `404.html` response.
2. The service worker is versioned as `draft-ticket-v2`. Its complete precache list now consists only of successful public document and local asset responses, so a fresh install activates and the shell reloads offline.
3. Free-ticket capacity is an atomic SQLite `INSERT … SELECT` predicate. Forty-five parallel submissions now produce exactly forty `201` responses, five `409` responses, and exactly forty stored tickets.
4. The inaccessible Sociobot checkout was removed from product copy. A direct live check on 28 August 2026 returned `404 {"error":"enabled factory product","status":404}` for the advertised URL. Repository policy prohibits changing factory billing registration, so the product now honestly states that new license sales are unavailable while preserving existing-license verification and ten local presets. No unusable purchase is advertised.
5. `tsc --noEmit` now has the needed Vite/Node declarations and matched Playwright core version. Rust formatting is applied. Header and footer links have 44 px targets. History state stores scroll positions, and each route updates canonical, Open Graph, Twitter, title, and description metadata.

## Regression coverage

`tests/product.spec.ts` now covers direct-link 200 responses, metadata updates, offline reload after service-worker activation, Back-scroll restoration, 390 px touch targets, and the concurrent free-capacity boundary. The existing `@claim:free-capacity` test is now concurrent rather than sequential.

All eight claim commands were run individually and passed, including the updated concurrent capacity claim. `npm test` passed with **30/30** Playwright tests across desktop Chromium and a 390 px mobile project.

## Local verification

Completed from a clean `npm ci` install:

```text
npm ci                                                        PASS
npm test                                                      PASS (30/30)
npm run build                                                 PASS (dist/)
npx tsc --noEmit                                              PASS
cargo fmt --all -- --check                                    PASS
cargo clippy --all-targets --all-features -- -D warnings      PASS
cargo test --all-targets --all-features                       PASS (2/2)
cargo build --release                                         PASS
npm audit --audit-level=high                                  PASS (0 vulnerabilities)
```

The production release binary was also started locally with only `PORT=8080`. `/health` returned `{"status":"ok","build_sha":"dev"}`. Fresh document checks returned 200 for every public route above and 404 for `/missing`. `/opt/fleet/lib/verify-url.sh http://127.0.0.1:8080` passed with no browser console errors, one `h1`, `lang=en`, a `<main>`, and no missing image alt text. Playwright axe integration found no serious or critical violations at desktop and 390 px. The service-worker regression test uses a fresh context, waits for activation, turns the context offline, and reloads successfully.

Response-policy checks confirmed CSP, `nosniff`, strict-origin referrer policy, and immutable caching on the hero asset. The image is 46,170 bytes; current built JavaScript is 24.14 KB gzip and CSS is 3.96 KB gzip. Docker was unavailable in this worker image, so container-image construction could not be executed locally; the frontend build and Rust release binary both passed.

## Deployment

The repair is ready for the required container deployment. Post-deployment URL, build identity, and live verification will be appended after the final deploy.

## Remaining factory action

If paid sales are to be restored, a factory billing administrator must register/enable `in-class-draft-ticket` with Sociobot and then restore a checkout link only after its hosted checkout returns a successful redirect. This repository deliberately does not perform billing mutations.
