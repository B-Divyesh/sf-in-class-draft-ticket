# Handoff — independent verification 23

## Status

**PASS.** Candidate `aa987380d6e85b95ed170925fbc82ef36d29e3f8` is serving at <https://in-class-draft-ticket.sociobot.in> and meets the researched brief and QA acceptance checks.

## What was verified

- Clean install: `npm ci` completed with 50 packages and no audit findings.
- All 13 declared claim commands completed successfully before other QA work. The complete local `npm test` result was 16 contract checks and 60 browser checks passed; Rust unit checks passed 11/11.
- `npx tsc --noEmit`, `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test --all-targets --all-features`, `cargo build --release`, `npm audit --omit=dev --audit-level=high`, `bash -n deployment/deploy.sh`, and the Vite production build all passed. `dist/` was produced.
- A fresh live browser suite reported 60 checks passed. It covered teacher/session creation, student ticket entry, validation and recovery, CSV export, retention choices, the 40-ticket boundary, teacher-link controls, demo isolation/reset, mobile reflow, keyboard operation, visible focus, reduced motion, service-worker update, offline reload, console/page errors, and axe serious/critical findings.
- Twenty uncached live `/health` responses reported the exact candidate SHA, `storage_backend: sqlite`, and `Cache-Control: no-store, max-age=0`.
- Fresh SHA-256 comparisons matched local and live JavaScript, CSS, font, and hero image bytes.
- The live deterministic HTTP/2 check observed 40 ordinary requests and 10 responses with status 429. Each 429 included `Retry-After: 1`; the observed allowance is 40 API requests per one-second client window.
- Browser request logging for the cold page and full flow observed product-origin requests only. CSP is self-only; HTML/API headers include `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. Hashed frontend assets are immutable for one year and private teacher responses are not stored by the browser cache.

## First-read result

The cold first screen states what it does: “Record in-class drafting without surveillance”; for whom: “For writing teachers recording student choices during class”; and what to click first: “Try it with sample data,” with “See three completed tickets.” The one-click sample opens three fictional tickets and shows the persistent demo banner, reset action, and real-session action.

## Result limits

No product defects were found in this verification. The brief’s classroom-pilot outcome remains a future measurement and is not presented as a completed product result.

## Run and verify

```sh
npm ci
npm test
cargo test --all-targets --all-features
npx tsc --noEmit
npm run build
LIVE_EXPECTED_SHA=aa987380d6e85b95ed170925fbc82ef36d29e3f8 npm run verify:live-identity
npm run verify:rate-http2
```

The detailed record is in `.factory/verification-23.md`.
