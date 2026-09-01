# First-read product QA review 5 — FAIL

- Product: In-Class Draft Ticket
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Reviewed: 1 September 2026 UTC
- Repository base: `e7a2eae6f8431227bd041765e73f04f01de6b765`
- Live build from `/health`: `e4a202425cb2fdcddb7f25d42aaa1ff6ecc88baf`
- Context: fresh Chromium contexts at 390 × 844 and 1440 × 900; separate clean clone for all claim commands
- Verdict: **FAIL — one minor finding remains.** No blocking finding or untested product claim remains, but PASS requires zero findings.

## Finding

### F-5-1 — Minor — the sitemap omits a public canonical route

**Exact location:** `public/sitemap.xml` lists `/?demo=1` but not `/demo`. The shared header links to `/demo`, that address returns 200, and its page declares `https://in-class-draft-ticket.sociobot.in/demo` as its canonical URL.

**Why this matters:** The sitemap does not list every canonical public route. A crawler can discover `/demo` from the header, but the machine-readable route inventory is incomplete and presents two equivalent demo addresses as separate canonical pages.

**Concrete fix:** Use `/demo` as the canonical demo address, add it to `sitemap.xml`, and point the landing demo action and README to it. Keep `/?demo=1` working as an alternate entry, but set its canonical link to `/demo`. Update the route metadata test to confirm both demo entries resolve to that one canonical URL.

## Cold first screen

**PASS.** Before scrolling, both fresh contexts answered all three questions:

- **What does this do?** It records students' drafting choices during class without monitoring their camera, microphone, or keystrokes.
- **For whom?** Writing teachers.
- **What should I click first?** **Try it with sample data.** The adjacent text says it will show three completed tickets.

The exact first-screen text was “Record in-class drafting without surveillance,” “For writing teachers recording student choices during class,” and “Try it with sample data.” The three facts about class nicknames, automatic expiry, and the 40-ticket free limit were visible inside the 390 × 844 viewport. The same check passed at 1440 × 900. Neither page produced a console error or horizontal overflow.

Evidence:

- `review-5-evidence/first-read-mobile.png`
- `review-5-evidence/first-read-desktop.png`

## Demo and storage separation

**PASS.** One click on the landing action opened `/?demo=1`. The first screen already showed Blue Finch's completed claim and revision, with realistic Beloved seminar data. The persistent banner said “Demo — sample data, nothing is saved to your classes” and included **Reset demo** and **Start for real**.

Reset created a different sample code and restored three tickets. A seeded `teacher:REAL01` browser value stayed unchanged through demo entry and reset. **Start for real** removed `demo:workspace`, preserved `teacher:REAL01`, and opened `/start`. Every observed landing and demo request stayed on the product origin; there was no analytics, model, CDN, media, or other third-party request. No console error appeared.

Evidence:

- `review-5-evidence/demo-one-click-mobile.png`
- `review-5-evidence/demo-one-click-desktop.png`

## Registered claims

All 13 commands in `.factory/claims.json` ran exactly as declared from a separate clean clone after `npm ci`. All passed.

| Claim | Declared command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2 browser projects |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2 browser projects |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2 browser projects |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2 browser projects |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2 browser projects |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2 browser projects |
| `data-storage-minimization` | `cargo test claim_data_storage_minimization -- --nocapture` | PASS — 1 Rust test |
| `no-ai-detection-or-authorship-verdict` | `npm test -- --grep @claim:no-ai-detection-or-authorship-verdict` | PASS — 2 browser projects |
| `free-no-account-core-flow` | `npm test -- --grep @claim:free-no-account-core-flow` | PASS — 2 browser projects |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2 browser projects |
| `runtime-defaults` | `cargo test claim_runtime_defaults -- --nocapture` | PASS — 1 Rust test |
| `health-build-identity` | `npm test -- --grep @claim:health-build-identity` | PASS — 2 browser projects |
| `release-contract` | `cargo build && node --test --test-name-pattern='@claim:release-contract' contract-tests/release-contract.test.mjs` | PASS — 1 contract test |

The live landing page, legal pages, demo, and README contain no unlisted behavioral, privacy, retention, capacity, price, or export claim. The MIT statement is confirmed by `LICENSE`, and the artwork statement is confirmed by the source asset and provenance record in `.factory/design.md`.

## Copy audit

Counts treat hyphenated terms, URLs, numbers, and a backticked command or path as one item. Commands and URL-only lines are not prose sentences. No sentence exceeds 22 words. No banned marketing word, vague effectiveness claim, inconsistent product term, or uninformative slogan remains.

### Landing-page sentences

