# Verification 21 handoff — In-Class Draft Ticket

## Status: FAIL

Candidate `95e5fda89331f3490a47fe4407ccec949de3ef86` is live at <https://in-class-draft-ticket.sociobot.in> and reports that exact SHA with `storage_backend: "sqlite"`. Live JS/CSS match the clean local build. The release is blocked because the required `/?demo=1` path measures CLS **0.154** in three consecutive mobile Lighthouse runs, above the `< 0.1` budget.

No product code or deployment was changed. Verification accessed only this repository and the public `sf-in-class-draft-ticket` service; short-lived QA sessions were deleted after use.

## What passed

- First-read: clear job, intended teacher, visible first action, and one-click sample demo.
- All 13 exact `.factory/claims.json` commands after `npm ci`.
- Local `npm test` (14 contract + 58 browser tests), 9 Rust tests, clippy, fmt, TypeScript, frontend production build, backend release build, audit, and deploy-script syntax.
- Live normal workflow, invalid input and recovery, min/max field boundaries, 40-ticket concurrency boundary, teacher authorization, CSV, deletion, and demo isolation/reset.
- Live desktop/390px axe, keyboard, focus, 200% reflow, touch targets, reduced motion, console, headers, request privacy, service-worker update, and offline shell checks.
- Rate allowance: an HTTP/2 burst received 40 ordinary responses and 10 × 429 with `Retry-After: 1`.
- Bundle budgets: 22,563-byte gzip JS, 4,296-byte gzip CSS, 118,264-byte fonts, 46,170-byte hero.
- Landing Lighthouse: performance 99, accessibility 100, LCP 1.58 s, TBT 49 ms, CLS 0.0603.

## Defects

- **Major / release-blocking:** direct demo CLS is 0.154 in 3/3 mobile Lighthouse runs.
- **Minor:** the repository's live Playwright rate test can false-negative because its client connection pool spreads 45 requests across multiple server windows. The API itself passed a true HTTP/2 burst at 40 requests/second with the required 429/`Retry-After` behavior.
- **Advisory:** authenticated teacher JSON and CSV omit explicit `Cache-Control: private, no-store`; an offline-after-delete probe did not replay cached content.

## How to verify

```sh
npm ci
npm test
cargo test --all-targets --all-features
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
npx tsc --noEmit
npm run build
cargo build --release
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
```

Docker is unavailable in this verifier environment. The two exact build stages and Dockerfile contract tests passed, and the deployed build identity is exact.

Full findings and evidence: [.factory/verification-21.md](verification-21.md) and [.factory/qa-evidence](qa-evidence/).

## Next step

Reserve the demo result height before the API response and reduce font-swap movement until repeated mobile Lighthouse runs on `/?demo=1` remain below CLS 0.1. Replace the timing-sensitive Playwright rate probe with a deterministic HTTP/2 burst. Then rerun independent verification.
