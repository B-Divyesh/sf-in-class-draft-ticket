# Adversarial first-read review 4 — FAIL

- Product: In-Class Draft Ticket
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Reviewed: 30 August 2026 UTC
- Context: fresh Chromium contexts at 390 × 844 and 1440 × 900; fresh clean clone at `f6e82c82f89abd737c89c7a2ec43491bd07d48aa`
- Verdict: **FAIL** — 2 minor findings remain. The acceptance rule requires zero findings for PASS.

## First screen

**PASS.** Before scrolling, the product is clear on both sizes: it records students’ in-class drafting choices without surveillance, for writing teachers. The first action is **Try it with sample data**, which shows three completed tickets.

Exact first-screen copy:

> “Record in-class drafting without surveillance”

> “For writing teachers recording student choices during class.”

> “Try it with sample data” / “See three completed tickets.”

At 390 px, the three facts end at y=652, y=683, and y=714 of an 844 px viewport. There was no horizontal overflow, console error, or page error. Desktop and mobile made requests only to `https://in-class-draft-ticket.sociobot.in`.

## Findings

### F-4-1 — Minor — the fourth checkpoint has two names

**Exact locations:** Landing preview: “Each ticket records a claim, evidence location, revision, and **next step**.” Landing preview: “Students name one claim, one evidence location, one revision, and one **next step**.” The student form and README call the same fourth field **“exit reflection.”**

**Why this fails first-read clarity:** A teacher who has just seen “next step” cannot tell whether the student form’s “Exit reflection” is the same required response or an additional one. The product promises four checkpoints, so names must not drift.

**Concrete fix:** Use one name everywhere. For example, change both landing sentences to “Each ticket records a claim, evidence location, revision, and exit reflection.” and “Students name one claim, one evidence location, one revision, and one exit reflection.” If the intended prompt is specifically a next-step reflection, label the form and README “Next-step reflection” instead.

### F-4-2 — Minor — the capacity fact names a class, while the tested limit is tickets

**Exact location:** Landing first-screen fact: “Free for classes up to 40.” The registered `free-capacity` claim is “Free sessions accept up to 40 tickets.”

**Why this fails first-read clarity:** “Classes up to 40” reads as a maximum class size or number of classes. The product enforces a maximum number of submitted draft tickets in one session. A teacher needs the actual unit to plan use, and the current sentence is not the same claim the sandbox test proves.

**Concrete fix:** Replace it with “Free sessions accept up to 40 draft tickets.” Keep the existing `free-capacity` test and make its `where` field name this revised landing fact.

## Demo and sandbox

**PASS.** One landing click entered `/?demo=1`. The first screen was already a teacher view, not a setup screen: it showed Blue Finch’s completed claim and revision. The persistent banner read:

> “Demo — sample data, nothing is saved to your classes”

It included **Reset demo** and **Start for real**. In a fresh mobile context, Reset changed sample code `93GB68` to `AW8APN`; Start for real opened `/start` and left local storage empty. During demo only `demo:workspace` was present. The clean-clone `sample-demo` claim additionally seeded and compared real storage and a real backend record through entry, reset, and exit.

## Registered claims

All listed commands were run from `/tmp/in-class-draft-ticket-review4-clean` after `npm ci`; all passed. The browser claim commands each passed in both configured browser projects.

| Claim | Declared command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2 tests |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2 tests |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2 tests |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2 tests |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2 tests |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2 tests |
| `data-storage-minimization` | `cargo test claim_data_storage_minimization -- --nocapture` | PASS — 1 test |
| `no-ai-detection-or-authorship-verdict` | `npm test -- --grep @claim:no-ai-detection-or-authorship-verdict` | PASS — 2 tests |
| `free-no-account-core-flow` | `npm test -- --grep @claim:free-no-account-core-flow` | PASS — 2 tests |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2 tests |

The claim test preflight also passed its 15 contract tests on every browser command, including one tagged test per registered claim and the clean-sandbox restriction. No failing registered claim was found. F-4-2 is a wording/scope mismatch between an on-page capacity statement and the registered claim, not a failed test.

