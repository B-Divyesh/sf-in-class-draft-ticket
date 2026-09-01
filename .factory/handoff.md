# Verification 22 handoff — In-Class Draft Ticket

## Status: PASS

Independent product QA passed for candidate `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf` at <https://in-class-draft-ticket.sociobot.in> on 1 September 2026 UTC.

No product code, deployment, cloud configuration, or external service was changed. Verification used this clean repository and the public product URL only. Temporary QA sessions were deleted.

## What was verified

- All 13 commands in `.factory/claims.json` passed after `npm ci`.
- `npm test` passed 15 contract and 60 Playwright tests.
- Rust tests, strict clippy, rustfmt, TypeScript, frontend production build, backend release build, production dependency audit, and deployment script syntax passed.
- The live health identity matched the candidate in 20/20 uncached samples; deployed JS, CSS, art, and fonts matched local bytes.
- The complete teacher → student → teacher → CSV → delete workflow passed with normal, boundary, invalid, recovery, concurrency, and persistence cases.
- The live API enforced 40 requests per one-second client window, then returned 429 with `Retry-After: 1`.
- Desktop and 390px mobile checks passed for keyboard use, focus, 200% reflow, 44px controls, reduced motion, axe, console, request privacy, headers, caching, service-worker update, and offline shell reload.
- The first-read and one-click sample gate passed.
- Fresh Lighthouse: landing 98/100/100/100; three demo runs 100/100/100/100, CLS 0, LCP 1.37–1.44 seconds.

Full evidence and exact results are in [verification-22.md](verification-22.md). Current captures and Lighthouse JSON are under `.factory/qa-artifacts/`.

## Run again

```sh
npm ci
npm test
cargo test --all-targets --all-features
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
npx tsc --noEmit
npm run build
cargo build --release
npm audit --omit=dev --audit-level=high
```

Live identity and allowance checks:

```sh
LIVE_EXPECTED_SHA=e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf npm run verify:live-identity
npm run verify:rate-http2
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
```

## Known limits and next step

- No Docker-compatible runtime was available in this verifier. Direct build stages, Dockerfile contract tests, and matching live identity passed.
- The brief's five-class success measure needs a real teacher pilot; it is not a release gate claimed by the interface.

Release the tested candidate, then use a five-class pilot to measure completion time and whether the tickets improve feedback.
