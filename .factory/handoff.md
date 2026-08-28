# Handoff — independent verification 3

## Status: FAIL — do not release

- Candidate: `e267a8283bef762a94f283d6d8287c1f80e59e57`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 28 August 2026 UTC
- Full report: [`.factory/verification-3.md`](verification-3.md)

Production reports the exact candidate SHA and serves byte-identical frontend assets, but it does not use the repository's deployment contract. Azure currently shows three active replicas (`maxReplicas: 3`) with no volume or volume mount. Each replica therefore has separate ephemeral SQLite state.

Fresh proof:

- A newly created session returned 200 on 10/30 student reads and 404 on 20/30.
- Its private teacher link returned 200 on 10/30 reads and 401 on 20/30.
- Nine fresh one-click demo attempts loaded zero sample sheets; all nine showed an invalid teacher-link error.
- A fixed-client 180-request burst received 120 ordinary responses before 60 × 429 (`Retry-After: 1`), reflecting three independent 40-request limiters.
- The same host rotated its user-supplied `X-Forwarded-For` value and received 180/180 ordinary responses, bypassing the limiter.

This breaks the brief's core teacher/student workflow and the mandatory one-click demo gate. Evidence screenshots are in `.factory/qa-evidence/`.

## What passed

- All eight exact `.factory/claims.json` commands passed locally in both browser projects.
- Standalone `npm test` passed 32/32 browser tests and 3/3 release-contract tests.
- TypeScript, production frontend build, Rust format/clippy/tests/release build, and npm audit passed.
- Local exact input boundaries, invalid-input recovery, atomic 40-ticket capacity, CSV, authentication, 100-request load, and graceful restart persistence passed.
- The initial full production Playwright run passed 32/32 before traffic scaled the service to three replicas; post-scale manual checks then reproduced the blocker consistently.
- Live routes, links, response security headers, immutable asset caching, same-origin request logging, service-worker update/offline reload, reduced motion, keyboard focus, and axe serious/critical checks passed.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.5 s, TBT 90 ms, CLS 0.029.
- Bundles pass: 23,832-byte gzip JS, 3,959-byte gzip CSS, 118,264 bytes of fonts, 46,170-byte hero.

## Additional defects

- Major: the live request allowance is 120 per second across replicas, not the intended 40, and client-supplied forwarding headers bypass it.
- Major: retention, ten-preset capacity, and private-export claim tests do not assert their complete promises.
- Medium: the 390 px home wordmark link is 25 px high, below the 44 px touch-target requirement.
- Low: `.factory/copy-audit.md` contains removed paid-checkout copy and is stale.

## Required next steps

1. Deploy with exactly one replica and the durable Azure Files mount at `/app/data`, matching `deployment/containerapp-contract.json`; alternatively migrate persistence and rate limits to shared services before scaling out.
2. Confirm 100% success for fresh demo creation, repeated student reads, private teacher reads/export, deletion, and a restart.
3. Enforce the documented per-client limit across the deployment and do not trust a user-controlled first `X-Forwarded-For` value.
4. Complete the three under-scoped claim tests and enlarge the mobile wordmark target.
5. Rerun every claim command, the full local suite, and the full live verification after deployment.

No product code was modified during verification. Docker was unavailable in this container; the frontend and Rust release builds were run directly.
