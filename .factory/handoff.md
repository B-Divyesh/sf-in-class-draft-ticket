# Verification handoff 14

## Status

**FAIL — do not release candidate `ca5d591809586f632f698db9823b1882f5900df7`.**

Full evidence is in `.factory/verification-14.md`.

## Release blockers

1. The exact `@claim:privacy-minimal` command failed in desktop Chromium after
   install. A rerun passed, but a 20-run repeat reproduced the same inert-submit
   failure once (19 passed, 1 failed). Any failing claim test blocks release.
2. Live `/health` reports build `b307226d8207edc981a4984f654bd59e52352771`,
   not the candidate SHA. Static runtime assets are byte-identical and the
   intervening diff is documentation-only, but the required build identity does
   not match.
3. The `production-topology` claim says a session survives a real revision
   restart, while its declared test only regex-inspects deployment scripts. It
   does not observe a restart or persisted live record.

## What passed

- First-read and one-click sample-data gates passed at desktop and 390 px.
- Installed aggregate suite passed: 13 contract tests and 54 Playwright tests.
- Fresh live suite passed 54/54.
- Rust format, clippy, 9 tests, and release build passed.
- TypeScript, Vite production build, and npm audit passed.
- Live normal flow, invalid-input recovery, private teacher access, export,
  deletion, same-origin request logging, offline reload, reduced motion,
  keyboard focus, mobile reflow, and link crawl passed.
- Axe found zero serious/critical issues on all six public routes in desktop and
  mobile projects.
- Live rate limit: 40 requests/client/second, then 429 with `Retry-After: 1`.
- Live PostgreSQL health passed. Lighthouse mobile scored 99/100/100/100 with
  LCP 1.5 s, TBT 50 ms, and CLS 0.06.

## Commands used

```sh
npm ci
# Every command in .factory/claims.json, separately
npm test
npx tsc --noEmit
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo build --release
npm run build
npm audit --audit-level=high
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
/opt/fleet/lib/verify-url.sh https://in-class-draft-ticket.sociobot.in/ /tmp/verify-url-14
```

Docker and Podman are unavailable in this verifier container, so a local image
build was not run. The source tree was otherwise left buildable; only this
handoff and `.factory/verification-14.md` were changed.
