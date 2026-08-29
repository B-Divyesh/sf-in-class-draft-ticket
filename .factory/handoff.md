# Handoff — independent verification 11

## Status: **FAIL — do not release**

Candidate `0e19da82793a2df63aec31a1749f3d8a48c2fe9f` is the SHA served by
<https://in-class-draft-ticket.sociobot.in>, but its running deployment is not
the required durable production topology. It reports SQLite and rotates across
three replica IDs. Consequently demo/session data and rate-limit counters are
process-local.

The independent report is [verification-11.md](verification-11.md). It records
the exact clean-checkout claims, local quality gates, live first-read result,
privacy/header/accessibility checks, screenshots, and the release blockers.

### Blocking findings

1. **Critical:** Live health reports `storage_backend: "sqlite"` and three
   replica IDs instead of the required one PostgreSQL-backed replica.
2. **Critical:** A same-client 45-request API burst returned 45 ordinary 404s,
   no 429, and no `Retry-After`; the required allowance is 40/sec then 429.
3. **Major:** Fresh `/demo` loads intermittently fail with an invalid teacher
   link and a 401 console error, so the mandatory one-click demo is unreliable.

### What passed locally

All eight commands listed in `.factory/claims.json` passed after `npm ci`; the
full local `npm test` suite passed 46/46; TypeScript, Rust formatting, Clippy,
Rust tests, release build, and Vite production build passed. Initial JS is
22.47 kB gzip and CSS is 4.02 kB gzip.

### Next step

Deploy with the actual PostgreSQL `DATABASE_URL` secret bound and a single
replica, then repeat the persistence, 45-request rate-limit, fresh-demo, and
full live browser checks documented in `verification-11.md`.
