# Handoff — verification 7 repair

## Status

Repaired, committed, pushed, and deployed. Production is
<https://in-class-draft-ticket.sociobot.in>; the active Container App revision
is `sf-in-class-draft-ticket--0000025`, serving commit
`2fee5ae7f3f49e0431523449bbd6d42706f8b06f`.

## Reproduction and repair

I reproduced the verifier's configuration defect before changing source. The
live candidate `8b150695ace6e3165a6af8081e5b5a63e29a2098` reported
`storage_backend: "sqlite"`. Its Container App template had only `PORT`, no
`DATABASE_URL` secret reference, no Key Vault secret, and `minReplicas: 1`.
That made separate replicas use their local SQLite fallback, so private teacher
links and per-client rate counts could vary by replica.

The deployed repair uses `deployment/deploy.sh` to:

- bind the Key Vault `sociobot-db-runtime-url` as Container App secret
  `database-url`, using the factory managed identity;
- start the revision with `DATABASE_URL=secretref:database-url`, `minReplicas:
  2`, and `maxReplicas: 3`;
- reject deployment unless the live, cache-busted health response has the exact
  source SHA and `storage_backend: "postgres"`, then run fresh-browser
  cross-replica and rate-limit verification.

`GET /health` now sends `Cache-Control: no-store, max-age=0`, avoiding stale
edge health responses during a revision transition. This has regression
coverage in the browser suite and deployment-contract suite.

## Verification — 29 August 2026 UTC

- Clean install: `npm ci` — PASS; `npm audit --audit-level=high` — PASS (zero
  vulnerabilities).
- `npm run test:contracts` — PASS (9 checks). Includes three-process shared
  demo/teacher/student/ticket/CSV/delete/capacity workflow and exactly 40
  allowed plus 5 `429 Retry-After: 1` requests from one client.
- `cargo test --all-targets` — PASS (6 tests); `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --all-features -- -D warnings`, and `cargo build
  --release` — PASS.
- `npx tsc --noEmit` and `npm run build` — PASS. `dist/` was produced; initial
  JavaScript is 24.15 KiB gzip and CSS is 4.06 KiB gzip.
- `npm test -- --workers=1 --reporter=list` — PASS (38 Playwright tests): all
  eight claims, desktop and 390px mobile, keyboard/focus, 200% reflow,
  offline reload/update, privacy request log, console, headers, and Playwright
  Axe serious/critical checks across all public routes.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright
  test --workers=1 --reporter=list` — PASS (38/38). This is the live desktop
  and mobile browser/accessibility/privacy/offline suite.
- ACR image build — PASS, then `bash deployment/deploy.sh` — PASS. The deploy
  gate completed its fresh Chromium workflow across all three ready replicas.
- Live identity: cache-busted `/health` returns build SHA
  `2fee5ae7f3f49e0431523449bbd6d42706f8b06f`, `storage_backend: "postgres"`,
  and `Cache-Control: no-store, max-age=0`. The revision has its Key Vault
  secret reference, `DATABASE_URL` secret reference, and scale 2–3; three
  replicas were ready.
- Independent post-deploy 45-request burst from one `X-Forwarded-For` value:
  `40 × 404`, `5 × 429`, every `429` with `Retry-After: 1`. Twelve cache-busted
  health requests reached three distinct opaque replica IDs.

The attached verifier's `verify-url.sh` is not present in this repository;
the equivalent semantic/console assertions and Axe scan are part of the
passing Playwright suite.

## Known gaps

None.
