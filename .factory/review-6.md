# Adversarial first-read review 6 — PASS

- Product: In-Class Draft Ticket
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Reviewed: 1 September 2026 UTC
- Repository base: `5ff32acb0be6930a26ca187e11475b77f502b258`
- Live build from `/health`: `aa987380d6e85b95ed170925fbc82ef36d29e3f8`
- Context: fresh Chromium contexts at 390 × 844 and 1440 × 900; separate clean clone for all claim commands
- Verdict: **PASS — zero findings.** No blocking or minor defect, unlisted claim, untested claim, or regressed earlier finding remains.

## Cold first screen

Before scrolling, the mobile and desktop screens answered all three questions:

- **What does this do?** It records the choices students make while drafting in class, without surveillance.
- **For whom?** Writing teachers.
- **What should I click first?** **Try it with sample data.** The adjacent text says the result is three completed tickets.

The exact copy was “Record in-class drafting without surveillance,” “For writing teachers recording student choices during class,” and “Try it with sample data” / “See three completed tickets.” The three facts ended at y=652, 683, and 714 in the 844 px phone viewport. They also fit in the 900 px desktop viewport. Neither layout had horizontal overflow, a console error, a page error, or a cross-origin request.

## Copy audit

Counts treat hyphenated terms, URLs, numbers, and a backticked path or command as one item. Commands, code blocks, and URL-only lines are not prose sentences. No sentence exceeds 22 words. No banned word, marketing adjective, jargon outside the developer sections, inconsistent product term, metaphor heading, mood slogan, or non-result-naming action remains.

### Landing-page sentences

| Sentence | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| For writing teachers recording student choices during class. | 8 | Clear audience and situation |
| See three completed tickets. | 4 | `sample-demo` |
| Students use class nicknames. | 4 | `pseudonymous-flow` |
| Sessions expire automatically. | 3 | `session-retention` |
| Free sessions accept up to 40 draft tickets. | 8 | `free-capacity` |
| Each ticket records a claim, evidence location, revision, and exit reflection. | 11 | `pseudonymous-flow` |
| Students name one claim, one evidence location, one revision, and one exit reflection. | 13 | `pseudonymous-flow` |
| Memory acts like a second setting. | 6 | Fictional sample content |
| I moved the scene before my explanation. | 7 | Fictional sample content |
| Add the class name, prompt, and deletion date. | 8 | Direct instruction |
| Keep the private teacher link. | 5 | `teacher-control` |
| Students use a class nickname and answer four short prompts. | 10 | `pseudonymous-flow` |
| Read each ticket beside the draft. | 6 | Direct instruction |
| Export the full session as CSV. | 6 | `csv-export` |
| Teachers can read each ticket beside the student's draft. | 9 | `pseudonymous-flow` |
| The ticket does not judge who wrote a draft. | 9 | `no-ai-detection-or-authorship-verdict` |
| Record in-class drafting without surveillance. | 5 | Footer repeat; `privacy-minimal` |

### Landing headings, labels, and actions

“Classroom drafting record,” “Live preview,” “Four drafting prompts,” “How it works in three steps,” “How it works,” and “What this does not do” name their sections. “Create a session,” “Share the code,” and “Review the choices” name the three steps. “Clear boundaries” is a supporting label for the explicit “What this does not do” heading.

The actions name their results: **Try it with sample data**, **Start a class session**, **Reset demo**, **Start for real**, and **Export sample CSV**. Navigation labels name destinations. No Submit, Go, or Continue action appears. The four boundary labels state concrete exclusions: no AI detection, webcam or microphone, keystroke logging, or claim of proving authorship.

### README sentences

