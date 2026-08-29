# Independent product verification 9 — FAIL

- Candidate: `69b73de2be2cf38300ea054fd30526a27c816f00`
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Verified: 29 August 2026 UTC
- Work order: `in-class-draft-ticket-verify-9`
- Result: **FAIL — do not release**

## Decision

The repository is buildable and its eight declared claim commands pass locally,
but the deployed candidate is not a working backend product. `/health` identifies
the exact requested SHA while reporting SQLite, and fresh requests reach three
separate replica IDs. Sessions written to one replica are absent on the others.
This breaks the required one-click demo and makes the teacher/student workflow
nondeterministic. The full local `npm test` suite also fails two checks.

## Required first-read and demo gate

- **First-read: PASS.** A cold landing page says what it does: “Record
  in-class drafting without surveillance”; who it is for: writing teachers who
  need evidence of student choices; and what to do first: **Try it with sample
  data** / “See three completed tickets.”
- **Demo gate: FAIL.** The action is visible on the first screen, but a fresh
  browser visit to `/demo` received `POST /api/demo → 201`, immediately followed
  by `GET /api/teacher/9XGXA4 → 401`. The page showed “This teacher link is not
  valid” and **Reload sample data**, not the three sample tickets. Three direct
  fresh demo create/read pairs also returned `201` then `401`.

## Release-blocking defects

### Critical — deployed replicas use isolated SQLite state

- `GET /health` returned HTTP 200 with exact build SHA
  `69b73de2be2cf38300ea054fd30526a27c816f00`, but
  `storage_backend: "sqlite"`.
- Fresh live responses exposed three process identities:
  `8ebc1b6139164c64baa4a665e08c6627`,
  `68a49520a3f34e9580c28292da053f98`, and
  `93a901247d7f4f7d81cd0717475f79b5`. This contradicts the committed claim of
  one PostgreSQL-backed replica.
- A newly created demo session was read repeatedly through those replicas. A
  request on one replica could return student `200` or teacher `200`, while the
  same session on either other replica returned student `404` and teacher/export
  `401`. For example, at 1,000 ms the student read and CSV export were `200`
  from replica `8ebc…`, while a teacher read from `68a4…` was `401`.
- A real 1-day QA session likewise returned `201` when created, then student
  `404`, ticket submission `404`, and teacher `401` when routed elsewhere.
  This is a deployment failure with direct loss of core functionality, not a
  stale SHA.

### Major — required local quality gate fails

`npm test` ran 36 Playwright tests and failed two: desktop and mobile instances
of `public routes pass desktop and 390px accessibility checks without console
errors`. Both exceeded the configured 30-second test timeout while repeatedly
running axe; failure traces are in `test-results/`. The suite therefore does
not meet the required passing quality gate, even though an independent
sequential live axe scan found no serious or critical violations.

### Major — console errors on the live demo

The broken `/demo` flow logs `Failed to load resource: the server responded
with a status of 401 ()` in Chromium. This violates the no-console-errors
baseline and is visible to a teacher trying the required sample experience.

## Local verification

Clean checkout began at the requested SHA with no worktree changes.

- `npm ci`: pass; 0 audited vulnerabilities.
- Every command listed in `.factory/claims.json`: **pass**:
  `@claim:sample-demo`, `csv-export`, `pseudonymous-flow`,
  `session-retention`, `free-capacity`, `privacy-minimal`, `teacher-control`,
  and `npm run test:production-topology`.
- `cargo test`: pass, 6/6.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass; initial JS is 61,635 bytes raw / 22.47 kB gzip and
  CSS is 14,613 bytes raw / 4.02 kB gzip.
- `npm test`: **FAIL** as described above. It did pass the 10 release-contract
  tests before the two Playwright timeout failures.
- The Docker daemon is unavailable in this verifier container, so a Docker
  image build could not be executed. The Dockerfile was reviewed and
  `cargo build --release` was run separately.

## Live browser, privacy, and platform checks

- Landing-page request log was same-origin only: document, local JS/CSS,
  self-hosted fonts, and the product image. No media capture call was observed.
  The demo request log was also same-origin, but its own authenticated request
  failed as described above.
- `GET /health` is `Cache-Control: no-store, max-age=0`. Hashed JS, CSS, and
  fonts use `public, max-age=31536000, immutable`. CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, and `frame-ancestors 'none'` were present.
- A same-client 45-request burst to an API read endpoint observed **40 × 404,
  then 5 × 429**, each `429` carrying `Retry-After: 1`; observed allowance:
  40 requests/second. This does not repair the replica-local persistence
  failure.
- Independent axe scans of `/`, `/demo`, `/join`, `/start`, `/privacy`, and
  `/terms` at 1440 px and 390 px found no serious/critical issues and no
  horizontal overflow. Keyboard starts on the skip link with a visible
  `3px` cobalt focus ring. Reduced-motion had no active animations. The PWA
  installed `draft-ticket-v2` and reloaded the landing shell offline.

## Required repair before re-verification

Deploy the candidate through the committed deployment gate with the PostgreSQL
`DATABASE_URL` secret binding and a single replica, then prove one session can
be created, read as student and teacher, exported, and deleted across fresh
connections. Re-run `npm test` until all 36 checks pass, including the public
route accessibility test, before requesting verification again.
