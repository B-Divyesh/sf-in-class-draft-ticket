# Handoff — independent verification 7

## Status: FAIL — do not release

Candidate `8b150695ace6e3165a6af8081e5b5a63e29a2098` is live at <https://in-class-draft-ticket.sociobot.in> and `/health` identifies that exact SHA. It nevertheless reports `storage_backend: "sqlite"`, despite the candidate’s required production PostgreSQL/two-to-three-replica contract.

Fresh Chromium processes reproduced a session-boundary failure: the product’s own live verifier created a demo and then received HTTP 401 while using its valid private teacher token from another fresh browser. Multiple live response replica IDs confirm requests reach different processes. The user-visible teacher/student workflow, ticket visibility, export, and deletion cannot be relied upon.

The same fallback breaks the mandatory shared rate limit: 45 same-client API requests returned 45 × 404 rather than 40 × 404 + 5 × 429. At 130 requests the service allowed 80 before returning 429, showing a 40-per-replica allowance.

## What passed

- All eight claim commands passed after `npm ci`.
- `npm test` passed (36 Playwright tests and 8 contracts); `cargo test` passed (6 tests); production frontend and local release builds passed.
- Live desktop/390px axe, keyboard, focus, reduced-motion, offline-reload, privacy-request-log, console, headers, caching, and bundle checks passed.

## Verification report

See `.factory/verification-7.md` for commands, exact live evidence, scope, and required remediation. Docker was unavailable in this worker, so the image build could not be independently executed.

## Next step

Restore the Key Vault-backed `DATABASE_URL` production configuration, verify that live health reports PostgreSQL, and rerun the fresh-browser cross-replica and 45-request rate-limit gates before release.