## Copy audit

Counts treat hyphenated terms, URLs, code literals, and numbers as one word. Commands, code blocks, and URL-only lines are not prose sentences. No audited sentence exceeds 22 words or contains a banned marketing adjective. F-4-1 and F-4-2 are the two terminology/clarity flags above.

### Landing page sentences

| Sentence | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| For writing teachers recording student choices during class. | 8 | audience |
| See three completed tickets. | 4 | `sample-demo` |
| Students use class nicknames. | 4 | `pseudonymous-flow` |
| Sessions expire automatically. | 3 | `session-retention` |
| Free for classes up to 40. | 6 | **F-4-2** |
| Each ticket records a claim, evidence location, revision, and next step. | 11 | **F-4-1** |
| Students name one claim, one evidence location, one revision, and one next step. | 13 | **F-4-1** |
| Memory acts like a second setting. | 6 | fictional sample content |
| I moved the scene before my explanation. | 7 | fictional sample content |
| Add the class name, prompt, and deletion date. | 8 | instruction |
| Keep the private teacher link. | 5 | `teacher-control` |
| Students use a class nickname and answer four short prompts. | 10 | `pseudonymous-flow` |
| Read each ticket beside the draft. | 6 | instruction |
| Export the full session as CSV. | 6 | `csv-export` |
| Teachers can read each ticket beside the student's draft. | 9 | `pseudonymous-flow` |
| The ticket does not judge who wrote a draft. | 9 | `no-ai-detection-or-authorship-verdict` |
| Record in-class drafting without surveillance. | 5 | footer; `privacy-minimal` |

Landing headings name their sections and actions name results: “Classroom drafting record,” “Four drafting prompts,” “How it works,” “What this does not do,” “Try it with sample data,” “Start a class session,” “Create a session,” “Share the code,” and “Review the choices.” No metaphor or mood heading remains.

### README sentences

| Sentence | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| In-Class Draft Ticket is for writing teachers who want a short process record during class. | 16 | audience |
| A teacher creates a session with a deletion date and shares its six-character code. | 14 | `session-retention` |
| Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. | 15 | `pseudonymous-flow`; terminology baseline |
| The teacher reviews the tickets and exports the full session as CSV. | 11 | `csv-export` |
| It does not detect AI, record keystrokes, use cameras, or claim to prove authorship. | 14 | registered boundary claims |
| Open `/?demo=1` for a sample session with three completed tickets. | 10 | `sample-demo` |
| Demo work stays separate from your classes and expires after 24 hours. | 12 | `sample-demo` |
| Choose Reset demo for fresh sample data. | 7 | `sample-demo` |
| Open `<http://localhost:8080>`. | 2 | run instruction |
| The server creates `./data/tickets.db` when no configuration is supplied. | 9 | run instruction |
| For frontend development, run `cargo run` and `npm run dev` in separate terminals. | 9 | run instruction |
| Vite proxies `/api` to port 8080. | 6 | run instruction |
| The command checks release contracts, builds `dist/` and the Rust service, then runs the Playwright suite. | 16 | test instruction |
| Building the service before Playwright's startup timer keeps the first claim command reliable on a clean checkout. | 16 | test instruction |
| Claim tests are listed in `.factory/claims.json` and use only fresh sessions or `/demo` sample data. | 15 | test instruction |
| The container runs as a non-root user. | 7 | container instruction |
| `PORT` defaults to `8080`. | 3 | container instruction |
| `DATA_DIR` and `DATABASE_URL` are optional overrides. | 6 | container instruction |
| `GET /health` returns the build SHA. | 5 | container instruction |
| The container needs no configuration beyond `PORT`. | 7 | container instruction |
| Without `DATABASE_URL`, it uses local SQLite under `/app/data`. | 8 | container instruction |
| Local and self-hosted containers keep the zero-configuration SQLite default. | 9 | container instruction |
| Authorized factory workers deploy the committed revision with `npm run deploy:release`. | 9 | release instruction |
| This command changes the live service, so it is not a claim test. | 13 | release boundary |
| The release command rejects dirty or unpushed code. | 8 | release instruction |
| It samples the uncached live build identity 20 times before and after a restart. | 14 | release instruction |
| It also checks browser flows, rate limiting, and record persistence. | 9 | release instruction |
| To check a deployed candidate without changing production, run: | 9 | release instruction |
| The latest SHA-bound deployment evidence is recorded in `.factory/polish-3.md`. | 9 | documentation pointer |
| The deployment contract remains in `deployment/containerapp-contract.json`. | 6 | documentation pointer |
| Sessions expire after the teacher's chosen one, seven, or thirty days. | 11 | `session-retention` |
| Free sessions accept up to 40 tickets. | 7 | `free-capacity` |
| Teachers can delete a session early. | 6 | teacher workflow |
| See `/privacy` and `/terms` for the full plain-language policies. | 9 | link instruction |
| There is no paid plan. | 5 | `free-no-account-core-flow` |
| Teachers and students can use the core workflow for free and without an account. | 13 | `free-no-account-core-flow` |
| MIT licensed. | 2 | license statement |
| Built by Param Factory. | 4 | provenance |

