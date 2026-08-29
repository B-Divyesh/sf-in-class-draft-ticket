# Adversarial first-read review 3 — FAIL

- Product: In-Class Draft Ticket
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Reviewed: 29 August 2026 UTC
- Repository base: `1dd2bef23ad9ccf137fc7452ca1e98d560a68570`
- Live build reported by `/health`: `233798a4d8a30cb308a7c4c456098d69a057fcf4`
- Context: fresh Chromium at 390 × 844 and 1440 × 900; service workers blocked for cold request checks
- Verdict: **FAIL — 1 blocking finding.** Ten sandbox-safe claim commands pass, but the remaining declared claim has no sandbox-safe test and was not run because it would deploy and restart production.

## First screen

Before scrolling, my answers were:

- **What does this do?** It records students' in-class drafting choices without cameras, keystroke logging, or an authorship verdict.
- **For whom?** Writing teachers.
- **What should I click first?** **Try it with sample data**, which says **See three completed tickets.**

This gate passes at both sizes. The exact first-screen copy is:

> “Record in-class drafting without surveillance”

> “For writing teachers recording student choices during class.”

> “Try it with sample data” / “See three completed tickets.”

At 390 × 844, all three facts also end above the fold: “Students use class nicknames.” at y=652, “Sessions expire automatically.” at y=683, and “Free for classes up to 40.” at y=714. The page has no horizontal overflow, console error, page error, or cross-origin request.

## Findings

### F-3-1 — BLOCKING — the production-topology claim has no sandbox-safe test

**Exact claim and location:** `.factory/claims.json`, `production-topology`: “The release deployment uses one PostgreSQL-backed replica and verifies a session survives a real revision restart.” README, Container: “Production supplies `DATABASE_URL` from Key Vault and runs one PostgreSQL-backed replica.” README also says the gate restarts the active revision and confirms the session remains available.

**Declared command:** `npm run test:production-topology`

**Evidence:** `deployment/test-production-topology.mjs` unconditionally invokes `deployment/deploy.sh`. That script runs `az acr build`, changes the Container App secret and image, updates its replica settings, creates live records, and runs `az containerapp revision restart`. It is a production deployment operation, not a clean-clone sandbox test. This work order says `deploy: none`, and `AGENTS.md` says never to touch infrastructure from this repository. The command was therefore not run. Prior verification evidence is not a substitute for rerunning every claim in this round.

**Why this is blocking:** The requested verdict requires no untested claim. A reviewer cannot prove this claim from the demo or a disposable local environment, and running the registered command would mutate production. The registry therefore makes a safe independent review impossible.

**Concrete fix:** Remove the production deployment statement from the product claims registry and keep the live deployment gate as release evidence only. Replace it with a sandbox claim such as “PostgreSQL sessions survive a server restart,” tested against a disposable PostgreSQL instance and two local server processes. If the production-specific sentence remains in README, label it as the latest release evidence with its SHA and evidence file rather than as a claim every reviewer must redeploy to test.

## Copy audit

Counts treat hyphenated terms, inline paths, URLs, and numbers as one word. No landing or README sentence exceeds 22 words. No banned marketing word, unexplained metaphor heading, inconsistent product term, or non-result-naming action was found.

### Landing-page sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| For writing teachers recording student choices during class. | 8 | Clear audience statement |
| See three completed tickets. | 4 | `sample-demo` |
| Students use class nicknames. | 4 | `pseudonymous-flow` |
| Sessions expire automatically. | 3 | `session-retention` |
| Free for classes up to 40. | 6 | `free-capacity`, `free-no-account-core-flow` |
| Each ticket records a claim, evidence location, revision, and next step. | 11 | `pseudonymous-flow` |
| Students name one claim, one evidence location, one revision, and one next step. | 13 | `pseudonymous-flow` |
| Memory acts like a second setting. | 6 | Fictional sample content |
| I moved the scene before my explanation. | 7 | Fictional sample content |
| Add the class name, prompt, and deletion date. | 8 | Instruction; `session-retention` |
| Keep the private teacher link. | 5 | `teacher-control` |
| Students use a class nickname and answer four short prompts. | 10 | `pseudonymous-flow` |
| Read each ticket beside the draft. | 6 | Instruction |
| Export the full session as CSV. | 6 | `csv-export` |
| Teachers can read each ticket beside the student's draft. | 9 | `pseudonymous-flow` |
| The ticket does not judge who wrote a draft. | 9 | `no-ai-detection-or-authorship-verdict` |
| Record in-class drafting without surveillance. | 5 | Footer repeat; `privacy-minimal` |

