# Independent verification 16 handoff

## Status

**FAIL — production does not match the candidate commit.**

- Candidate: `9f669994fc14775c69e2daf3a400e5cd5b4de2a0`
- URL: <https://in-class-draft-ticket.sociobot.in>
- Fresh live `/health`: build `8f17bd2d94dfb72a9be7e819d324d63df30114d2`,
  PostgreSQL, HTTP 200, `Cache-Control: no-store, max-age=0`
- Required fix: deploy the candidate and verify the full `/health.build_sha`
  equals `9f669994fc14775c69e2daf3a400e5cd5b4de2a0`

This is the sole release blocker. Live HTML, JS, and CSS are byte-identical to
the candidate because the intervening commit contains only `.factory`
documentation and evidence, but the exact deployed build identity requirement
is still unmet.

## Verification summary

- First-read and one-click sample demo: PASS
- All ten `.factory/claims.json` tests: PASS after `npm ci`
- Local contracts/browser suite: PASS, 14/14 and 56/56
- Live browser suite: PASS, 56/56
- Rust formatting, clippy, tests, and optimized build: PASS
- TypeScript, Vite production build, and npm audit: PASS
- Privacy request log and response headers: PASS
- Desktop, 390 px mobile, keyboard, 200% text, reduced motion, and axe: PASS
- Service-worker install/update/offline reload: PASS
- Backend concurrency, restart persistence, validation, health, and deletion: PASS
- Live rate limit: 40 requests/client/second, then 429 with `Retry-After: 1`
- Lighthouse mobile: 99 performance / 100 accessibility / 100 best practices /
  100 SEO; LCP 1.5 s, TBT 40 ms, CLS 0.06

Full command-level evidence and the defect table are in
`.factory/verification-16.md`. No product code was changed.

---

# Prior handoff: polish round 3

## Status

**PASS — zero unresolved findings.** Every finding from `.factory/review-1.md`, `.factory/review-2.md`, and `.factory/review-3.md` is mapped to a repair and current evidence in `.factory/polish-3.md`.

## What changed

- Removed the production-mutating `production-topology` entry from `.factory/claims.json`.
- Deleted `deployment/test-production-topology.mjs`, which made a live deployment look like a sandbox test.
- Exposed the live operation only as `npm run deploy:release` and labelled it clearly in README.
- Added `every product claim runs in a clean local sandbox`. It rejects claim commands that mention deployment, Azure, the live verifier, or the live domain.
- Kept all ten user-facing claims, each with exactly one observable regression test.
- Updated the catalog line to “Record four in-class drafting choices without surveillance.” It is verb-first and 59 characters.
- Updated the round-3 copy audit and retained the working-constellations visual system.
- Rechecked every earlier copy, demo, storage, routing, metadata, accessibility, mobile, privacy, offline, and 404 repair.

## Exact verification

Deployed candidate: `8f17bd2d94dfb72a9be7e819d324d63df30114d2`.

Clean clone: `/tmp/in-class-polish3-clean-8f17bd2`.

```text
npm ci: PASS, 0 vulnerabilities
Every .factory/claims.json command: PASS (10/10)
npm test: PASS (14 release contracts, 56 browser tests)
cargo fmt --check: PASS
cargo clippy --all-targets --all-features -- -D warnings: PASS
cargo test: PASS (9/9)
cargo build --release: PASS
npx tsc --noEmit: PASS
npm run build: PASS
Initial JS: 63.01 kB raw / 22.87 kB gzip
CSS: 16.05 kB raw / 4.29 kB gzip
Local factory URL verifier: PASS, no console errors
Local axe: PASS, 0 violations
Local load smoke: PASS, 100/100 concurrent health requests returned 200
Live Playwright: PASS (56/56)
Live factory URL verifier: PASS on / and /?demo=1
Live axe: PASS, 0 violations on / and /?demo=1
Live Lighthouse mobile: 99 performance / 100 accessibility / 100 best practices / 100 SEO
Lighthouse metrics: FCP 1.2 s, LCP 1.5 s, TBT 30 ms, CLS 0.061
```

The exact clean-clone claim matrix is in `.factory/polish-3.md`. It includes demo isolation, CSV, four-field pseudonymous submission, retention, capacity, request privacy, stored-data minimization, no detection/verdict, no-account flow, and teacher-only controls.

## Deployment and live check

- Release command: `npm run deploy:release`
- ACR run: `ch17s`
- Image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:8f17bd2d94df`
- Digest: `sha256:54904c8bb3a26d9169da9ad686ca3f0e9798702ba781b754d8cba8fa98e70ae9`
- `/health`: full candidate SHA, `status: ok`, `storage_backend: postgres`
- Deployment gate: one ready PostgreSQL-backed replica, fresh-browser demo and real flows, CSV hardening, deletion, rate limiting, and persistence after an actual replacement replica

The first ACR attempt (`ch17r`) stopped before compilation when Docker Hub returned 502 for `rust:1-alpine`. The immutable retry (`ch17s`) succeeded; no failed attempt changed the live revision.

After deployment, the site was opened cold at 390×844 and 1440×900. The landing facts, one-click `?demo=1` path, completed Blue Finch ticket, persistent demo banner, Reset demo, Start for real, mobile navigation, privacy inventory, legal links, route titles, focus, and designed 404 were all rechecked. The live 56-test suite then passed.

Evidence:

- `.factory/evidence/polish-3-live-root/`
- `.factory/evidence/polish-3-live-demo/`
- `.factory/evidence/polish-3-live-404-mobile.png`
- `.factory/evidence/polish-3-live-privacy-mobile.png`
- `.factory/evidence/polish-3-local/`

## Run and verify

```sh
npm ci
npm test
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
```

Open `/?demo=1` for the isolated sample. Use **Reset demo** for a fresh sample and **Start for real** to discard only the demo reference.

## Known gaps and next steps

None for the brief or cumulative review findings. No action is deferred.
