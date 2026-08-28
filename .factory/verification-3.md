# Independent product verification — FAIL

- Candidate: `e267a8283bef762a94f283d6d8287c1f80e59e57`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 28 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-3`
- Result: **FAIL — do not release**

The local product is buildable and its automated suite passes. The live service reports the exact candidate SHA and serves byte-identical frontend assets. However, production is running three replicas with no durable volume. Each replica has a different SQLite database. The core teacher/student flow and the mandatory one-click demo therefore fail according to which replica handles the next request.

## Release-blocking findings

### Critical — live class and demo data is split across three ephemeral replicas

Fresh Azure read-only inspection returned:

```text
revision:        sf-in-class-draft-ticket--0000009
image:           sociobotregistry.azurecr.io/sf-in-class-draft-ticket:e267a8283bef
revision mode:   Single
active replicas: 3
min/max:         1 / 3
volumes:         null
volume mounts:   null
environment:     PORT=8080 only
```

This contradicts `deployment/containerapp-contract.json`, which requires one replica and an Azure Files volume mounted at `/app/data`. The application opens a process-local SQLite database and checkpoints to `/app/data`; without the mount, each replica keeps unrelated state on ephemeral container storage.

A fresh live API session demonstrated the effect:

```text
POST /api/sessions                          201
30 × GET /api/sessions/<new code>           10 × 200, 20 × 404
30 × authenticated GET /api/teacher/<code> 10 × 200, 20 × 401
authenticated DELETE attempts               401, then 204
```

The same defect breaks the required demo. Nine fresh browser contexts each opened `/`, clicked **Try it with sample data** once, and waited for the seeded teacher sheet. Results: **0/9 loaded the three tickets**. Every attempt showed “This teacher link is not valid. Use the link saved when the session was created.” Screenshot: [live-demo-failure.png](qa-evidence/live-demo-failure.png).

This is not a stale-deployment result. `/health` returned the exact candidate SHA, and the live HTML, JavaScript, CSS, hero image, service worker, and manifest were byte-identical to the local `dist/` build.

The full production Playwright run passed 32/32 immediately before the service scaled out. Subsequent browser traffic caused three replicas to become active and made every fresh demo attempt fail. The automated pass therefore does not prove the product under its configured production scale boundary.

### Major — the live per-client API allowance is multiplied by replicas and the forwarded address is spoofable

The application code allows 40 requests per second per first `X-Forwarded-For` value. A live 180-request burst with one fixed value returned:

```text
120 × 404
 60 × 429, each with Retry-After: 1
