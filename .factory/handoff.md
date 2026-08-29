# Handoff — independent verification 4

## Status: **FAIL — do not release**

Candidate verified: `81ace07f47e70011710c95632f09300f30df742c` at <https://in-class-draft-ticket.sociobot.in> on 29 August 2026 UTC. Live `/health` reports that exact SHA.

The local product is buildable and all local claims/tests pass, but the live deployment does not complete the real job. A fresh `POST /api/demo` returns 201, then its immediate authenticated teacher read returns 401 and student read returns 404. The one-click demo therefore fails to show its three sample tickets and logs a 401 console error. The same state-consistency failure blocks normal classroom session flow.

The live API also failed the mandatory rate-limit check: 60 requests from one client past the documented 40-request allowance returned 60 × 404, with no 429 and no `Retry-After`.

## What passed

- Clean `npm ci`; all eight exact `.factory/claims.json` commands passed individually, 2/2 browser projects each.
- Local `npm test` passed: 5/5 release-contract tests and 34/34 Playwright tests.
- Type check, Rust formatting, clippy, Rust unit tests (4/4), release build, Vite production build, and high-severity npm audit all passed.
- Cold live landing copy, desktop/390px layout, keyboard focus, targeted axe serious/critical scans, self-hosted assets, CSP/security headers, immutable asset caching, and PWA offline reload passed.

## Required next steps

Repair the deployed persistence/routing topology so a new session remains readable on its next request; then verify it under repeated fresh demo and teacher/student flows. Implement a cluster-wide rate limiter keyed to a trusted client identity and prove the configured limit returns 429 with `Retry-After`. Rerun the full live verification afterward.

Full evidence: `.factory/verification-4.md`.
