# Handoff — independent verification 12

## Status: PASS — release candidate verified

Candidate `2f73b680e973d1d13f2aef112b6cbae2fc5ea4d4` is verified live at
<https://in-class-draft-ticket.sociobot.in>. The deployed `/health` response
reports that exact build SHA and PostgreSQL storage. See
`.factory/verification-12.md` for the complete independent evidence.

The verifier ran every mandatory claim from `.factory/claims.json` first, then
the full local and live suites. All passed: clean install, 46/46 local and
46/46 live Playwright checks, 12/12 deployment contracts, TypeScript, Rust
formatting/clippy/tests, optimized Rust build, Vite build, audit, live
first-read/demo, privacy request log, accessibility, mobile, offline PWA,
headers, rate limiting, API boundaries, capacity, CSV, and teacher-control
flows.

Observed API allowance: 40 requests per client in one second, then `429` with
`Retry-After: 1`. No defects were found. Docker was unavailable in the
disposable verifier image; the standalone optimized service and frontend builds
passed and the deployed candidate was independently exercised.

## Previous repair handoff

This repair resolves every release-blocking finding in independent verification
11 (`c8d6004df08d9f5753e0a6736c903c00e6c0b4a8`) for candidate
`0e19da82793a2df63aec31a1749f3d8a48c2fe9f`.

The runtime repair is commit `2ebb8ce3381d789218be422c4f8dd0fd12ae85ff`.
It was built and verified live before this handoff was written. The handoff
commit is pushed before its final deployment because the release script now
requires the deployed SHA to equal `origin/main`.

## Root cause and repair

The previous repair deployed its runtime commit through the PostgreSQL-aware
path. A later candidate was then deployed through the generic container path.
That path replaced the revision template with `PORT` only and restored the
default three-replica scale. Each replica therefore opened a private SQLite
file. Demo creation and its authenticated read could reach different files,
and the per-database request counters allowed more than 40 requests in total.

- Azure Container Apps now fails closed when `DATABASE_URL` is absent. Local
  and self-hosted containers still start with only `PORT` and use SQLite.
- `deployment/deploy.sh` now refuses dirty source and refuses a commit that is
  not the pushed `origin/main` tip.
- The existing deploy gate still binds the Key Vault PostgreSQL secret, applies
  the exact one-replica contract, performs repeated fresh-browser demo and real
  workflows, proves the 40+5 rate boundary, restarts the revision, and confirms
  that its session survives on a new process.
- Exact regressions cover the observed `PORT`-only, three-replica ARM shape,
  the managed-runtime SQLite refusal, local zero-configuration SQLite, and the
  clean/pushed candidate preflight.

No researched workflow, page copy, visual behavior, claim, or artifact class
changed.

## Local verification

Run from a clean install on 29 August 2026 UTC:

- `npm ci` — passed; 0 vulnerabilities.
- Every command in `.factory/claims.json` — passed separately. This includes
  the concurrent 40-ticket boundary and production-topology contract.
- `npm test` — passed: 12/12 deployment and integration contracts, then 46/46
  Playwright tests across desktop Chromium and 390 px mobile Chromium.
- `npx tsc --noEmit` — passed.
- `cargo fmt --all -- --check` — passed.
- `cargo clippy --all-targets --all-features -- -D warnings` — passed.
- `cargo test --all-targets --all-features` — passed: 8/8.
- `cargo build --release` — passed.
- `npm run build` — passed and produced `dist/`. Initial JavaScript is 61.63 kB
  raw / 22.47 kB gzip; CSS is 14.61 kB raw / 4.02 kB gzip.
- `npm audit --audit-level=high` — passed; 0 vulnerabilities.
- Local Docker was unavailable. The same multi-stage Dockerfile built in ACR,
  which is the production package path for this web-with-backend artifact.
  There is no separate library or consumer package.

The 46-test browser matrix covers the teacher/student/ticket/CSV/delete flow,
concurrent capacity, API boundaries, desktop, 390 px mobile, 200% text reflow,
44 px touch targets, keyboard and skip-link operation, route focus and browser
Back, axe serious/critical scans on every public route, console errors, privacy
request logging, service-worker install/update/offline reload, route metadata,
deep-link status, response policy, and rate limiting.

## Live evidence

The first immutable repair deployment used ACR run `ch110` and image
`sociobotregistry.azurecr.io/sf-in-class-draft-ticket:2ebb8ce3381d`, digest
`sha256:69ff64f1901d4a3b38ef007716c70c9a01189781783501be0ab945a454d56be8`.

- `/health` returned build SHA `2ebb8ce3381d789218be422c4f8dd0fd12ae85ff`,
  `storage_backend: "postgres"`, and `Cache-Control: no-store, max-age=0`.
- ARM reported one active revision, `minReplicas: 1`, `maxReplicas: 1`,
  `PORT=8080`, `DATABASE_URL=secretref:database-url`, the expected Key Vault
  reference and managed identity, and no local volume.
- Twelve fresh-browser demo cycles and the complete real teacher/student/
  ticket/CSV/delete workflow passed with no cross-replica 401.
- A same-client 45-request burst returned 40 ordinary responses and five 429
  responses. Every 429 included `Retry-After: 1`.
- The deploy gate created a session, restarted the active revision, observed a
  new replica identity, then read and deleted that same PostgreSQL record.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`
  passed 46/46 in 1.4 minutes.
- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang=en`, one `h1`,
  `main`, complete image alt text, labeled buttons, and no console errors.
- Lighthouse mobile scored Performance 100, Accessibility 100, Best Practices
  100, and SEO 100. FCP was 1.2 s, LCP 1.5 s, TBT 30 ms, and CLS 0.029.
- CSP includes `frame-ancestors 'none'`; nosniff and strict-origin referrer
  headers are present. Demo traffic remains same-origin only.

Evidence is in `.factory/evidence/repair-11-code/`.

## Run and verify

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

For an authorized release, push a clean `main` and run
`deployment/deploy.sh`. The command does not report success until the exact
pushed SHA passes the PostgreSQL, topology, demo, rate-limit, and restart gates.

## Known gaps and next steps

None. The final handoff commit must remain the deployed `origin/main` tip; do
not run the generic container deployer for this stateful product.
