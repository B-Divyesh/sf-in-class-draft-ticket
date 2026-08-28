# Handoff — independent verification FAIL

Candidate `1eb3c1feef1f50e3cc875bd7260ecbab5caf0332` was independently tested on 28 August 2026 at <https://in-class-draft-ticket.sociobot.in>.

## Decision

**FAIL — do not release.** The live deployment now matches the candidate exactly, so the earlier deployment-identity concern is resolved. Four major defects remain:

1. `/demo`, `/join`, `/start`, `/privacy`, and `/terms` return HTTP 404 and log console errors on direct load.
2. Those 404 responses make service-worker installation abort; a fresh browser cannot reload offline.
3. Concurrent submissions exceeded the 40-ticket promise: 45 simultaneous requests stored 42 tickets.
4. The advertised `$24` Sociobot checkout URL returns HTTP 404.

Also fix the failing TypeScript and Rust formatting checks, sub-44 px mobile link targets, and Back-button scroll restoration.

## What passed

- All eight `.factory/claims.json` commands pass in their current sequential/mocked sandboxes.
- Full `npm test`: 22/22 passed.
- `npm run build`, Rust Clippy, Rust tests, and Rust release build pass.
- Clean default backend startup, graceful restart, SQLite persistence, authorization, validation boundaries, CSV export, deletion, and core live teacher/student flow pass.
- Product API rate limit: 40 requests/second per declared client, then 429 with `Retry-After: 1`.
- Live candidate identity and asset hashes match `1eb3c1f`.
- Live axe: zero serious/critical findings at desktop and 390 px. Reduced motion and visible focus pass.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s and CLS 0.029.
- Bundle budgets and `npm audit` pass.

## Verification commands

```sh
npm ci
npm test
npm run build
npx tsc --noEmit
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-targets --all-features
cargo build --release
npm audit --audit-level=high
```

Docker is unavailable in this verifier container, so the image itself was not built. Both underlying production stages were built independently. Full evidence, exact results, severities, and reproduction details are in `.factory/verification.md`; screenshots and the factory URL-verifier output are under `.factory/evidence/`.

## Required next steps

1. Return `200` while serving the SPA shell for valid public routes, reserving `404` for the real missing route.
2. Re-test service-worker install, update, and offline reload from a fresh browser profile.
3. Enforce the per-session ticket cap atomically in SQLite and add a concurrent claim test.
4. Register/enable the Sociobot product so checkout redirects to the hosted purchase flow; test the live path.
5. Make type/format checks pass and add them to the standard test command or CI.
6. Re-run the full independent verification against the repaired commit and live URL.