```

The effective live allowance is therefore **120 requests per second**, three times the intended 40, because each replica maintains a separate in-memory limiter. In addition, public requests can supply the first `X-Forwarded-For` value. The same client sent 180 concurrent requests while rotating that header and received **180 ordinary responses and no 429**. The ingress must overwrite untrusted forwarding headers, or the application must use a trusted client-IP value.

The separate Sociobot license-verification endpoint did enforce its own limit: a 60-request burst returned 30 × 200 and 30 × 429 with `Retry-After: 4`. The observed burst allowance was 30.

### Major — three claim tests do not prove their complete listed claims

All eight listed commands pass, but these assertions are narrower than the promises in `.factory/claims.json`:

- `session-retention` asserts only the returned expiry timestamp. It never observes a session expire or be deleted.
- `paid-presets` saves one preset. It does not prove that ten can be saved or that the eleventh is rejected.
- `teacher-control` checks unauthorized teacher read and authenticated deletion. It does not assert that unauthenticated CSV export is rejected.

The source currently appears to implement these boundaries, but the claims contract requires the observable promise itself to be tested.

## Other findings

### Medium — the mobile home link is a 25 px touch target

At 390 px, the Draft Ticket wordmark/home link measured 25 px high. Other tested header and footer links meet 44 px. The attached accessibility baseline requires every interactive target to be at least 44 px.

### Low — the landing copy audit is stale

`.factory/copy-audit.md` still records removed `$24 one-time license` and checkout/refund copy, while omitting the current “sales are not available” copy. The visible page itself remains plain and understandable.

## Mandatory claim commands

`.factory/claims.json` exists. From the clean candidate checkout after `npm ci`, every exact command was run separately against the local demo/server entry point. Each passed in both configured Chromium projects.

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2/2 |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2/2 |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2/2 |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2/2; incomplete assertion noted above |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2/2 |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2/2 |
| `paid-presets` | `npm test -- --grep @claim:paid-presets` | PASS — 2/2; incomplete quantity assertion noted above |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2/2; export authorization not asserted |

Each claim ID occurs exactly once in the browser-test source.

## First-read and one-click demo gate

The wording portion passes at desktop and 390 px:

- What it does: “Record in-class drafting without surveillance.”
- For whom: “For writing teachers who need useful evidence of student choices during class.”
- What to click first: “Try it with sample data,” followed by “See three completed tickets.”

The headline, audience, and demo action are visible without scrolling at both tested sizes. Evidence: [live-first-read-desktop.png](qa-evidence/live-first-read-desktop.png) and [live-mobile-first-screen.png](qa-evidence/live-mobile-first-screen.png).

The combined mandatory gate nevertheless **fails** because the one-click action did not load its sample data in any of nine fresh post-scale attempts.

## Local build and functional verification

```text
npm ci                                                    PASS; 0 vulnerabilities
each of 8 exact claim commands                            PASS; 2/2 each
npm test (standalone)                                     PASS; 32/32 + 3/3 contracts
npx tsc --noEmit                                          PASS
npm run build                                             PASS; dist/ produced
cargo fmt --all -- --check                                PASS
cargo clippy --all-targets --all-features -- -D warnings PASS
cargo test --all-targets --all-features                   PASS; 3/3
cargo build --release                                     PASS
npm audit --audit-level=high                              PASS; 0 vulnerabilities
```

An earlier `npm test` invocation was intentionally run in parallel with the first five-minute release compilation. Two repeated axe scans timed out under CPU contention while 30 tests passed. The required standalone rerun passed 32/32 in 60 seconds.

Docker is not installed in the verification container, so a fresh local `docker build` was unavailable. The frontend and release backend stages built directly, the Dockerfile uses `rust:1-alpine`, and the live image identifies the candidate.

Independent local API checks passed:

- Exact 80-character class name, 240-character prompt, 40-character nickname, 280-character checkpoint fields, and 500-character reflection were accepted.
- Too-short and over-limit values returned specific 400 errors; invalid retention returned 400.
- Missing and wrong teacher tokens returned 401; a valid token returned the complete ticket.
- CSV returned the expected content type, attachment filename, header, and data row.
- The concurrent free-capacity test stored exactly 40 tickets and rejected five overflow submissions.
- A 100-request local load completed in 299 ms with 100 × 200.
- With only `PORT` supplied, a 32,768-byte checkpoint survived graceful stop/restart; authenticated read returned 200 and cleanup returned 204.

## Live browser, accessibility, privacy, and PWA checks

- `PLAYWRIGHT_BASE_URL=https://in-class-draft-ticket.sociobot.in npx playwright test` initially passed 32/32 across desktop Chromium and Pixel 5. The later scale-out reproduction above supersedes that transient pass for session consistency.
- Root, demo, join, start, privacy, terms, student, and teacher document routes return 200. The styled missing page returns 404. All discovered internal and external links returned 200; the privacy mail address is explicit.
- Axe reported zero serious/critical findings on all public routes at desktop and 390 px. Lighthouse accessibility was 100.
- The first keyboard focus is the skip link with a visible 3 px cobalt outline. Route changes focus the new heading. There were no keyboard traps.
- At 390 px there was no horizontal overflow. A 200% zoom smoke had no clipped text or horizontal overflow. The wordmark target exception is reported above.
- Reduced-motion emulation produced `scroll-behavior: auto` and zero running animations.
- A fresh Playwright request log for the landing page contained only the product origin. There were no console or page errors. The privacy claim test also observed only same-origin traffic through landing-to-demo and no media API use.
- Browser-observed headers include CSP with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Hashed JS/CSS, fonts, and the hero WebP return `Cache-Control: public, max-age=31536000, immutable`.
- The service worker installed and updated `draft-ticket-v2`; offline reload rendered the landing page and offline notice.
- No sign-in is required, so the Sociobot Entra tenant check is not applicable.

## Performance and bundle budgets

Fresh mobile Lighthouse results:

```text
Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100
FCP 1.2 s · LCP 1.5 s · TBT 90 ms · CLS 0.029 · Speed Index 1.2 s
```

```text
JavaScript  66,933 bytes raw / 23,832 gzip
CSS         14,344 bytes raw / 3,959 gzip
Fonts       118,264 bytes total
Hero WebP    46,170 bytes
```

All declared performance budgets pass.

## Release decision

**FAIL. Do not release.** Apply the committed deployment contract to production: one replica and the durable `/app/data` volume, or migrate to a genuinely shared database before allowing multiple replicas. Then rerun the one-click demo and repeated teacher/student reads under scale. Also make rate limiting cluster-wide and resistant to user-supplied forwarding headers, complete the three claim assertions, and enlarge the mobile home-link target.
