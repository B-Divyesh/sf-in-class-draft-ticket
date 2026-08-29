# Independent verification 17 handoff

## Status

**PASS — candidate `cb7a010d3ab5cc304821e75d5db348d350dd8278` is deployed and meets the acceptance contract at <https://in-class-draft-ticket.sociobot.in>.**

Fresh evidence: all ten exact claim commands passed after `npm ci`; local
`npm test` passed 15 release-contract and 56 browser tests; TypeScript,
formatting, clippy, Rust unit tests, optimized build, Vite build, and audit all
passed. The live 56-test browser suite passed across desktop and 390px mobile.
Twenty cache-busted health samples reported the exact candidate SHA and
PostgreSQL. Live HTML/JS/CSS hashes equal the candidate build.

The cold first screen explains what the product does, who it is for, and makes
**Try it with sample data** the first action. A fresh demo loaded its three
fictional tickets, retained only `demo:workspace`, and made same-origin
requests only. The live rate boundary is 40 API requests/client/second; five
subsequent requests returned 429 with `Retry-After: 1`.

Accessibility, privacy, headers, caching, PWA/offline, keyboard/reduced
motion, and performance passed. Fresh Lighthouse: 99 performance, 100
accessibility, 100 best practices, 100 SEO. No defects remain. See
`.factory/verification-17.md` for exact commands and evidence. Docker/Podman
were unavailable in this verifier container; the Rust release build and live
managed deployment were verified instead.

No product code was changed during this verification.

---

# Repair 13 handoff — production identity

## Status

**PASS after the final handoff commit is deployed.** Verification 16's only
release blocker, B-16-1, is repaired and covered by an executable regression.
No product source, schema, visual asset, claim, or previously passing behavior
changed from candidate `9f669994fc14775c69e2daf3a400e5cd5b4de2a0`.

This handoff records the first immutable repair deployment. Because recording
that receipt creates a documentation-only commit, the worker deploys the final
clean, pushed handoff commit as its last tracked operation and then checks its
full SHA. Do not add a tracked commit after that deployment.

## Finding reproduced

At `2026-08-29T22:34:01.867Z`, 20 concurrent, cache-busted production health
requests returned HTTP 200 and `Cache-Control: no-store, max-age=0`, but every
response reported:

```json
{
  "build_sha": "8f17bd2d94dfb72a9be7e819d324d63df30114d2",
  "status": "ok",
  "storage_backend": "postgres"
}
```

The required verifier candidate was
`9f669994fc14775c69e2daf3a400e5cd5b4de2a0`. The new command reproduced the
failure directly:

```text
LIVE_EXPECTED_SHA=9f669994fc14775c69e2daf3a400e5cd5b4de2a0 npm run verify:live-identity
live build identity mismatch on request 1: expected 9f669994..., received 8f17bd2...
exit 1
```

Root cause: `8f17bd2…` was deployed, then `9f66999…` added only `.factory`
documentation and evidence. The unchanged HTML, JavaScript, and CSS hashes hid
the fact that the candidate commit itself had never been deployed.

## Repair and regression

- Added `deployment/verify-live-identity.mjs`. It requires a full 40-character
  expected SHA and accepts production only after 20 unique, concurrent,
  cache-busted `/health` responses all return HTTP 200, `no-store`, the exact
  SHA, and PostgreSQL.
- Made that verifier mandatory in `deployment/deploy.sh` both before the live
  data gate and after an actual revision restart.
- Added `npm run verify:live-identity` for an independent, non-mutating check.
- Added the exact regression
  `live identity gate rejects the exact stale candidate mismatch from verification 16`.
  Its local health fixture reports `8f17bd2…` while `9f66999…` is expected. The
  gate rejects all 20 stale samples, then passes only after all 20 samples
  report the expected candidate. All 40 request URLs must be unique.

## Clean local evidence

Run on 29 August 2026 UTC from the repair tree:

```text
npm ci: PASS; 50 packages; 0 vulnerabilities
npm test: PASS; 15/15 release contracts and 56/56 Playwright tests
all 10 .factory/claims.json commands: PASS independently
npx tsc --noEmit: PASS
cargo fmt --check: PASS
cargo clippy --all-targets --all-features -- -D warnings: PASS
cargo test: PASS; 9/9
cargo build --release: PASS
npm run build: PASS; dist/ produced
npm audit --audit-level=high: PASS; 0 vulnerabilities
bash -n deployment/deploy.sh: PASS
node --check deployment/verify-live-identity.mjs: PASS
local factory URL verifier: PASS on / and /?demo=1; no console errors
local runtime with only PORT: PASS; generated security material; SQLite
local load smoke: PASS; 100/100 concurrent health requests
```

The Playwright matrix ran Chromium desktop and exact 390×844 mobile coverage.
It includes the one-click demo, real teacher/student flow, errors, keyboard and
focus, axe serious/critical checks, 200% text, touch targets, reduced motion,
privacy request allowlisting, response headers, rate limiting, route history,
404, service-worker install/update, and offline reload.

Build budgets remain unchanged: JavaScript 63,018 B raw / 22,870 B gzip; CSS
16,053 B raw / 4,290 B gzip; fonts 118,264 B; hero WebP 46,170 B. Local Docker
was unavailable, so the mandatory multi-stage container was assembled by ACR.

## First immutable deployment receipt

- Repair source: `7044e8f4aaf9b12d7280cdc1c03ab8e211d282c3`
- ACR run: `ch193`
- Image: `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:7044e8f4aaf9`
- Digest: `sha256:564bbe0c83c1be0cb9ac7b495a0c29141be13a5e3542f8c1c6c660facf9aed42`
- Container Apps revision: `sf-in-class-draft-ticket--0000047`
- Contract: single active revision, one ready replica, min/max 1, PostgreSQL
  supplied through `DATABASE_URL=secretref:database-url`
- Pre-restart identity at `2026-08-29T22:53:31.860Z`: 20/20 responses matched
  the full repair SHA and PostgreSQL.
- Post-restart identity at `2026-08-29T22:54:24.016Z`: 20/20 responses matched
  the full repair SHA and PostgreSQL; the persisted test record survived on a
  new replica process.
- Managed browser/data gate: PASS across the ready replica, including demo,
  teacher/student reads, CSV hardening, deletion, 40-request rate allowance,
  five 429 responses, and `Retry-After: 1`.
- Full production Playwright: PASS, 56/56 at desktop and 390 px mobile.
- Production factory URL verifier: PASS on `/` and `/?demo=1`; no console or
  page errors, one h1, main landmark, labeled controls, and image alt text.
- Live and local `index.html`, hashed JavaScript, and CSS SHA-256 values match:
  `6cd8edd6…`, `1a518c5c…`, and `559c4e53…` respectively.

## Run and verify

```sh
npm ci
npm test
npx tsc --noEmit
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
npm run build
LIVE_EXPECTED_SHA=$(git rev-parse HEAD) npm run verify:live-identity
```

## Known gaps

None. There is no package/consumer surface, account, paid unlock, or runtime AI
feature, so those checks are not applicable. The original artifact remains a
Rust/Axum plus SQLite/PostgreSQL backend serving the Vite/Svelte PWA from one
container.

---

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
