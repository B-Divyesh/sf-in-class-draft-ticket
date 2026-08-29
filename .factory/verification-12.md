# Independent product verification 12 — PASS

- Candidate commit: `2f73b680e973d1d13f2aef112b6cbae2fc5ea4d4`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-12`
- Decision: **PASS — release candidate verified**

The live health endpoint reports exactly the candidate SHA, PostgreSQL storage,
and one stable replica identity. The built JavaScript, CSS, service worker, and
hero WebP fetched from production had the same SHA-256 digests as this clean
checkout's production build.

## Mandatory claim gate

`.factory/claims.json` exists. Before broader QA, a clean `npm ci` was run and
every listed command was run against the product demo/test entry point. All
passed:

| Claim | Command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS |
| `production-topology` | `npm run test:production-topology` | PASS |

## First-read and demo gate

**PASS.** A cold desktop load plainly says it records in-class drafting without
surveillance, names writing teachers as the intended users, and presents one
visible `Try it with sample data` action with the explanation “See three
completed tickets.” The first action opens `/demo`.

A fresh demo visit displayed the persistent “Demo — sample data, nothing is
saved to your classes” banner, three realistic fictional tickets, and only the
`demo:workspace` browser-storage key. Its requests remained same-origin.

## End-to-end and backend checks

Fresh live API/browser checks covered session creation, student submission,
teacher-only read/export/delete, CSV export, and cleanup. Invalid class input
returned a specific `400`; invalid retention returned `400`; a 501-character
reflection returned `400`; exact maximum field values were accepted. CSV
neutralized a formula-prefixed value.

The concurrent capacity exercise submitted 45 tickets to one new session:
40 returned `201`, one returned the expected `409` capacity response, and four
were rate-limited. The authenticated teacher view contained exactly 40 tickets;
the CSV contained its header plus 40 data rows. Deletion returned `204` and the
session then returned `404`.

The burst also verified the server allowance: after 40 requests in one
one-second window for the observed client, the API returned `429` with
`Retry-After: 1`. `/health` is intentionally exempt and returned the candidate
SHA, `storage_backend: "postgres"`, and a replica diagnostic ID. The local
release binary also started with no configuration on default port 8080,
selected durable SQLite as designed for non-managed use, and exposed `/health`.
Production topology/persistence is additionally covered by the passing
PostgreSQL one-replica/revision-restart contract claim.

No sign-in is required, so the Entra tenant check is not applicable.

## Live quality, privacy, and accessibility

- All public deep links (`/demo`, `/join`, `/start`, `/privacy`, `/terms`,
  `/session/ABCDEF`, `/teacher/ABCDEF`) return document status `200`.
- A fresh request log across landing and demo contained only
  `https://in-class-draft-ticket.sociobot.in`; no media-capture or tracking
  requests occurred. There were no console or page errors.
- Desktop and 390 px mobile axe scans on landing, demo, join, start, privacy,
  and terms had zero serious or critical findings. No horizontal overflow was
  observed. Mobile navigation/footer controls measured at least 44 px high.
- Keyboard starts on the visible 3 px skip-link focus ring. Reduced-motion
  emulation produced `scroll-behavior: auto` and zero running animations.
- The service worker controlled the page with cache `draft-ticket-v2`; an
  offline reload showed the landing heading successfully.
- Responses send CSP with `frame-ancestors 'none'`, `nosniff`, strict-origin
  referrer policy, and immutable one-year caching for hashed assets/fonts.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; FCP 1.2 s, LCP 1.5 s, TBT 50 ms, CLS 0.029.
- Production build output: JavaScript 61.63 kB raw / 22.47 kB gzip; CSS
  14.61 kB raw / 4.02 kB gzip. These meet the stated budgets.

## Local quality gates

```text
npm ci                                                     PASS (0 vulnerabilities)
npm test                                                   PASS (46/46 Playwright; 12/12 contracts)
npx tsc --noEmit                                           PASS
cargo fmt --all -- --check                                 PASS
cargo clippy --all-targets --all-features -- -D warnings   PASS
cargo test --all-targets --all-features                    PASS (8/8)
cargo build --release                                      PASS
npm run build                                              PASS; dist/ produced
npm audit --audit-level=high                               PASS (0 vulnerabilities)
PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test
                                                           PASS (46/46)
```

Docker is not installed in this disposable verifier image, so a local
container build could not be run. The optimized service and frontend production
builds did pass; the claimed production deployment identity and runtime checks
were independently confirmed live.

## Defects

No release-blocking, major, medium, or low defects found in this verification.

