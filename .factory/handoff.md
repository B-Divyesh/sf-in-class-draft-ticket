# Verification 19 handoff

## Status

**FAIL — candidate `b0ce723b11f00169f5ca2cab5c00776d5ad22569` is publicly serving and functional, but the latest Azure revision is unhealthy and the claim registry is incomplete.**

Full evidence and commands are in [`.factory/verification-19.md`](verification-19.md).
No product code was changed.

## Release blocker

Fresh public identity checks passed 20/20 and reported the candidate SHA with
PostgreSQL. Fresh Azure control-plane evidence did not pass the candidate's own
release contract:

- latest requested revision: `sf-in-class-draft-ticket--0000055` — Unhealthy;
- latest ready revision: `sf-in-class-draft-ticket--0000054` — Healthy;
- `0000055` has only `PORT` and scale 1–3; `DATABASE_URL` is missing;
- the public URL is therefore still served by `0000054`.

`deployment/assert-containerapp.mjs` exits 1 on this current state. Reapply the
PostgreSQL secret binding and scale 1/1, then require latest = latest ready before
accepting the release.

The claims cross-check also found README/runtime promises that are tested only by
ordinary contract/unit tests and are absent from `.factory/claims.json`. Register
each claim with exactly one tagged sandbox test or remove the promise.

## What passed

- Every exact claim command: 10/10.
- `npm test`: 16/16 contract tests and 58/58 Playwright tests, locally and 58/58
  again against production.
- TypeScript, Rust format/clippy/unit tests, optimized Rust build, Vite production
  build, deployment script syntax, and production dependency audit.
- Cold first-read and one-click sample demo on desktop and 390px mobile.
- Independent keyboard teacher→student→teacher workflow, invalid-input recovery,
  minimum/maximum boundaries, fresh-context persistence, and 40 concurrent writes.
- Same-origin-only request logs, secure response headers, 40-request rate limit
  with 429 + `Retry-After: 1`, and no console/page errors.
- Zero serious/critical axe findings, visible focus, 200% reflow, reduced motion,
  ≥44px mobile targets, and no 390px horizontal overflow.
- PWA service-worker update and offline shell reload.
- Lighthouse mobile: 97 performance, 100 accessibility, 100 best practices, 100
  SEO; LCP 1.5 s, TBT 160 ms, CLS 0.06.
- Candidate and live HTML/JS/CSS SHA-256 bytes match.

## Commands to re-verify

```sh
npm ci
npm test
npx tsc --noEmit
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
npm run build
LIVE_EXPECTED_SHA=$(git rev-parse HEAD) LIVE_IDENTITY_SAMPLES=20 npm run verify:live-identity
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npm test
```

After fixing the live configuration, run the read-only Azure resource through
`deployment/assert-containerapp.mjs` and run the repository's restart-persistence
release gate. Docker/Podman/Buildah was not installed in this verifier container;
the two Docker build stages were verified directly instead.