| Sentence | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | Listed privacy claim |
| For writing teachers recording student choices during class. | 8 | Clear audience and situation |
| See three completed tickets. | 4 | Listed sample claim |
| Students use class nicknames. | 4 | Listed student-flow claim |
| Sessions expire automatically. | 3 | Listed retention claim |
| Free sessions accept up to 40 draft tickets. | 8 | Listed capacity claim |
| Each ticket records a claim, evidence location, revision, and exit reflection. | 11 | Listed student-flow claim |
| Students name one claim, one evidence location, one revision, and one exit reflection. | 13 | Listed student-flow claim |
| Memory acts like a second setting. | 6 | Fictional sample content |
| I moved the scene before my explanation. | 7 | Fictional sample content |
| Add the class name, prompt, and deletion date. | 8 | Direct instruction |
| Keep the private teacher link. | 5 | Listed teacher-control claim |
| Students use a class nickname and answer four short prompts. | 10 | Listed student-flow claim |
| Read each ticket beside the draft. | 6 | Direct instruction |
| Export the full session as CSV. | 6 | Listed CSV claim |
| Teachers can read each ticket beside the student's draft. | 9 | Listed student-flow claim |
| The ticket does not judge who wrote a draft. | 9 | Listed authorship-boundary claim |
| Record in-class drafting without surveillance. | 5 | Footer repeat; listed privacy claim |

### Landing headings, labels, and actions

| Text | Words | Check |
| --- | ---: | --- |
| Classroom drafting record | 3 | Names the product category |
| Live preview | 2 | Names the preview |
| Four drafting prompts | 3 | Names the preview contents |
| How it works in three steps | 6 | Names the process and count |
| How it works | 3 | Clear section heading |
| Create a session | 3 | Result-naming step |
| Share the code | 3 | Result-naming step |
| Review the choices | 3 | Result-naming step |
| Clear boundaries | 2 | Supports the specific section heading |
| What this does not do | 5 | Clear section heading |
| Try it with sample data | 5 | Result-naming primary action |
| Start a class session | 4 | Result-naming real action |
| No AI detection | 3 | Listed boundary claim |
| No webcam or microphone | 4 | Listed privacy claim |
| No keystroke logging | 3 | Listed privacy claim |
| No claim of proving authorship | 5 | Listed authorship-boundary claim |

Header and footer items name destinations. No action uses Submit, Go, or Continue. The landing headings remain understandable outside their visual context.

### README sentences

| Sentence | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | Listed privacy claim |
| In-Class Draft Ticket is for writing teachers who want a short process record during class. | 15 | Clear audience statement |
| A teacher creates a session with a deletion date and shares its six-character code. | 14 | Listed retention and student-flow claims |
| Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. | 15 | Listed student-flow claim |
| The teacher reviews the tickets and exports the full session as CSV. | 12 | Listed student-flow and CSV claims |
| It does not detect AI, record keystrokes, use cameras, or claim to prove authorship. | 14 | Listed privacy and authorship claims |
| Open `/?demo=1` for a sample session with three completed tickets. | 10 | Listed sample claim; route consolidation is F-5-1 |
| Demo work stays separate from your classes and expires after 24 hours. | 12 | Listed sample claim |
| Choose Reset demo for fresh sample data. | 7 | Listed sample claim |
| Requirements: Node 22+, npm, and the current stable Rust toolchain. | 10 | Setup requirement |
| Open `http://localhost:8080`. | 2 | Run instruction |
| For frontend development, run `cargo run` and `npm run dev` in separate terminals. | 10 | Run instruction |
| `PORT` defaults to `8080`. | 4 | Listed runtime claim |
| SQLite stores runtime state in `/data/tickets.db` when `/data` is mounted and `./data/tickets.db` otherwise. | 13 | Listed runtime claim |
| `DATA_DIR` chooses another local path. | 5 | Listed runtime claim |
| `GET /health` returns the build SHA and selected storage backend. | 9 | Listed health claim |
| Factory workers deploy a clean, pushed `main` commit with `DEPLOY_IMAGE=<immutable-image> npm run deploy:release`. | 10 | Operator instruction |
| The release gate requires one ready replica, one mounted `/data` volume, and no runtime secrets. | 15 | Listed release-contract claim |
| Sessions expire after the teacher's chosen one, seven, or thirty days. | 11 | Listed retention claim |
| Free sessions accept up to 40 draft tickets. | 8 | Listed capacity claim |
| Teachers can delete a session early. | 6 | Listed teacher-control behavior |
| See `/privacy` and `/terms` for the full plain-language policies. | 9 | Link instruction; both routes return 200 |
| There is no paid plan. | 5 | Listed free-use claim |
| Teachers and students can use the core workflow for free and without an account. | 14 | Listed free-use claim |
| `.factory/brief.json` records the product scope. | 5 | Repository note |
| `.factory/design.md` records the visual system and artwork provenance. | 8 | Repository note |
| `.factory/demo.md` explains demo isolation. | 4 | Repository note |
| `.factory/copy-audit.md` records the plain-language audit. | 5 | Repository note |
| `.factory/handoff.md` records verification results and known gaps. | 7 | Repository note |
| MIT licensed. | 2 | Confirmed by `LICENSE` |
| Built by Param Factory. | 4 | Attribution |