| Sentence | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| In-Class Draft Ticket is for writing teachers who want a short process record during class. | 15 | Clear audience statement |
| A teacher creates a session with a deletion date and shares its six-character code. | 14 | `pseudonymous-flow`, `session-retention` |
| Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. | 15 | `pseudonymous-flow` |
| The teacher reviews the tickets and exports the full session as CSV. | 12 | `csv-export` |
| It does not detect AI, record keystrokes, use cameras, or claim to prove authorship. | 14 | Registered privacy and authorship claims |
| Open `/demo` for a sample session with three completed tickets. | 10 | `sample-demo` |
| Demo work stays separate from your classes and expires after 24 hours. | 12 | `sample-demo` |
| Choose Reset demo for fresh sample data. | 7 | `sample-demo` |
| Requirements: Node 22+, npm, and the current stable Rust toolchain. | 10 | Setup requirement |
| Open `http://localhost:8080`. | 2 | Run instruction |
| For frontend development, run `cargo run` and `npm run dev` in separate terminals. | 10 | Run instruction |
| `PORT` defaults to `8080`. | 4 | `runtime-defaults` |
| SQLite stores runtime state in `/data/tickets.db` when `/data` is mounted and `./data/tickets.db` otherwise. | 13 | `runtime-defaults` |
| `DATA_DIR` chooses another local path. | 5 | `runtime-defaults` |
| `GET /health` returns the build SHA and selected storage backend. | 9 | `health-build-identity` |
| Factory workers deploy a clean, pushed `main` commit with `DEPLOY_IMAGE=<immutable-image> npm run deploy:release`. | 10 | Operator instruction |
| The release gate requires one ready replica, one mounted `/data` volume, and no runtime secrets. | 15 | `release-contract` |
| Sessions expire after the teacher's chosen one, seven, or thirty days. | 11 | `session-retention` |
| Free sessions accept up to 40 draft tickets. | 8 | `free-capacity` |
| Teachers can delete a session early. | 6 | `teacher-control` |
| See `/privacy` and `/terms` for the full plain-language policies. | 9 | Link instruction; both routes return 200 |
| There is no paid plan. | 5 | `free-no-account-core-flow` |
| Teachers and students can use the core workflow for free and without an account. | 14 | `free-no-account-core-flow` |
| `.factory/brief.json` records the product scope. | 5 | Repository note |
| `.factory/design.md` records the visual system and artwork provenance. | 8 | Repository note |
| `.factory/demo.md` explains demo isolation. | 4 | Repository note |
| `.factory/copy-audit.md` records the plain-language audit. | 5 | Repository note |
| `.factory/handoff.md` records verification results and known gaps. | 7 | Repository note |
| MIT licensed. | 2 | Confirmed by `LICENSE` |
| Built by Param Factory. | 4 | Attribution |

README headings—Try the demo, Run locally, Test, Container, Release, Privacy and limits, and Project notes—name their sections. Technical terms appear only where a developer needs them to run, test, or release the service.

### Terminology

| Concept | One term used |
| --- | --- |
| Teacher-created collection period | session |
| One student's process record | draft ticket / ticket |
| Student identifier | class nickname |
| Teacher-only recovery URL | private teacher link |
| Sample environment | demo / sample data |
| Fourth drafting checkpoint | exit reflection |
| Download | CSV export |

## Demo and sandbox

**PASS.** One click on the first action opened `/demo`. Before the backend workspace finished provisioning, the first screen already showed Blue Finch's completed claim and revision. The featured ticket ended at y=648 on the 844 px phone viewport and y=698 on desktop.

The persistent banner says “Demo — sample data, nothing is saved to your classes” and includes **Reset demo** and **Start for real**. A completed reset changed the six-character demo code, restored all three tickets, and preserved a seeded `teacher:REAL01` value. **Start for real** removed `demo:workspace`, retained the seeded real key, and opened `/start`.

The registered sample test also created a real backend session before demo entry. It confirmed that entry, reset, and exit left the authenticated real record unchanged. Demo state uses only `demo:workspace`; real teacher references use `teacher:<code>`. The demo API creates a separately marked 24-hour session.

The fresh landing/demo request log contained only `https://in-class-draft-ticket.sociobot.in`. The privacy test typed in every student field and observed no request or browser-storage change before submission. No analytics, model, media, CDN, or tracking request appeared.

## Registered claims

A clean clone at `/tmp/in-class-review6-clean.QEYEWt/repo` was created from the committed repository. `npm ci` completed first. Every command in `.factory/claims.json` then ran exactly as declared and passed.

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
| `release-contract` | `cargo build && node --test --test-name-pattern='@claim:release-contract' contract-tests/release-contract.test.mjs` | PASS — 1 local contract test |

The landing page, legal routes, demo, metadata, and README contain no claim-like sentence without a matching entry or direct repository fact. The MIT statement matches `LICENSE`; the generated-artwork statement matches the source asset and recorded provenance. There is no untested claim.

## Earlier-finding reconciliation

Reviews 1–4 and polish reports 1–4 were read from Git history; review 5, polish 5, and the prior handoff were read from the current tree. Every earlier finding was checked again in current source and on the live service.

