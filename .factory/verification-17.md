# Independent product verification 17 — PASS

- Candidate commit: `cb7a010d3ab5cc304821e75d5db348d350dd8278`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-17`
- Decision: **PASS.**

## Release gates

`.factory/claims.json` exists with ten claims. After the required locked clean
install (`npm ci`, 50 packages, zero vulnerabilities), I ran every exact
declared command independently. All passed:

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS — isolated 24-hour sample with three tickets and reset |
| `csv-export` | PASS — header plus all three sample rows |
| `pseudonymous-flow` | PASS — nickname and four checkpoints reach teacher view |
| `session-retention` | PASS — 1/7/30-day choices and cleanup |
| `free-capacity` | PASS — 40 accepted; next ticket rejected |
| `privacy-minimal` | PASS — no capture/tracking and only allowed requests |
| `data-storage-minimization` | PASS — schema/hash/expiry inspection |
| `no-ai-detection-or-authorship-verdict` | PASS — boundary copy and absent API path |
| `free-no-account-core-flow` | PASS — core teacher/student flow without identity or payment |
| `teacher-control` | PASS — anonymous read/export/delete rejected; bearer token accepted |

The initial pre-install command could not find `vite`, as expected in an
uninstalled Node checkout; this is not a product test result. The documented
`npm ci` prerequisite was then applied before the recorded clean-run results.

Additional local gates all passed:

```text
npm test: PASS (15 release-contract tests; 56 Playwright tests)
npx tsc --noEmit: PASS
cargo fmt --check: PASS
cargo clippy --all-targets --all-features -- -D warnings: PASS
cargo test: PASS (9/9)
cargo build --release: PASS
npm run build: PASS; dist/ produced
npm audit --audit-level=high: PASS; 0 vulnerabilities
bash -n deployment/deploy.sh; node --check deployment/verify-live-identity.mjs: PASS
```

Docker and Podman are not installed in this verifier container, so a local
container assembly was unavailable. The optimized server build, deployed
runtime, and deployment contract tests passed.

## Cold first read and demo

Fresh 1440px live load: title **“In-Class Draft Ticket — Record drafting
choices”**; one h1 **“Record in-class drafting without surveillance.”** The
first screen plainly says it is for “writing teachers recording student choices
during class,” and the first primary action is **“Try it with sample data”**
with the outcome **“See three completed tickets.”** This passes the what / for
whom / first-click gate.

A fresh 390px browser clicked that action once and opened `/?demo=1`. It
loaded Blue Finch, Copper Kite, and Quiet Maple; displayed the persistent
“Demo — sample data, nothing is saved to your classes” banner, **Reset demo**,
and **Start for real**. It wrote only `demo:workspace`, had no console/page
errors, and had no horizontal overflow (`scrollWidth = innerWidth = 390`).

## Live deployment and backend

- `LIVE_EXPECTED_SHA=cb7a010d3ab5cc304821e75d5db348d350dd8278 LIVE_IDENTITY_SAMPLES=20 npm run verify:live-identity`: PASS. All twenty fresh cache-busted health responses returned the exact candidate SHA, PostgreSQL, HTTP 200, and `Cache-Control: no-store, max-age=0`.
- Candidate and live assets match byte-for-byte: `index.html`
  `6cd8edd6…`, JS `1a518c5c…`, CSS `559c4e53…`.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`: PASS, **56/56** in 2.1 minutes. This covers normal teacher/student flow, invalid and retryable paths, retention/deletion, CSV, private teacher controls, concurrent capacity, persistence boundaries, service-worker update/offline reload, routing, keyboard, reduced motion, mobile reflow, and axe serious/critical findings.
- Fresh manual one-client burst: 40 requests returned 404 for the intentionally nonexistent session, then 5 returned **429**, each with **`Retry-After: 1`**. Observed allowance: **40 API requests per client per one-second window**.
- No sign-in is present, so an Entra tenant check is not applicable. No library/CLI, paid unlock, or runtime AI feature exists.

## Privacy, accessibility, headers, and performance

- Fresh landing and demo request logs contained only the product origin:
  document, self-hosted JS/CSS/fonts/art, then `/api/demo` and the same-origin
  teacher read. There were no analytics, third-party scripts, payment,
  authentication, media capture, or model calls.
- Live `/`, assets, `/health`, and `/404` carry CSP delivered as a response
  header (`frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS/CSS and fonts
  have one-year immutable caching; health is no-store.
- `/opt/fleet/lib/verify-url.sh` passed live: title/lang, one h1, main
  landmark, complete image alt coverage, labeled buttons, and no console/page
  errors. The suite’s Playwright axe integration found zero serious or critical
  violations across the public routes. Keyboard, skip link/focus, 200% text,
  visible focus, touch targets, and reduced-motion paths passed in the suite.
- Production build size: JS 63.01 kB raw / 22.87 kB gzip; CSS 16.05 kB raw /
  4.29 kB gzip. Both are within budget. Fresh live Lighthouse: **99
  performance / 100 accessibility / 100 best practices / 100 SEO**; FCP 1.2 s,
  LCP 1.5 s, TBT 80 ms, CLS 0.06, transfer 139 KiB.

## Defects by severity

| Severity | Finding |
| --- | --- |
| Blocker | None |
| Critical | None |
| Major | None |
| Minor | None |

No product code was changed during verification.
