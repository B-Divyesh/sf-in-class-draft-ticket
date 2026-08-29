# Handoff — perfection-loop polish round 1

## Status

PASS. Every finding in `.factory/review-1.md` is resolved. There are no known gaps or deferred minor items.

The repaired product is live at <https://in-class-draft-ticket.sociobot.in>. The implementation repair is `9910a3ea820fd6bd60bb3f05dfeebd8aeeff78f7`; its live health response reports that SHA and PostgreSQL storage. `.factory/polish-1.md` maps every finding to its change and evidence.

## What changed

- Registered and tested the no-AI-detection, no-authorship-verdict, free, no-account, and no-payment boundaries.
- Made `/?demo=1` the one-click sample path while retaining `/demo` compatibility.
- Verified demo-only storage, a new ephemeral workspace on reset, and demo removal on Start for real.
- Rebuilt the true 404 document with the shared product shell, legal links, metadata, icons, and original visual language.
- Kept all four header links visible at 390 px with 44 px touch targets and no overflow.
- Rewrote the two overlong README sentences and the three vague landing labels.
- Added the 64-character verb-first catalog description.
- Preserved the Rust/axum + PostgreSQL container deployment and the “working constellations” visual identity.

## Verification

From a clean clone of `9910a3ea820fd6bd60bb3f05dfeebd8aeeff78f7` on 29 August 2026 UTC:

- `npm ci` — passed; 0 vulnerabilities.
- Every command in `.factory/claims.json` — passed separately. Nine browser claims passed in both desktop and mobile Chromium; the production topology claim passed its contract test.
- `npm test` — passed: 12/12 release contracts and 52/52 Playwright tests.
- `npx tsc --noEmit` — passed.
- `cargo fmt --all -- --check` — passed.
- `cargo clippy --all-targets --all-features -- -D warnings` — passed.
- `cargo test --all-targets --all-features` — passed: 8/8.
- `cargo build --release` — passed.
- `npm run build` — passed and produced `dist/`.
- `npm audit --audit-level=high` — passed; 0 vulnerabilities.

The browser suite covers the complete teacher/student flow, query demo/reset/exit, CSV, retention, capacity, teacher authorization, privacy requests, no detection or verdict path, no-account operation, 390 px layout, 200% text reflow, 44 px targets, keyboard navigation, focus restoration, axe scans, offline reload, titles, metadata, direct 404, legal links, headers, and rate limiting.

Local and live `/opt/fleet/lib/verify-url.sh` checks passed with one h1, `lang=en`, main landmark, complete alt text, labelled buttons, and no console errors. Live Lighthouse scored 99 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO. FCP was 1.2 s, LCP 1.5 s, TBT 40 ms, and CLS 0.059. Initial JavaScript is 61.90 kB raw / 22.51 kB gzip; CSS is 15.06 kB raw / 4.09 kB gzip.

## Deployment evidence

The repair was built by ACR run `ch131` as `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:9910a3ea820f`, digest `sha256:e4ae4fbdd92b1dc211f499efcdba7082ade9a24f121e02f83e8c8d3e455a6f88`.

The repository deploy gate confirmed one PostgreSQL-backed replica, fresh-browser demo and real workflows, 40 requests per second followed by 429 responses with `Retry-After: 1`, and session persistence across a real revision restart. The full live Playwright suite then passed 52/52. Cold root, query-demo, and 404 evidence is under `.factory/evidence/polish-1/`.

## Run and deploy

```sh
npm ci
npm test
npx tsc --noEmit
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-targets --all-features
cargo build --release
npm run build
```

Authorized factory workers deploy a clean, pushed `main` with `deployment/deploy.sh`. It refuses success unless the exact commit passes the PostgreSQL topology, browser-flow, rate-limit, and revision-restart gates.

## Known gaps and next steps

None.