### Landing headings, labels, and actions

| Text | Words | Result |
| --- | ---: | --- |
| Classroom drafting record | 3 | Names the product category |
| Live preview | 2 | Names the preview |
| Four drafting prompts | 3 | Names the preview contents |
| How it works in three steps | 6 | Names the process and count |
| How it works | 3 | Section heading |
| Create a session | 3 | Result-naming step |
| Share the code | 3 | Result-naming step |
| Review the choices | 3 | Result-naming step |
| Clear boundaries | 2 | Informative label |
| What this does not do | 5 | Section heading |
| Try it with sample data | 5 | Required one-click demo action |
| Start a class session | 4 | Result-naming action |

Navigation labels—Demo, Join, Start a class, and Privacy—name destinations rather than form actions. There is no Submit, Go, or Continue button on the landing page.

### README sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| In-Class Draft Ticket is for writing teachers who want a short process record during class. | 15 | Audience statement |
| A teacher creates a session with a deletion date and shares its six-character code. | 14 | `session-retention` |
| Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. | 15 | `pseudonymous-flow` |
| The teacher reviews the tickets and exports the full session as CSV. | 12 | `csv-export` |
| It does not detect AI, record keystrokes, use cameras, or claim to prove authorship. | 14 | `privacy-minimal`, `no-ai-detection-or-authorship-verdict` |
| Open `/?demo=1` for a sample session with three completed tickets. | 10 | `sample-demo` |
| Demo work stays separate from your classes and expires after 24 hours. | 12 | `sample-demo` |
| Choose Reset demo for fresh sample data. | 7 | `sample-demo` |
| Requirements: Node 22+, npm, and the current stable Rust toolchain. | 10 | Setup requirement |
| Open `http://localhost:8080`. | 2 | Run instruction |
| The server creates `./data/tickets.db` when no configuration is supplied. | 9 | Local run behavior; source and clean run checked |
| For frontend development, run `cargo run` and `npm run dev` in separate terminals. | 13 | Run instruction |
| Vite proxies `/api` to port 8080. | 6 | Development configuration; source checked |
| The command checks release contracts, builds `dist/` and the Rust service, then runs the Playwright suite. | 16 | Test instruction; observed |
| Building the service before Playwright's startup timer keeps the first claim command reliable on a clean checkout. | 17 | Test rationale; clean claim run passed |
| Claim tests are listed in `.factory/claims.json` and use only fresh sessions or `/demo` sample data. | 15 | **Exception: F-3-1** |
| The container runs as a non-root user. | 7 | Container contract checked locally |
| `PORT` defaults to `8080`. | 4 | Runtime configuration; source checked |
| `DATA_DIR` and `DATABASE_URL` are optional overrides. | 6 | Runtime configuration; source checked |
| `GET /health` returns the build SHA. | 6 | Live response confirmed |
| The container needs no configuration beyond `PORT`: without `DATABASE_URL` it uses local SQLite under `/app/data`. | 15 | Local runtime contract checked |
| Production supplies `DATABASE_URL` from Key Vault and runs one PostgreSQL-backed replica. | 11 | `production-topology`; **untested in F-3-1** |
| `deployment/containerapp-contract.json` records the database secret reference and scale settings. | 9 | Repository contract checked |
| The deploy gate creates a session, restarts the active revision, then reads and deletes that same session before it reports success. | 21 | `production-topology`; **untested in F-3-1** |
| An Azure Container Apps revision refuses to start without `DATABASE_URL`. | 10 | Release contract source checked |
| This prevents a generic deployment from silently switching production to replica-local SQLite. | 12 | Release rationale |
| Local and self-hosted containers keep the zero-configuration SQLite default. | 9 | Local runtime contract checked |
| Authorized factory workers deploy the committed revision with `deployment/deploy.sh`. | 9 | Operator instruction |
| The deploy check starts a new revision. | 7 | `production-topology`; **untested in F-3-1** |
| It then confirms that the same session remains available. | 9 | `production-topology`; **untested in F-3-1** |
| The release-only topology claim runs that same observable gate. | 9 | `production-topology`; **untested in F-3-1** |
| It needs a clean, pushed `main` branch and factory Azure credentials. | 11 | Operator requirement |
| Sessions expire after the teacher's chosen one, seven, or thirty days. | 11 | `session-retention` |
| Free sessions accept up to 40 tickets. | 7 | `free-capacity` |
| Teachers can delete a session early. | 6 | `teacher-control` |
| See `/privacy` and `/terms` for the full plain-language policies. | 9 | Link instruction; both routes return 200 |
| There is no paid plan. | 5 | `free-no-account-core-flow` |
| Teachers and students can use the core workflow for free and without an account. | 14 | `free-no-account-core-flow` |
| `.factory/brief.json` records the product scope. | 5 | Repository note |
| `.factory/design.md` records the visual system and artwork provenance. | 8 | Repository note |
| `.factory/demo.md` explains demo isolation. | 4 | Repository note |
| `.factory/copy-audit.md` records the plain-language audit. | 5 | Repository note |
| `.factory/handoff.md` records verification results and known gaps. | 7 | Repository note |
| MIT licensed. | 2 | `LICENSE` exists |
| Built by Param Factory. | 4 | Attribution |

