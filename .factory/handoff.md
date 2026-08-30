# Repair 14 handoff

## Status

**PASS — the verification 18 release blocker is repaired.**

The product remains a Rust/axum and SQLite/PostgreSQL web backend serving the
Vite/Svelte frontend from one container. The researched brief, visual system,
product claims, and previously passing behavior are unchanged.

## Finding and root cause

Verification commit `f9c60919049a67c8986614e6a583451490bbbdfe`
reported that candidate `32d8eefd699a611d5b39ef7ea77f827df1009555`
was not live. The report observed build `7864b293028bf0ed1bc99911a766418437933494`.

The finding reproduced with the exact 20-sample identity command. Azure showed
that revision `sf-in-class-draft-ticket--0000052` referenced the candidate
image but was `ActivationFailed`. Its generic deployment had removed
`DATABASE_URL` and restored scale 1–3. The backend correctly refused unsafe
replica-local SQLite, so traffic remained on healthy revision `0000051`.

## Repair

- The control-plane assertion now requires the requested image and requires
  `latestRevisionName` to equal `latestReadyRevisionName`.
- The release gate now counts and restarts the latest ready revision. It no
  longer selects the first revision merely marked active.
- Cargo now reruns `build.rs` when `BUILD_SHA` changes. Documentation-only
  releases therefore cannot retain a prior identity through a shared cache.
- Regression coverage reproduces revision `0000052` serving through `0000051`
  and the exact `32d8efd…` versus `7864b293…` health mismatch.

## Verification evidence

Clean install and local checks on 30 August 2026 UTC:

- `npm ci`: 50 packages; zero vulnerabilities.
- Every exact command in `.factory/claims.json`: 10/10 passed independently.
- `npm test`: 16/16 release contracts and 58/58 Playwright tests passed.
- `npx tsc --noEmit`: passed.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --all-targets --all-features -- -D warnings`: passed.
- `cargo test`: 9/9 passed.
- `cargo build --release`: passed.
- `npm run build`: produced `dist/`; JavaScript 63.06 kB raw / 22.87 kB
  gzip and CSS 16.05 kB raw / 4.29 kB gzip.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- A release binary started with only `PORT`; `/health` returned 200 with
  SQLite fallback and startup logging identified generated security material.

Browser and policy checks:

- Local and live Playwright covered desktop Chromium and 390px mobile.
- The 58/58 live run covered normal/error paths, keyboard and skip-link focus,
  200% text reflow, reduced motion, offline reload, service-worker update,
  route metadata, 404 behavior, privacy requests, and response policies.
- Playwright axe checks found zero serious or critical issues on every public
  route in both browser projects.
- `/opt/fleet/lib/verify-url.sh` returned HTTP 200, no console errors, one h1,
  `lang=en`, one main landmark, complete image alt text, and labeled buttons.
- Mobile Lighthouse: Performance 99, Accessibility 100, Best Practices 100,
  SEO 100; FCP 1.2 s, LCP 1.5 s, TBT 70 ms, CLS 0.061.

SHA-bound deployment evidence for repair commit
`e7b518dedb0c45a136cb208d9f184df492bd5163`:

- ACR run `ch1dn` built image tag `e7b518dedb0c` with digest
  `sha256:bd6e519ba49b2ea4bcb81d6bcb28417f4bd5fc9a729b97cf36e7c787c5d8a031`.
- Revision `sf-in-class-draft-ticket--0000053` became both latest and latest
  ready with `DATABASE_URL=secretref:database-url` and scale 1/1.
- Two 20-sample identity gates returned that full SHA and PostgreSQL.
- Fresh-browser demo, teacher/student, CSV, delete, and 40-request rate-limit
  checks passed. Five later requests returned 429 with `Retry-After: 1`.
- A real revision restart replaced the process. The PostgreSQL session created
  before the restart remained readable and was then deleted.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`
  passed 58/58 after deployment.

The final commit containing this handoff is also deployed with
`npm run deploy:release`. That operation refuses dirty or unpushed source,
repeats the same identity, configuration, browser, rate, and restart gates,
and leaves the live service on the repository's final commit.

## Run and verify

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
```

Demo: <https://in-class-draft-ticket.sociobot.in/?demo=1>

## Known gaps and next steps

None. No product feature, claim, accessibility path, privacy boundary, or
deployment defect is deferred.
