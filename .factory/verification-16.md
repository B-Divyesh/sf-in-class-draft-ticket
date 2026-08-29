# Independent product verification 16 — FAIL

- Candidate commit: `9f669994fc14775c69e2daf3a400e5cd5b4de2a0`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-16`
- Decision: **FAIL — production does not identify the candidate commit.**

## Release blocker

### B-16-1 — live build identity is one commit behind the candidate

Twenty fresh, concurrent, cache-busted `GET /health` requests all returned HTTP
200, `Cache-Control: no-store, max-age=0`, PostgreSQL, one replica, and:

```json
{
  "build_sha": "8f17bd2d94dfb72a9be7e819d324d63df30114d2",
  "replica_id": "79e22a35edcc4204b5fdeeda04de3b28",
  "status": "ok",
  "storage_backend": "postgres"
}
```

The required candidate is
`9f669994fc14775c69e2daf3a400e5cd5b4de2a0`. A clean SHA-bound local release
binary reports that candidate correctly, so the source build identity works.
Production has not deployed it.

The live HTML, JS, and CSS are byte-for-byte identical to the candidate build:

| File | Live/candidate SHA-256 |
| --- | --- |
| `index.html` | `6cd8edd6a15d530b71585402321c7bf63d1dc109d3ca2e99a3bf6ab9cb2624d5` |
| `index-C1trqALc.js` | `1a518c5cc57b7fa7432eaacfb0b1114bc1ec30ca0ddd1baa51a5175669f1cb30` |
| `index-CDo2Ou3X.css` | `559c4e536f4e9438bc06113c137b316902a7b0d974b31e7d015b2e40af29da7c` |

The candidate differs from deployed commit `8f17bd2…` only in `.factory`
documentation and evidence. That explains the byte parity but does not satisfy
the acceptance requirement that production match the candidate exactly.
Deploy the candidate, then require `/health.build_sha` to equal the full
candidate SHA before release.

## First-read and demo gate

**PASS.** A new 1440×900 browser context opened the live root without prior
storage. The first screen states:

- What: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers recording student choices during class.”
- First action: **Try it with sample data**, explained by “See three completed
  tickets.”

The action is one click. It opened `/?demo=1`, stored only `demo:workspace`,
showed three fictional tickets, and displayed the persistent “Demo — sample
data, nothing is saved to your classes” banner with **Reset demo** and **Start
for real**. The same facts and action fit within the initial 390×844 viewport.

## Mandatory claims gate

`.factory/claims.json` exists and contains ten claims. After the locked clean
install (`npm ci`), every listed command was run independently and passed.

| Claim | Result | Observable coverage |
| --- | --- | --- |
| `sample-demo` | PASS | Three records, 24-hour expiry, reset, isolated storage and unchanged real session |
| `csv-export` | PASS | Exact header and three demo rows |
| `pseudonymous-flow` | PASS | Class nickname plus all four drafting checkpoints reached the teacher view |
| `session-retention` | PASS | One-, seven-, and thirty-day expiry plus accelerated cleanup |
| `free-capacity` | PASS | Forty accepted; tickets 41–45 rejected |
| `privacy-minimal` | PASS | No typing request/storage change, same-origin submit, no capture |
| `data-storage-minimization` | PASS | Exact schema, hashed credentials and IP material, short counter lifetime, cascade deletion |
| `no-ai-detection-or-authorship-verdict` | PASS | Boundary copy, absent controls/calls, rejected endpoints |
| `free-no-account-core-flow` | PASS | Teacher and student completed the flow without identity or payment |
| `teacher-control` | PASS | Anonymous read/export/delete rejected; private-token actions accepted |

Each browser claim ran in both configured projects and passed twice. The Rust
storage claim passed once with eight unrelated tests filtered out. Copy and
README claims map to this manifest; no unlisted product claim was found.

## Local build and test evidence

All available local gates passed from the candidate checkout:

```text
npm ci: PASS; 50 packages installed; 0 vulnerabilities
npm test: PASS; 14/14 release-contract tests and 56/56 Playwright tests
npx tsc --noEmit: PASS
cargo fmt --check: PASS
cargo clippy --all-targets --all-features -- -D warnings: PASS
cargo test: PASS; 9/9
cargo build --release: PASS
BUILD_SHA=9f669994... cargo build --release: PASS; local /health returned the candidate SHA
npm run build: PASS; dist/ produced
npm audit --audit-level=high: PASS; 0 vulnerabilities
```

No Docker or Podman runtime is installed in this worker, so local container
assembly was unavailable. The exact frontend build and optimized backend build
both completed; the Dockerfile contract is also covered by the passing release
contract tests.

## End-to-end product and backend evidence

- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`
  passed **56/56** against production. This covered creation, join, submission,
  teacher review, CSV, delete, retention, 40-ticket capacity, invalid inputs,
  retryable server failure, deep links, history, and legal/404 routes.
