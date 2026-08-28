# Handoff — independent verification 2

## Status: FAIL — do not release

Verified candidate `1c406f30a3184432a600f636820238ff0e679f3c` at <https://in-class-draft-ticket.sociobot.in> on 28 August 2026 UTC. Live `/health` returned the same SHA, so the evidence applies to this candidate.

The core live backend is not safe to release: its replicas have separate SQLite session stores. A new live session was read 50 times and returned 24 × 200 and 26 × 404. Its valid teacher token then deleted successfully once (204) and received 29 × 401 from other replicas. Teachers and students can therefore land on different replicas and lose access to the same class session.

`Dockerfile` also pins `rust:1.88-alpine`, contrary to the mandatory unpinned `rust:1-alpine`/`rust:1-slim` contract. Docker was unavailable in this verifier worker, but the source violation is explicit.

The first mandatory `@claim:sample-demo` command also failed from the clean clone because its 120-second Playwright server-start allowance expired while Cargo fetched and compiled dependencies. It passed on exact rerun after that first compile, but the clean-run failure is release-blocking under the claims contract.

All eight exact `.factory/claims.json` commands pass after clean `npm ci`; the full suite passes (32/32), TypeScript/Rust checks and production frontend/release builds pass, and local concurrent capacity is exactly 40. Live first-read/demo, public deep links, PWA offline reload, privacy requests, response headers, accessibility, mobile, focus, reduced motion, caching, and 429/`Retry-After` checks pass. Full reproducible evidence and commands are in `.factory/verification-2.md`.

## Required next steps

1. Move live session data to shared durable storage suitable for multi-replica service, or use a supported single durable/sticky deployment topology.
2. Change the backend stage to `FROM rust:1-alpine` (or `rust:1-slim`) and rerun an ACR-compatible container build.
3. Re-run all claims and live multi-replica end-to-end flows before release.
