# Handoff — release-blocking QA repair 3

## Status: repaired, verified, and deployed

This repair addresses every finding in `.factory/verification-3.md` for candidate `e267a8283bef762a94f283d6d8287c1f80e59e57`. The final candidate is the commit containing this handoff. The product-specific deploy path embeds that full commit in `/health`, and the final live identity was checked after deployment.

## Repairs

- Production topology: `deployment/deploy.sh` now builds the committed source in ACR and atomically applies the checked-in container contract through `deployment/render-containerapp.mjs`. It cannot call the generic three-replica deployer. The live app has exactly one replica and an Azure Files volume mounted at `/app/data`.
- Durable classroom state: the existing local-SQLite plus durable-checkpoint design is now actually present in production. A fresh session and ticket survived a forced live revision restart.
- Rate-limit identity: the backend keys on the ingress-appended end of `X-Forwarded-For`, not the user-controlled beginning. A Rust unit test and browser regression cover the parsing rule. Rotating attacker prefixes no longer creates new buckets.
- Claim depth: retention now covers all three choices and observes automatic expiry cleanup with a debug-only accelerated clock. Presets cover ten saves plus a rejected eleventh. Teacher control covers unauthenticated and authenticated read, CSV export, and deletion.
- Test isolation: the 40-ticket capacity test is paced below the independent request-rate boundary. This lets the production matrix prove capacity without treating its two browser workers as different clients.
- Mobile accessibility: the wordmark/home link now has a 44 px minimum target, and its computed height is part of the mobile regression.
- Copy audit: `.factory/copy-audit.md` now records the current existing-license and unavailable-sales copy. Removed price and checkout text is gone.

## Clean local verification

- `npm ci` — PASS; 50 packages, zero vulnerabilities.
- Every exact command in `.factory/claims.json` — PASS independently; 2/2 browser projects for each of eight claims.
- `npm test` — PASS; 34/34 Playwright tests and 5/5 release-contract tests.
- `npx tsc --noEmit` — PASS.
- `cargo clean` followed by `cargo test --all-targets --all-features` — PASS; 4/4 tests.
- `cargo fmt --all -- --check` — PASS.
- `cargo clippy --all-targets --all-features -- -D warnings` — PASS.
- `cargo build --release` — PASS.
- `npm run build` — PASS; `dist/` produced.
- `npm audit --audit-level=high` — PASS; zero vulnerabilities.
- Zero-config release startup with only `PORT` — PASS. Startup logged default storage selection without a secret, and graceful shutdown completed.
- Local load smoke — PASS; 100/100 API reads returned the expected status in 214 ms.
- Local response policy — PASS; CSP, `frame-ancestors 'none'`, `nosniff`, and strict-origin referrer policy were present.
- Bundles — JavaScript 23,832 bytes gzip; CSS 3,968 bytes gzip; fonts 118,264 bytes; hero WebP 46,170 bytes. All budgets pass.

## Live verification

- Deployment state — PASS: `minReplicas: 1`, `maxReplicas: 1`, one running replica, `session-data` Azure Files volume, `/app/data` mount, and only `PORT=8080` in the container environment.
- Full production browser matrix — PASS; 34/34 across desktop Chromium and Pixel 5/390 px.
- Fresh demo repetition — PASS; 9/9 isolated browser contexts loaded exactly three sample tickets in one click.
- Session distribution — PASS; a fresh ticket returned 30/30 student reads and 30/30 authenticated teacher reads.
- Teacher privacy — PASS; export returned 401 without the private token and 200 with it. Authenticated deletion returned 204 and the next student read returned 404.
- Durable restart — PASS; after forcing the active revision to restart, the same student and authenticated teacher reads both returned 200 with the saved ticket.
- Rate limiting — PASS. A fixed 45-request burst returned 40 ordinary responses and 5 × 429. A second burst with 45 different user-supplied forwarding prefixes returned the same 40/5 split. Every 429 had `Retry-After: 1`.
- Factory URL verifier — PASS in 604 ms; no console errors, correct title and language, one `h1`, `main`, image alt text, and labeled buttons.
- Accessibility and keyboard — PASS; all public routes at both viewports had zero serious/critical axe findings, no overflow, visible skip-link focus, route-change focus, no traps, reduced-motion behavior, and 44 px mobile navigation targets.
- Privacy and offline/update — PASS; same-origin-only request logging, no media calls, service-worker install/update, and offline reload all passed.
- Response policy and routing — PASS; public/deep routes, styled 404, canonical metadata, security headers, and immutable asset caching passed with no console or page errors.
- Lighthouse mobile — Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.5 s, TBT 90 ms, CLS 0.029.
- Evidence is in `.factory/evidence/repair-3/`: desktop and 390 px screenshots, fetched HTML, URL-verifier JSON, and health body/headers.

The first post-repair live matrix correctly showed that the old concurrent capacity test collided with the newly trustworthy per-client limiter. The test was paced below 40 requests per second, rerun locally and live, and then the complete live matrix passed.

## Known gaps and next steps

No release-blocking gaps remain. This low-volume SQLite service intentionally has one application replica. Future deployments must use `deployment/deploy.sh`. Scaling above one replica requires shared persistence and a shared rate-limit store rather than changing the replica count.
