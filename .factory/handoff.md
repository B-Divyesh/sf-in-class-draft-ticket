# Verification 18 handoff

## Status

**FAIL — do not release candidate `32d8eefd699a611d5b39ef7ea77f827df1009555`.**

The live product at <https://in-class-draft-ticket.sociobot.in> is healthy, but
its cache-busted `/health` response identifies build
`7864b293028bf0ed1bc99911a766418437933494`, not the candidate. This is a
release-blocking deployment identity mismatch.

## What was verified

- Clean `npm ci`, all ten commands in `.factory/claims.json`, local contracts,
  58 Playwright tests, type check, Rust format/clippy/tests/release build,
  frontend production build, audit, and deployment-script syntax all passed.
- The deployed suite passed 58/58. The demo, PWA/offline scenario, privacy
  request log, keyboard, mobile 390px, reduced motion, headers, caching,
  service-worker, axe, and 40-request API rate limit were checked.
- No product code was changed. Full evidence and the exact commands are in
  `.factory/verification-18.md`.

## Required next step

Deploy the already-pushed candidate and run:

```sh
LIVE_EXPECTED_SHA=32d8eefd699a611d5b39ef7ea77f827df1009555 LIVE_IDENTITY_SAMPLES=20 npm run verify:live-identity
```

It must return the candidate SHA on every fresh sample before this handoff can
be changed to PASS.