- The backend started with only `PORT`, defaulted to SQLite, generated its
  security material, and logged sources without secret values.
- Twenty concurrent valid ticket writes returned 201 and stored exactly twenty
  records. After graceful shutdown and restart from the same directory, all
  twenty remained and the server reported persisted security material. Delete
  then returned 204.
- Invalid session data returned 400 and “Class name must be 2–80 characters.”
- Live health returned PostgreSQL and one observed ready replica across twenty
  fresh connections. Health is not cached.
- A fresh 45-request single-client burst to a nonexistent API session returned
  40×404 and 5×429. Every 429 had `Retry-After: 1`. Observed allowance:
  **40 requests per client per one-second window**.
- No sign-in exists, so the Microsoft Entra tenant check is not applicable.
  No paid plan or runtime AI feature exists. Library/CLI checks are not
  applicable.

## Privacy, security, accessibility, PWA, and performance

- Cold-load requests were only the same-origin document, hashed JS/CSS,
  self-hosted fonts, and product illustration. Demo added only same-origin
  `/api/demo` and teacher-view requests.
- In a fresh student flow, typing all five fields emitted no request, changed
  neither localStorage nor sessionStorage, and made zero media-capture calls.
  Submission added one same-origin ticket POST. There were no analytics,
  tracking, CDN, payment, authentication, or model requests.
- Live responses carry header-delivered CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. `/health` is `no-store`.
  Hashed JS/CSS and fonts use one-year immutable caching.
- The factory URL verifier passed `/` and `/?demo=1`: correct title, `lang=en`,
  one h1, main landmark, image alt, labeled buttons, and no console/page errors.
- Fresh axe scans found zero serious/critical violations on `/`, `/demo`,
  `/join`, `/start`, `/privacy`, and `/terms`. All routes have one h1 and the
  direct missing route returns a designed HTTP 404. Every crawled link resolved
  as expected.
- Keyboard focus begins on the visible skip link. The tested first eight focus
  stops had a 3 px cobalt outline and targets at least 44 px high. At 390 px,
  there was no horizontal overflow; the suite also passed at 200% text size.
- With reduced motion, the media query matched, scroll behavior was `auto`, and
  transitions were `0s`.
- The service worker installed cache `draft-ticket-v3`; a fresh offline reload
  restored the shell and correct h1. The suite also covered cache update.
- Fresh Lighthouse mobile: **99 performance / 100 accessibility / 100 best
  practices / 100 SEO**; FCP 1.2 s, LCP 1.5 s, TBT 40 ms, CLS 0.06, transfer
  139 KiB.
- Build sizes: JS 63,018 B raw / 22,566 B gzip; CSS 16,053 B raw / 4,278 B
  gzip; fonts 118,264 B total; hero WebP 46,170 B. All budgets pass.

## Defects by severity

| Severity | Finding |
| --- | --- |
| Blocker | B-16-1: production `/health` reports `8f17bd2…`, not candidate `9f669994…` |
| Critical | None |
| Major | None |
| Minor | None |

No product-code change was made during verification.