README headings—Try the demo, Run locally, Test, Container, Release, Privacy and limits, and Project notes—name their sections. Technical terms appear only in the developer run, container, and release sections and name actual commands or configuration.

### Terminology

| Concept | Term used consistently |
| --- | --- |
| Teacher-created collection period | session |
| One student's process record | draft ticket / ticket |
| Student identifier | class nickname |
| Teacher-only recovery URL | private teacher link |
| Sample environment | demo / sample data |
| Fourth drafting checkpoint | exit reflection |
| Download | CSV export |

## Earlier-finding reconciliation

The current tree no longer contains the earlier review and polish files, so their last committed versions were read from Git history. Each of the 20 earlier findings was checked again in current source and on the live product.

| Earlier ID | Current confirmation |
| --- | --- |
| F-1-1 | AI/authorship and free/no-account statements have focused claims; all relevant tests pass. |
| F-1-2 | The direct 404 returns status 404 with the shared shell, legal links, metadata, icons, and one h1. |
| F-1-3 | Demo and Privacy remain visible in the 390 px header; all header and footer targets are at least 44 px. |
| F-1-4 | No current landing or README sentence exceeds 22 words. |
| F-2-1 | Privacy gives the tested data inventory; the database-minimization test passes. |
| F-2-2 | Blue Finch's completed ticket is visible in the initial mobile and desktop demo viewport. |
| F-2-3 | All three required facts are visible in the initial 390 px landing viewport. |
| F-2-4 | The sample claim and manual live check preserve seeded real browser and backend data through entry, reset, and exit. |
| F-2-5 | The privacy test types in every field, confirms no request or storage change, and allows only documented same-origin paths. |
| F-2-6 | The demo claim states and confirms a 24-hour expiry. |
| F-2-7 | The former effectiveness sentence is replaced by the four factual ticket fields. |
| F-2-8 | The former feedback statement is replaced by the concrete teacher read action. |
| F-2-9 | The hero audience sentence is factual and no longer calls the record “useful.” |
| F-2-10 | README uses sample session, demo, and classes consistently. |
| F-2-11 | README says “session with a deletion date,” not “timed session.” |
| F-2-12 | Both direct and client-rendered 404 pages use “Page not found.” |
| F-2-13 | Raw and client-rendered social descriptions use factual product copy. |
| F-3-1 | No production-changing topology command remains in the claim registry; the current release-contract claim uses local fixtures and passes. |
| F-4-1 | Landing, form, README, and teacher sheet use “exit reflection” for the fourth checkpoint. |
| F-4-2 | Landing, terms, README, and claim use “up to 40 draft tickets” for the session limit. |

No earlier ID is reissued because none has regressed.

## Structure, accessibility, privacy, and visual identity

- The live suite passed 56 checks in 1.5 minutes; four local-only rate-window cases were skipped on the live URL as designed. The separate HTTP/2 live rate check confirmed exactly 40 ordinary responses, then 10 rate-limited responses with `Retry-After: 1`.
- `/`, `/?demo=1`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` return 200. A direct unknown route returns a designed 404 with status 404.
- Every checked public route has `lang="en"`, one h1, one main landmark, a route-specific title, a plain description, a canonical URL, Open Graph and Twitter metadata, SVG favicon, and 180 × 180 Apple icon.
- The social image is a 1200 × 630 WebP derived from the product art. All meaningful images have alt text.
- Route changes focus the new h1 and announce the page. Deep links, browser Back scroll restoration, skip-link order, keyboard operation, reduced motion, offline shell reload, 200% text reflow, and 44 px targets pass.
- Axe found no serious or critical issue on the public routes at phone and desktop sizes. No checked route logged a console error.
- Every real navigational destination returned 200. The intentionally missing route returned 404, same-document fragments resolve to existing targets, and the privacy email is an explicit `mailto:` action.
- Response headers include `nosniff`, strict-origin referrer policy, and a CSP with `frame-ancestors 'none'`. Demo traffic stayed same-origin.
- Initial JavaScript is 23.59 kB gzip, below the 150 kB limit.
- The cream paper field, Fraunces and Atkinson pairing, clipped ticket corners, plotted geometry, generated still life, dark teacher sheet, and disconnected-point 404 match `.factory/design.md`. The result is distinct from a generic SaaS template.
- F-5-1 is the only structure exception.

## Missed leverage

No additional feature is an obvious requirement of the brief. The product already provides the expected teacher session, student ticket, automatic deletion, CSV export, and isolated sample. Automated writing analysis would conflict with the stated role of recording choices without judging authorship. A roster import or long-lived sync would add student data beyond the brief. No model provider key or model request appears in the source or live request log.

## What would make this perfect

Resolve F-5-1 by choosing `/demo` as the single canonical demo route and listing it in `sitemap.xml`. Confirm that both demo entry addresses still work, both declare `/demo` as canonical, the header and landing action use `/demo`, and the route crawl remains clean. With that one structure correction and no regression, nothing else remains to do.