README headings and list fragments are descriptive. The only terminology drift is F-4-1: “exit reflection” in the README/form versus “next step” on the landing.

## Structure, privacy, and routing

**PASS except for F-4-1 and F-4-2.** The live root has the correct title, `lang=en`, one h1, main landmark, description, canonical, Open Graph/Twitter metadata, SVG favicon, and Apple touch icon. Direct `/not-a-route` returns HTTP 404 with the designed shared header/footer, legal links, h1 “Page not found,” and complete metadata. `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` returned 200. Crawled first-party links and the Param Factory external link returned 200; the `mailto:` legal link is an explicit non-HTTP action.

The header/footer are consistent, all four header links appear at 390 px, and the live product has a distinct paper-ticket/constellation identity rather than a generic SaaS template. The code changes route title, canonical and announcement, focuses the h1 on route change, and restores browser-back scroll. There is no AI feature, provider key, or missing implied import/export/sync feature: the brief’s expected teacher CSV export is present and tested.

## Earlier finding reconciliation

Every prior review and polish document was read. Live behavior and current code confirm that all earlier IDs remain fixed:

| Earlier ID | Current confirmation |
| --- | --- |
| F-1-1 | Detection/authorship and free/no-account boundaries are registered claims with passing focused tests. |
| F-1-2 | Direct 404 has shared shell, legal links, metadata, and HTTP 404 status. |
| F-1-3 | Demo and Privacy remain visible in the 390 px header. |
| F-1-4 | README prose stays within 22 words. |
| F-2-1 | Privacy inventory is specific and the database-minimization test passes. |
| F-2-2 | The initial demo viewport contains Blue Finch’s completed ticket. |
| F-2-3 | All three landing facts are visible in the 390 px first viewport. |
| F-2-4 | The passing sample-demo test protects seeded real storage and backend data. |
| F-2-5 | The passing privacy test types through fields and checks request/storage behavior. |
| F-2-6 | Demo expiry is consistently stated and tested as 24 hours. |
| F-2-7 | The former effectiveness claim is replaced by the concrete recorded fields. |
| F-2-8 | The former feedback-effectiveness claim is replaced by a concrete teacher action. |
| F-2-9 | The hero audience sentence no longer promises “useful” evidence. |
| F-2-10 | README uses demo, session, and class terminology except for new F-4-1’s field-name drift. |
| F-2-11 | README says deletion date, not a timed session. |
| F-2-12 | Both 404 forms use “Page not found.” |
| F-2-13 | Raw social descriptions are factual. |
| F-3-1 | `production-topology` is absent from `claims.json`; each remaining claim command is sandbox-safe and the clean-sandbox contract passes. |

## What would make this perfect

Use one name for the fourth drafting checkpoint and state the free limit in draft tickets per session. Then rerun the complete first-read, demo, claim, history, route, privacy, and copy audit. With those two findings removed and no regression, this review can pass.
