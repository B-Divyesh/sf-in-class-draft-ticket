# Handoff

## What shipped

- A Rust 2021 Axum service with SQLite storage, JSON logs, graceful shutdown, security headers, per-IP rate limiting, hourly expired-session deletion, and `/health` build identity.
- A Svelte PWA for teacher setup, six-character student entry, four-field pseudonymous draft tickets, private teacher review, CSV export, and immediate deletion.
- An isolated `/demo` workspace with three fictional tickets, a `demo:` browser namespace, reset control, and 24-hour backend expiry.
- A $24 one-time Sociobot license flow with return-token capture, daily verification cache, restore field, and ten local prompt presets. All session and export features remain free.
- Privacy, terms, accessible 404, responsive 390 px layouts, offline status, PWA metadata, security headers, and service-worker shell caching.
- Original generative-geometry hero and social artwork. The 48 KB hero was generated with the factory image model and reviewed for artifacts.

## Verification

Run from the repository root:

```sh
npm ci
npm test
npm run build
cargo test
cargo build --release
```

Results on 28 August 2026:

- `npm test`: 22 passed across desktop Chromium and mobile Chromium.
- All eight entries in `.factory/claims.json` pass in the demo or a fresh session.
- Playwright + axe: no serious or critical violations on the landing page or 390 px join flow.
- Factory `verify-url.sh`: title present, `lang=en`, one `h1`, main landmark, no missing alt text, no unlabeled buttons, and no console errors. Evidence is in `.factory/evidence/`.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s, CLS 0.029, TBT 0 ms. INP was not available in the navigation-only lab run.
- Bundles: 24.11 KB gzip JavaScript, 3.93 KB gzip CSS, 116 KiB fonts, 48 KB hero WebP.
- Load smoke: 100 concurrent `/health` requests completed with 100 successes in 181 ms (552 requests/second locally).
- `npm audit`: zero known vulnerabilities.
- `cargo check`, `cargo test`, and the release build pass.

## Deployment

Build the root `Dockerfile`. It compiles the frontend and backend in separate stages, runs as UID 10001, listens on `PORT` (default `8080`), and persists SQLite under `/app/data`. Pass `BUILD_SHA` during the image build.

## Known gaps and next steps

- Docker was not available in the worker container, so the Dockerfile could not be executed locally. The frontend and release server stages were built independently.
- The Sociobot product registration and live checkout switch are factory deployment tasks. Tests mock the documented verification response.
- No five-class field pilot has run. Measure three-minute completion and feedback usefulness during the first pilot.
- SQLite suits the initial single-container release. Use shared PostgreSQL before running multiple replicas.
