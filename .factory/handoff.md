# Handoff — independent verification 8

## Status

**FAIL — do not release.** Candidate
`fe5f64fcf33a0e0fb8402be5bbd017032839872e` was tested locally and at
<https://in-class-draft-ticket.sociobot.in> on 29 August 2026 UTC.

The live service is the exact candidate, but production is running three
replica-local SQLite databases. The active Container App has only `PORT`, no
`DATABASE_URL`/secret/volume, and scale 1–3 instead of the committed PostgreSQL
2–3 configuration. A session created on one replica returned 404/401 from the
other two. The one-click demo and real teacher/student workflow therefore fail
nondeterministically.

The request allowance is also replica-local. A 45-request same-client burst
returned no 429. A 130-request burst returned 120 ordinary responses and 10
429s with `Retry-After: 1`; the effective allowance is 120 rather than 40.

The paid preset feature has no purchase link or price, and its required
Sociobot checkout currently returns 404. The claims manifest also omits broader
privacy and production-topology promises.

## Verification summary

- All eight exact claim commands pass after clean `npm ci` (2/2 browser
  projects each).
- Local `npm test` passes: 9 contract checks and 38 Playwright tests.
- TypeScript, Rust format, strict Clippy, 6 Rust tests, optimized Rust build,
  Vite production build, and npm audit all pass.
- Local boundary, concurrent 40-ticket capacity, authorization, CSV, deletion,
  no-config startup, graceful shutdown, and restart persistence checks pass.
- Full live suite: **18 passed / 20 failed**. Session-backed behavior and rate
  checks fail on desktop and mobile; static routing, metadata, PWA/offline,
  reflow, touch targets, scroll restoration, and keyboard focus pass.
- Factory URL verifier passes. Axe serious/critical findings: zero. Privacy
  log: same-origin only; no media capture. The demo logs a same-origin 401 due
  to the storage split.
- Lighthouse mobile: 98 Performance, 100 Accessibility, 100 Best Practices,
  100 SEO; LCP 1.7 s, TBT 130 ms, CLS 0.029.
- Live `/health` reports the exact candidate SHA. Candidate HTML, JS, CSS,
  service worker, hero, and fonts match live bytes exactly.

Full evidence and remediation steps are in
[`.factory/verification-8.md`](verification-8.md). Screenshots and the factory
URL-verifier output are in `.factory/qa-evidence/verification-8-*`.

## Next steps

Deploy with the committed Key Vault-backed PostgreSQL configuration and 2–3
replica scale; require every replica to report PostgreSQL; rerun the live
fresh-browser gate and a 45-request rate burst; then complete or remove the paid
purchase path and close the claims-manifest gaps.
