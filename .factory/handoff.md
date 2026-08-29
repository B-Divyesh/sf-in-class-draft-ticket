# Handoff — perfection loop round 2

## Status

**PASS.** Every finding in `.factory/review-1.md` and `.factory/review-2.md` is resolved. The repaired product is deployed at <https://in-class-draft-ticket.sociobot.in> from implementation commit `b307226d8207edc981a4984f654bd59e52352771`.

## What changed

- The first screen now uses factual audience wording and keeps all three privacy, retention, and price facts inside 390×844.
- `/?demo=1` and `/demo` open an isolated 24-hour sample with a completed Blue Finch claim and revision visible before the fold.
- Demo entry, reset, and exit preserve existing real browser keys and backend sessions exactly.
- The privacy test now types into every student field and proves keystrokes create no requests or browser storage. Submitted traffic must match an exact same-origin allowlist.
- The privacy page now lists class content, random IDs, timestamps, demo markers, teacher credential hashes, rate-limit hash material, and counters accurately.
- New teacher credentials are hashed before storage. Existing raw credentials are migrated and the raw database column is removed.
- Rate limiting stores a daily rotating keyed HMAC instead of an IP address. Stale rows are removed within four seconds while the service runs.
- `.factory/claims.json` has 11 claims. The new database-level claim checks every table, column, stored value, credential migration, demo lifetime, and deletion behavior.
- The 404 h1 is “Page not found.” Raw Open Graph and Twitter copy is factual. Existing per-route titles, canonicals, focus handling, shared legal links, and true HTTP 404 remain intact.
- README terminology, `.factory/demo.md`, `.factory/copy-audit.md`, `.factory/design.md`, the catalog description, and service-worker cache version are current.

The complete finding-to-change-to-evidence matrix is in `.factory/polish-2.md`.

## How to run

```sh
npm ci
npm run build
cargo run
```

Open <http://localhost:8080>. The one-click sample is at <http://localhost:8080/?demo=1>.

## How to verify

```sh
npm test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo build --release
npx tsc --noEmit
npm audit --audit-level=high
```

Run each command listed in `.factory/claims.json` separately from a clean clone. For live browser verification:

```sh
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
/opt/fleet/lib/verify-url.sh https://in-class-draft-ticket.sociobot.in/ <evidence-directory>
```

## Exact verification evidence

- Clean clone: `/tmp/in-class-polish2-clean` at `b307226d8207edc981a4984f654bd59e52352771`.
- Claims: 11/11 declared commands passed individually.
- Aggregate clean suite: 13/13 contract tests and 54/54 Playwright tests passed.
- Backend: 9/9 Rust tests passed; format and clippy with `-D warnings` passed; optimized build passed.
- Frontend: TypeScript passed; Vite emitted 62.83 kB raw / 22.78 kB gzip JavaScript and 16.05 kB raw / 4.29 kB gzip CSS.
- Supply chain: `npm audit --audit-level=high` reported zero vulnerabilities.
- Accessibility: Playwright axe found zero serious or critical violations across `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` in both browser projects.
- Browser behavior: keyboard focus, skip link, Back restoration, 44px targets, 200% reflow, reduced motion, offline shell reload, no console errors, privacy traffic, and real 404 checks passed.
- Live suite: 54/54 passed against <https://in-class-draft-ticket.sociobot.in> after deployment.
- Live URL verifier: [`verify.json`](evidence/polish-2/live/verify-url/verify.json) records title, language, h1, main, alt, button, and console success.
- Live screenshots: [`landing-mobile-390.png`](evidence/polish-2/live/landing-mobile-390.png), [`demo-mobile-390.png`](evidence/polish-2/live/demo-mobile-390.png), [`demo-desktop.png`](evidence/polish-2/live/demo-desktop.png), [`privacy-mobile-390.png`](evidence/polish-2/live/privacy-mobile-390.png), and [`404-mobile-390.png`](evidence/polish-2/live/404-mobile-390.png).
- Lighthouse: [`lighthouse.json`](evidence/polish-2/live/lighthouse.json) records Performance 97, Accessibility 100, Best Practices 100, SEO 100, FCP 1.2 s, LCP 1.5 s, TBT 160 ms, and CLS 0.06.
- Live health: build `b307226d8207edc981a4984f654bd59e52352771`, `storage_backend: "postgres"`.
- Deployment: ACR run `ch157`; image `sociobotregistry.azurecr.io/sf-in-class-draft-ticket:b307226d8207`; digest `sha256:4b61e079b0d49a5b34965ebab5efffafe236c2a540d11ec610dae0ba9c3ef494`.
- Deployment gate: demo/real flows, export, delete, shared rate limiting, one-replica contract, and PostgreSQL persistence across a real revision restart all passed.

## Known gaps and next steps

No known product, accessibility, privacy, routing, mobile, claim, test, or deployment gaps remain from either review. No paid plan or AI feature is present; both are intentionally outside this product's researched scope.