README headings—Try the demo, Run locally, Test, Container, Privacy and limits, and Project notes—make sense out of context. Technical names such as Playwright, SQLite, PostgreSQL, Vite, Rust, and Azure Container Apps are necessary in the developer run/deploy sections and are used consistently.

### Terminology

| Concept | Term used |
| --- | --- |
| Teacher-created class container | session |
| One student's record | draft ticket / ticket |
| Student identifier | class nickname |
| Teacher-only credential | private teacher link |
| Sample environment | demo / sample data |
| Download | CSV export |

## Demo and sandbox

- The landing action opens `/?demo=1` in one click.
- The first completed Blue Finch ticket is fully visible without scrolling: y=406–647 at 390 × 844 and y=520–693 at 1440 × 900.
- The persistent banner says “Demo — sample data, nothing is saved to your classes” and contains **Reset demo** and **Start for real**.
- The sample contains three realistic tickets: Blue Finch, Copper Kite, and Quiet Maple.
- The live `@claim:sample-demo` test created real data first, then confirmed entry, reset, and exit left that browser key and backend record unchanged. Reset changed the demo code and restored three records. Start for real removed only `demo:workspace`.
- Fresh landing and demo traffic stayed on `https://in-class-draft-ticket.sociobot.in`. The privacy test found no analytics, model, CDN, media, or third-party request and no storage/network write while typing.

## Claims and test evidence

A clean clone at `/tmp/in-class-review3.OZRLpk/repo` checked out the repository base. `npm ci` completed before each declared command was evaluated.

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
| `production-topology` | `npm run test:production-topology` | **NOT RUN — BLOCKING F-3-1; command deploys and restarts production** |

The complete clean-clone `npm test` passed 13 release-contract tests and 56 browser tests. The live suite also passed 56/56. TypeScript, Rust formatting, clippy with warnings denied, 9 Rust tests, release build, and the high-severity npm audit passed. Vite produced `dist/`; initial JavaScript is 63.01 kB raw / 22.87 kB gzip.

No additional unlisted end-user claim was found on the landing page or README. The production-topology wording is listed but untested, which is the blocking defect.

## Structure, routing, accessibility, and visual identity

