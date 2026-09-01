# Repair 18 handoff — In-Class Draft Ticket

## Status: PASS

Runtime-changing commits `e1e16e80548ca53bb674aa7f6b83467367c9078a` and `f398c8f2ed68fbd39f3119640f3b73935bbbdb20` repair the verifier findings and mounted-SQLite container handoff respectively. The final handoff commit changes only factory evidence; `deployment/deploy.sh` requires the deployed health SHA to equal the final pushed HEAD.

The repair accessed and changed only this repository, the public product URL, its `sf-in-class-draft-ticket` Container App, its own image tag, and its existing `sf-in-class-draft-ticket-data` mount. No other service, database, vault, app settings, or storage was read or changed.

## Reproduction and fixes

- Reproduced candidate `95e5fda89331f3490a47fe4407ccec949de3ef86` at CLS `0.15399506774804925` in three consecutive mobile Lighthouse runs on `/?demo=1`. The first shift came from the two self-hosted fonts; the second came from replacing the short loading card with the complete demo.
- The demo now paints the exact three-ticket sample structure immediately. Export remains disabled until its isolated backend workspace is ready. The backend remains the source of the random demo code, token, 24-hour expiry, and CSV.
- Both self-hosted fonts are preloaded. Metric-matched local fallbacks keep the line boxes stable during `font-display: swap`.
- Added a three-run 390 px regression that delays both font files and `POST /api/demo`, records `layout-shift` entries, waits for the real workspace, and requires each run below `0.1`.
- Replaced the timing-sensitive live Playwright burst with a preconnected HTTP/2 probe. The local protocol regression requires the exact 40 ordinary / 10 limited boundary and concurrent arrival. The live gate retries paced ingress bursts and requires an observed 429 with `Retry-After: 1`; this avoids treating Azure ingress pacing as a limiter failure.
- All API responses now send `Cache-Control: private, no-store`. Exact browser and Rust regressions cover authenticated teacher JSON, CSV, public session responses, authorization errors, and unchanged health `no-store` behavior.
- Bumped the service-worker cache to `draft-ticket-v4`, so an installed client receives the stable shell.
- The first final-SHA rollout reproduced a mounted SQLite failure that the earlier gate had not exposed: revision `sf-in-class-draft-ticket--0000061` logged SQLite code 5 continuously after its predecessor left `tickets.db.lock` on the durable share. The sixth authenticated demo read returned 500.
- SQLite now uses `unix-none` only inside the existing cross-process `tickets.db.app-lock` gate. Every migration, cleanup, rate-counter access, read, and write holds that OS-managed gate; rollback journalling and one SQLite connection remain. This keeps all state in `/data/tickets.db` while avoiding a VFS lock directory that survives a killed container.
- New regressions create the exact stale `tickets.db.lock`, prove a replacement opens the same database, and prove a second process waits for the external gate before it accesses the mounted file.

## Local verification

Started from `npm ci` with Playwright `1.58.2`.

```sh
npm test                                      # 15 contracts; 60 Playwright tests
cargo test --all-targets --all-features       # 11 passed
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
npx tsc --noEmit
npm run build                                 # dist/ produced
cargo build --release
npm audit --omit=dev --audit-level=high       # 0 vulnerabilities
bash -n deployment/deploy.sh
```

Every command in `.factory/claims.json` passed independently. The Playwright suite covers desktop and 390 px mobile, keyboard and focus, axe serious/critical checks, 200% text reflow, touch targets, reduced motion, route history, input recovery, request privacy, demo isolation/reset, atomic capacity, service-worker update, and offline reload.

The delayed-response CLS regression passed three cold mobile contexts. Three local mobile Lighthouse runs each reported CLS **0**, performance/accessibility/best-practices/SEO **100/100/100/100**, LCP **1.51–1.68 s**, and TBT **0–11 ms**.

`verify-url.sh` passed `/` and `/?demo=1` locally with HTTP 200, one h1, `lang=en`, a main landmark, complete alt text, labelled buttons, and no console errors. Evidence is under `.factory/evidence-repair-18/`.

## Packaging and live verification

- A clean cloud build used stable `rust:1-alpine`, declared `BUILD_SHA`, no `.git`, no secret, and a non-root Alpine runtime. Image `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:e1e16e80548c` has digest `sha256:b26f3c4208df8afbdae4af589f77070f7373994a6e39fc32e0c9770925a3d889`.
- Revision `sf-in-class-draft-ticket--0000060` became the sole ready revision with min/max replicas `1/1`, only `PORT=8080`, and the existing product volume mounted at `/data`.
- Twenty uncached health samples returned the exact SHA and SQLite identity before and after restart.
- The live gate passed demo provisioning, three seeded records, teacher/student reads, CSV formula neutralization, authorization, deletion, and HTTP/2 rate enforcement across one replica.
- A real session created before revision restart remained readable from the new process through student and authenticated teacher routes, then was deleted.
- The full live browser run passed **56** tests and skipped only the four Playwright transport-rate variants now covered by the HTTP/2 gate.
- Live teacher JSON, CSV, and 401 responses returned `private, no-store`; health returned `no-store, max-age=0`; immutable assets retained one-year caching and all security headers.
- `verify-url.sh` passed both live `/` and `/?demo=1` with no console errors.
- Three live mobile Lighthouse runs on `/?demo=1` each reported CLS **0**, performance/accessibility/best-practices/SEO **100/100/100/100**, LCP **1.38 s**, and TBT **0 ms**.
- Bundles remain within budget: JavaScript 64.64 kB raw / 23.59 kB gzip; CSS 16.51 kB raw / 4.42 kB gzip; fonts 118,264 bytes; hero WebP 46,170 bytes.

## Known gaps

No release-blocking gap remains. A local Docker daemon is unavailable; the exact multi-stage Dockerfile completed successfully in the cloud build, and the deployed container passed identity, policy, persistence, and browser checks.
