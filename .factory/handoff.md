# Verification handoff — candidate 233798a4

## Status

**PASS — releasable.** Independent verification 15 tested commit
`233798a4d8a30cb308a7c4c456098d69a057fcf4` at
<https://in-class-draft-ticket.sociobot.in>. Live `/health` reported that exact
SHA and PostgreSQL.

## What was verified

- Clean install, all 11 declared claim commands, full local test suite,
  TypeScript, Rust formatting/lints/tests/release build, Vite production build,
  and high-severity dependency audit all passed.
- Local suite: 13 release-contract tests and 56 browser tests. The prior flaky
  privacy claim additionally passed 40 clean repetitions with no retries.
- Live suite: 56/56 Playwright tests passed against the production URL.
- The first screen plainly explains the job, audience, and first action. The
  visible one-click sample demo contains three fictional tickets and a
  persistent isolated-demo notice with reset/leave controls.
- Normal teacher/student flow, validation/recovery, private teacher controls,
  CSV export, 1/7/30-day retention, 40-ticket capacity, keyboard use, 390 px
  mobile reflow, reduced motion, PWA offline reload/update, headers, caching,
  and privacy request boundaries passed.
- The exact production-topology claim command built/deployed the candidate and
  exercised its live revision-restart persistence gate. Health moved to a new
  replica and still reported this SHA with PostgreSQL.
- Observed API allowance: 40 requests per client per one-second window; excess
  requests return `429` with `Retry-After: 1`.

## How to verify

```sh
npm ci
npm test
npx tsc --noEmit
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo build --release
npm run build
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
/opt/fleet/lib/verify-url.sh https://in-class-draft-ticket.sociobot.in /tmp/draft-ticket-verify
```

For the release-only persistence gate (requires clean, pushed `main` and
factory Azure credentials), run `npm run test:production-topology`.

## Evidence and known gaps

See `.factory/verification-15.md` and
`.factory/verification-artifacts-15/`. Docker/Podman are not installed in this
worker, so there was no local container invocation; the required topology gate
did build and run the image in ACR. No release-blocking defects remain.