| Earlier ID | Current live and source confirmation |
| --- | --- |
| F-1-1 | AI/authorship and free/no-account promises have focused claim entries; all relevant clean and live tests pass. |
| F-1-2 | `/not-a-route` returns HTTP 404 with the shared shell, legal links, complete metadata, icons, and one h1. |
| F-1-3 | Demo and Privacy remain visible in the 390 px header; the live mobile target checks pass. |
| F-1-4 | No landing or README sentence exceeds 22 words. |
| F-2-1 | `/privacy` gives the tested database inventory; hashed credentials and short-lived rate keys are present in code and the Rust claim passes. |
| F-2-2 | Blue Finch's completed claim and revision are visible in both initial demo viewports. |
| F-2-3 | All three required facts are visible in the initial 390 px viewport. |
| F-2-4 | The sample claim seeds real browser and backend data and proves it unchanged through demo entry, reset, and exit. |
| F-2-5 | The privacy claim types in every field, compares storage and requests, and enforces an exact same-origin path allowlist. |
| F-2-6 | The sample claim states and asserts exactly 24 hours; privacy and README use the same value. |
| F-2-7 | The former effectiveness sentence is replaced by the four factual ticket fields. |
| F-2-8 | The former feedback claim is replaced by the concrete read-and-export actions. |
| F-2-9 | The hero audience sentence is factual and no longer calls the record “useful.” |
| F-2-10 | README consistently uses demo, sample session, and classes without implementation jargon. |
| F-2-11 | README says “session with a deletion date,” not “timed session.” |
| F-2-12 | The direct and client-rendered 404 headings both say “Page not found.” |
| F-2-13 | Raw and hydrated social descriptions use factual product copy. |
| F-3-1 | No production-changing command is in the claim registry; the release claim uses local fixtures and passes. |
| F-4-1 | Landing, student form, README, and teacher view all use “exit reflection.” |
| F-4-2 | Landing, terms, README, and claim all say “up to 40 draft tickets.” |
| F-5-1 | `/demo` is the canonical landing/header/README/sitemap route; `/?demo=1` works and declares `/demo` canonical. |

No earlier ID is reissued because none is unfixed, half-fixed, or regressed.

## Structure, accessibility, and visual identity

- The full live Playwright suite passed 56 checks; four local-only rate-window cases were skipped as designed. Its route scans found no serious or critical axe issue, console error, page error, overflow, or missing accessible name.
- `/`, `/demo`, `/?demo=1`, `/join`, `/start`, `/privacy`, and `/terms` return 200. The direct unknown route returns a designed 404 with status 404.
- Each public route has `lang="en"`, one h1, one main landmark, a route-specific title, plain description, canonical, Open Graph and Twitter metadata, SVG favicon, Apple icon, consistent header, and footer.
- The social image is the product's 1200 × 630 artwork. The meaningful hero image has a purpose-specific alt description.
- Route navigation uses History API state, focuses and announces the new h1, restores Back-button scroll, and supports deep-link reloads. Keyboard flow, skip link, visible focus, 200% reflow, reduced motion, offline shell reload, and 44 px touch targets pass.
- All discovered internal routes and the external Param Factory link return 200. The privacy email is an explicit `mailto:` action. `robots.txt`, the six-route sitemap, icons, and social image return 200.
- Response headers include `nosniff`, strict-origin referrer policy, and a CSP with `frame-ancestors 'none'`. The observed browser traffic is same-origin.
- The clean Vite build produced `dist/`; initial JavaScript is 64.63 kB raw / 23.58 kB gzip, below the 150 kB limit.
- The cream paper field, Fraunces/Atkinson type pairing, clipped ticket corners, plotted geometry, generated still life, dark teacher sheet, and disconnected-point 404 match `.factory/design.md`. The result is recognisably product-specific, not a generic SaaS template.

## Missed leverage

No additional feature is an obvious requirement of the brief. The teacher can create a session, collect four drafting checkpoints, review tickets, export CSV, choose retention, and delete early. Automated writing analysis would conflict with the explicit no-detection/no-authorship boundary. A roster import or persistent sync would collect more student data than the brief calls for. No provider key, Azure endpoint, or model request appears in source or the live request log.

## What would make this perfect

Nothing remains to change for this review. Preserve the current copy, isolated demo, claim coverage, canonical route, storage boundaries, and accessibility regressions in future releases.
