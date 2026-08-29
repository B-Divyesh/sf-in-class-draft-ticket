# Independent product verification 15 — PASS

- Candidate commit: `233798a4d8a30cb308a7c4c456098d69a057fcf4`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-15`
- Decision: **PASS — candidate is releasable.**

## First-read and demo gate

**PASS.** In a new desktop browser context, the first screen said:

- What: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers recording student choices during class.”
- What to do first: **Try it with sample data** — “See three completed tickets.”

The action was one click, opened `/?demo=1`, and showed the persistent “Demo —
sample data, nothing is saved to your classes” bar, Reset demo, Start for real,
and three fictional completed tickets. The 390×844 first viewport also held the
plain-language explanation and a 202×51 px sample-demo action with no horizontal
overflow. Cold-load requests were only same-origin HTML, JS, CSS, self-hosted
fonts, and the product illustration; there were no console or page errors.

## Mandatory claims gate

After `npm ci` in this clean checkout, all 11 commands in
`.factory/claims.json` were invoked independently through their declared demo
entry points. They passed. The full local suite subsequently passed all tagged
claims again, and the former flaky privacy claim also passed a 40-run stress
repeat (20 desktop + 20 mobile, `--retries=0`).

| Claim | Result and observable evidence |
| --- | --- |
| `sample-demo` | PASS — isolated three-ticket demo, reset and 24-hour expiry |
| `csv-export` | PASS — header plus all three demo ticket rows |
| `pseudonymous-flow` | PASS — four student checkpoints shown to teacher |
| `session-retention` | PASS — one, seven, and thirty-day choices and cleanup |
| `free-capacity` | PASS — exactly 40 accepted, overflow rejected |
| `privacy-minimal` | PASS — no requests while typing, exact same-origin submission path, no capture; 40/40 stress pass |
| `data-storage-minimization` | PASS — Rust storage-inventory and deletion test |
| `no-ai-detection-or-authorship-verdict` | PASS — no detection/verdict controls or endpoints |
| `free-no-account-core-flow` | PASS — teacher/student workflow without sign-in or payment |
| `teacher-control` | PASS — unauthenticated read/export/delete rejected; private token accepted |
| `production-topology` | PASS — exact release gate completed; it built/deployed the candidate, restarted the active revision, and final live health reported this SHA and PostgreSQL |

## Local quality gates

All passed from this clean checkout:

```sh
npm ci
npm test                                  # 13 contract tests; 56/56 Playwright tests
npx tsc --noEmit
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test                                # 9/9
cargo build --release
npm run build                             # dist/ produced
npm audit --audit-level=high              # 0 vulnerabilities
```

The production build is 63.01 kB raw / 22.87 kB gzip JavaScript and 16.05 kB
raw / 4.29 kB gzip CSS. Self-hosted fonts total 118,264 bytes and the landing
hero is 46,170 bytes. Docker/Podman are unavailable in this worker, but the
declared topology gate built the multi-stage image in ACR and exercised the
deployed candidate.

## Live evidence

- `GET /health` returned HTTP 200 with
  `build_sha: 233798a4d8a30cb308a7c4c456098d69a057fcf4`,
  `storage_backend: postgres`, and `Cache-Control: no-store, max-age=0`.
  The restart gate changed the observed replica from
  `17886496a386499294276677f4292d54` to
  `f648b18b483b450eb1caef0c42e89c66`.
- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test`
  passed 56/56. It exercises normal flow, invalid inputs and retryable
  submission failure, retention, capacity, private teacher controls, deep
  links, history, mobile reflow, keyboard behavior, PWA offline reload/update,
  headers, and accessibility.
- A fresh 45-request burst to `/api/sessions/ABCDEF` returned 40×404 and
  5×429. Each 429 had `Retry-After: 1`; observed allowance is **40 requests
  per client per one-second window**.
- `/opt/fleet/lib/verify-url.sh` passed: title, `lang=en`, one h1, main,
  image alt text, labels, screenshots, and no console errors. Axe scans at
  390 px with reduced motion found zero serious/critical violations on `/`,
  `/demo`, `/join`, `/start`, `/privacy`, and `/terms`.
- Response headers include header-delivered CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. Hashed JS and font
  assets have one-year immutable caching. `/404` returns HTTP 404.
- Privacy request logging across cold load, demo, and the full browser flow
  found no third-party analytics, tracking, media capture, CDN font, payment,
  or AI calls. No sign-in is used, so the Entra tenant requirement is not
  applicable.

Artifacts generated in this verification are in
`.factory/verification-artifacts-15/`.

## Defects by severity

| Severity | Finding |
| --- | --- |
| Blocker | None |
| Critical | None |
| Major | None |
| Minor | None |

The three verification-14 blockers are resolved: the privacy claim was stable
under 40 clean repetitions, live build identity matches the candidate, and the
production-topology command now performs the observable release/restart gate.
