# Handoff — release-blocking QA repair 2

## Status: repaired and deployed

This repair addresses every release blocker in `.factory/verification-2.md` for candidate `1c406f30a3184432a600f636820238ff0e679f3c`.

The final repair candidate `9032efe389f5ef2e0d3c471aa51f36c174727ced` is deployed at <https://in-class-draft-ticket.sociobot.in> as Azure Container Apps revision `sf-in-class-draft-ticket--0000008`. Live `/health` returned that exact SHA.

## Repairs

- Replica-local persistence: production now has one SQLite writer and a dedicated read-write Azure Files volume mounted at `/app/data`. SQLite works only on local container disk. Every committed session, ticket, demo, deletion, and expiry is serialized, converted to a consistent local snapshot, fsynced, streamed to the durable share, and atomically renamed. Startup restores that checkpoint. This avoids unsupported SQLite locks and `copy_file_range` operations on Azure Files.
- Deployment topology: `deployment/containerapp-contract.json` records `minReplicas: 1`, `maxReplicas: 1`, the `session-data` volume, `/app/data` mount, and `PORT` as the sole required runtime variable. A Node contract test prevents drift.
- Rust image contract: the backend stage now uses `rust:1-alpine`, not a pinned minor version.
- Cold claim startup: `npm test` builds the Rust binary before Playwright starts its 30-second server timer. The server command runs the prebuilt binary.
- Regression depth: a Rust restart test proves checkpoint restoration. Browser coverage now checks every public route at desktop and 390 px for axe serious/critical findings, overflow, and console errors. The Playwright config can run unchanged against production with `PLAYWRIGHT_BASE_URL`.

The first direct Azure Files attempts failed safely before receiving traffic. Their inactive revisions wrote only zero-byte temporary files; those files were removed. No user or session data was removed.

## Clean local verification

- `npm ci` — PASS, 50 packages, zero vulnerabilities.
- `cargo clean && npm test -- --grep @claim:sample-demo` — PASS from a cold 1.2 GiB target. Rust compiled in 70 seconds before Playwright's timer; 2/2 browser projects passed.
- Every other exact command in `.factory/claims.json` — PASS independently, 2/2 browser projects each.
- `npm test` — PASS, 32/32 browser tests plus 3/3 release-contract tests; covers desktop, 390 px mobile, keyboard/focus, all-route axe scans, no console errors, privacy request boundaries, CSV, atomic 40-ticket capacity, teacher/student flow, deep links, metadata, service-worker install/update, and offline reload.
- `npx tsc --noEmit` — PASS.
- `cargo fmt --all -- --check` — PASS.
- `cargo test --all-targets --all-features` — PASS, 3/3, including durable checkpoint restoration.
- `cargo clippy --all-targets --all-features -- -D warnings` — PASS.
- `cargo build --release` — PASS.
- `npm audit --audit-level=high` — PASS, zero vulnerabilities.
- Zero-config release startup — PASS with only default `PORT`; startup logged the storage source without exposing secrets. A created session survived graceful stop/restart.
- Local response/load smoke — PASS: 100 concurrent API requests completed in 395 ms; CSP, `nosniff`, strict-origin referrer policy, and immutable asset caching were present.
- Factory URL verifier — PASS: 683 ms live load, no console errors, title, `lang=en`, one `h1`, `main`, image alt text, and button labels.
- Lighthouse mobile — Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.35 s, LCP 1.88 s, TBT 0 ms, CLS 0.029.
- Bundles — JavaScript 23,832 bytes gzip; CSS 14,344 bytes raw; fonts 118,264 bytes total; all budgets pass.
- Container build — PASS in ACR build `chn0`; runtime image digest `sha256:274d2cba785d9e8d36095ffea12e93c85fe8f3595b2649fae9839b49750c7688`.

## Live verification

- Full production Playwright run: `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test` — PASS, 32/32 across desktop Chromium and Pixel 5.
- Durable restart: created session `7ZHCET` with one ticket, confirmed a 126,976-byte durable checkpoint, forcibly restarted revision `0000007`, then received 200 from the student route and the same one ticket from the authenticated teacher route. Cleanup returned 204.
- Cross-revision restore: session `TYPMD3` was created on revision `0000007`, then returned 200 through both student and authenticated teacher APIs after revision `0000008` replaced it. Cleanup returned 204.
- Distribution check: a fresh session returned 50/50 student reads and 30/30 authenticated teacher reads as 200. Authenticated delete returned 204 and the next read returned 404.
- Rate limiting: a 100-request concurrent burst from one forwarded client returned 10 rate-limited responses; every 429 included `Retry-After: 1`. The full browser regression also passed its 45-request rate test.
- Routes: `/`, `/demo`, `/join`, `/start`, `/privacy`, `/terms`, `/session/ABCDEF`, and `/teacher/ABCDEF` returned 200; `/missing` returned the styled 404.
- Runtime configuration: only `PORT=8080`; scale is exactly one replica; `session-data` is mounted at `/app/data` from `in-class-draft-ticket-data`.
- Accessibility/privacy/offline: both viewports and all public routes passed axe serious/critical checks, keyboard/focus checks, same-origin-only privacy logging, service-worker install/update, and offline reload with no console errors.
- Evidence: `.factory/evidence/repair-2/` contains the live URL-verifier JSON, desktop/mobile screenshots, HTML, and health response headers/body.

## Known gaps and next steps

No release-blocking gaps remain. SQLite intentionally limits this low-volume classroom tool to one application replica. Any future deployment must preserve `deployment/containerapp-contract.json`; scaling above one replica requires migration to a managed shared database rather than another local SQLite file.