- `/`, `/?demo=1`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` return 200. An unknown route returns a designed 404 with status 404.
- Every checked route has one h1, its route title, a plain meta description, canonical and Open Graph data, favicon, header, footer, Privacy, and Terms.
- The social image is a real 1200 × 630 WebP; the apple-touch icon is 180 × 180.
- Crawling every link found no dead destination. The only non-200 crawl result was the expected current-document skip link on the tested 404 page.
- The live suite passed route focus, polite announcement, browser Back scroll restoration, keyboard skip-link, 200% reflow, reduced motion, offline shell, 44px targets, and serious/critical axe checks.
- Response headers include `nosniff`, strict-origin referrer policy, and a CSP with `frame-ancestors 'none'`. No CSP or console error appeared.
- The paper field, Fraunces/Atkinson pairing, clipped ticket corners, plotted geometry, generated still life, and dark teacher sheet match `.factory/design.md`. The result is product-specific rather than a centered generic SaaS hero or feature-card grid.

## Earlier-finding reconciliation

Every earlier `.factory/review-*.md`, `.factory/polish-*.md`, and `.factory/handoff.md` was read. Each earlier finding was checked on the live site and in current source.

| Earlier finding | Current confirmation |
| --- | --- |
| `F-1-1` unlisted AI/authorship/free/no-account claims | Fixed. Both claim entries exist; their clean and live browser tests pass. |
| `F-1-2` incomplete direct 404 | Fixed. Live unknown URL returns 404 with the shared shell, metadata, legal links, and no serious/critical axe violation. |
| `F-1-3` hidden mobile Demo/Privacy links | Fixed. All four navigation links are visible at 390px and have 44px targets. |
| `F-1-4` overlong README sentences | Fixed. No current README sentence exceeds 22 words. |
| `F-2-1` inaccurate storage inventory | Fixed. Live privacy copy names content, random IDs, hashed credentials, timestamps, demo marker, and rotating rate keys; the database claim passes. |
| `F-2-2` no completed ticket in the demo viewport | Fixed. Blue Finch's claim and revision are fully visible in both first viewports. |
| `F-2-3` mobile facts below the fold | Fixed. All three facts end above y=714 in the 844px viewport. |
| `F-2-4` demo test could not detect real-data damage | Fixed. The claim seeds and compares a real browser key and authenticated backend record through entry, reset, and exit. |
| `F-2-5` privacy test missed keystrokes and same-origin tracking | Fixed. The test types in every field, compares storage/request counts, and uses an exact path allowlist. |
| `F-2-6` untested demo deletion time | Fixed. `sample-demo` states and asserts exactly 24 hours. |
| `F-2-7` “easier to discuss” claim | Fixed. Live copy now lists the four recorded fields. |
| `F-2-8` “starting point for feedback” claim | Fixed. Live copy says teachers can read a ticket beside the draft. |
| `F-2-9` untested “useful” adjective | Fixed. The hero audience sentence is factual. |
| `F-2-10` README demo jargon/inconsistent terms | Fixed. README uses sample session, demo, and classes. |
| `F-2-11` misleading “timed session” | Fixed. README says session with a deletion date. |
| `F-2-12` metaphorical 404 h1 | Fixed. Both live 404 forms use “Page not found.” |
| `F-2-13` subjective social description | Fixed. Raw and hydrated metadata use factual product copy. |

No earlier ID is reissued because every earlier defect remains fixed. F-3-1 is a newly identified verification-contract defect.

## Missed leverage

No missing AI feature is identified. The brief calls for a short, privacy-conscious record, and automated analysis of student writing would work against the stated boundary. CSV export already covers the obvious portability need. A roster import or persistent sync would collect more student data and is not implied by the smallest useful product. No model provider key or model request appears in source or the live request log.

## What would make this perfect

Replace the production-mutating claim command with a disposable PostgreSQL restart test, or remove the production-specific statement from the claims registry and present it only as SHA-bound release evidence. Then rerun all eleven claims without infrastructure access. PASS requires that final claim to be safely testable and pass; everything else checked in this round is clear and working.
