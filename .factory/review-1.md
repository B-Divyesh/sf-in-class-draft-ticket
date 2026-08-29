# Adversarial first-read review 1 — FAIL

- Product: In-Class Draft Ticket
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Reviewed: 29 August 2026 UTC
- Context: fresh Chromium at 390 × 844 and 1440 × 900; no prior browser storage
- Verdict: **FAIL** — 1 major and 3 minor findings remain. No blocking demo, core-flow, or registered-claim test failed.

## First screen

**PASS.** Before scrolling, this is clear as a tool that records students’ in-class drafting choices without surveillance, for writing teachers. The first action is **Try it with sample data**, which promises “See three completed tickets.” This is visible and understandable at both 390 px and desktop, with no console errors or horizontal overflow.

Exact copy that answered the first-read questions:

> “Record in-class drafting without surveillance”

> “For writing teachers who need useful evidence of student choices during class.”

> “Try it with sample data” / “See three completed tickets.”

## Findings

### F-1-1 — Major — relied-on boundary and price claims are unlisted and untested

**Exact locations:** Landing: “A process record, not a detector”, “No AI detection”, “No claim of proving authorship”, and “It does not judge who wrote a draft.” README: “It does not detect AI, record keystrokes, use cameras, or claim to prove authorship.” README Privacy and limits: “All class-session features are free.” and “the core teacher and student workflow remains available without payment or an account.”

`claims.json` covers webcam, microphone, keystroke logging, tracking, capacity, and other behavior. It has no claim for no AI detection, no authorship verdict, free price, or no-account availability. These are relied-on promises, not decorative text. The `privacy-minimal` entry does not state or test the omitted boundaries.

**Concrete fix:** Remove these promises, or add focused claims such as `no-ai-detection-or-authorship-verdict` and `free-no-account-core-flow`, each with one sandbox test. The first should prove the demo has no detection/model endpoint or UI and only expected requests. The second should complete a fresh teacher/student flow without sign-in, payment, or payment requests. Use the tested wording consistently.

### F-1-2 — Minor — direct 404 omits shared skeleton and metadata

**Evidence:** A direct live request to `/not-a-route` correctly returns HTTP 404 and an h1, but browser inspection found `header: 0`, `footer: 0`, description meta: 0, and canonical: 0. `public/404.html` has no header/footer, description, canonical, or OG/Twitter metadata.

**Why it matters:** A visitor following a stale link loses normal product context and the Privacy/Terms route. It does not meet the required shared header/footer and per-route metadata structure.

**Concrete fix:** Give `public/404.html` the product skip link, header, footer with Privacy/Terms, favicon/apple icon, description, canonical, OG/Twitter tags, and existing visual treatment. Keep the 404 status and Return home action.

### F-1-3 — Minor — mobile header hides Demo and Privacy

**Evidence:** At 390 px the visible header is `Draft Ticket`, `Join`, and `Start a class`. CSS hides Demo with `@media(max-width:430px){.site-header nav a:nth-child(1){display:none}}` and hides Privacy with `@media(max-width:800px){.site-header nav a:last-child{display:none}}`.

**Why it matters:** The required shared header should expose Demo and Privacy. The landing CTA still reaches the demo, but a phone visitor on another route must return home to find it and must scroll to the footer for Privacy.

**Concrete fix:** Retain the four-link information architecture at mobile size, using an accessible menu/drawer if needed, while preserving 44 px touch targets.

### F-1-4 — Minor — README has two overlong, technical sentences

**Exact copy:**

- “That path builds in ACR, binds the Key Vault PostgreSQL URL to the new revision, and refuses success until fresh browser flows and the revision-restart persistence check pass.” (28 words)
- “The researched freemium add-on is intentionally not offered until its Sociobot billing product is registered; the core teacher and student workflow remains available without payment or an account.” (26 words)

Both exceed the 22-word cap. The second uses internal terms that a teacher cannot act on.

**Concrete fix:** “The deploy check starts a new revision. It then confirms that the same session remains available.” “There is no paid plan yet. Teachers and students can use the core workflow without an account.” Register and test the latter statement if it remains.

## Demo and sandbox

**PASS.** A fresh landing click opened `/demo` in one click. The first screen was a working teacher view with three fictional tickets: Blue Finch, Copper Kite, and Quiet Maple. It displayed the persistent banner “Demo — sample data, nothing is saved to your classes”.

Only `demo:workspace` existed in local storage. **Reset demo** issued a new sample code and retained three records. **Start for real** removed `demo:workspace` and opened `/start`. Export produced `draft-tickets-<code>.csv`. Requests were same-origin only (document, self-hosted assets, `/api/demo`, teacher read, export); there were no third-party, analytics, webcam, or microphone requests, and no page or console errors.

## Registered claims and tests

`npm ci` completed first. Every command from `.factory/claims.json` passed exactly as registered:

| Claim | Command | Result |
| --- | --- | --- |
| sample-demo | `npm test -- --grep @claim:sample-demo` | PASS, 2 browser projects |
| csv-export | `npm test -- --grep @claim:csv-export` | PASS, 2 browser projects |
| pseudonymous-flow | `npm test -- --grep @claim:pseudonymous-flow` | PASS, 2 browser projects |
| session-retention | `npm test -- --grep @claim:session-retention` | PASS, 2 browser projects |
| free-capacity | `npm test -- --grep @claim:free-capacity` | PASS, 2 browser projects |
| privacy-minimal | `npm test -- --grep @claim:privacy-minimal` | PASS, 2 browser projects |
| teacher-control | `npm test -- --grep @claim:teacher-control` | PASS, 2 browser projects |
| production-topology | `npm run test:production-topology` | PASS, 1 contract test |

`npm test` passed: 12 release-contract tests and 46 Playwright tests. `test-results/.last-run.json` records `passed` and no failed tests. The build produced `dist/` (22.47 kB gzip JS; 4.02 kB gzip CSS).

## Copy audit

Counts treat URLs, code literals, and hyphenated terms as one word. Headings, labels, and fragments are audited separately. No listed sentence exceeds 22 words except F-1-4. `CSV` names the actual format, but “Download a spreadsheet (CSV)” is plainer for the landing.

### Landing sentences

| Copy | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | Pass |
| For writing teachers who need useful evidence of student choices during class. | 12 | Pass |
| See three completed tickets. | 4 | Pass |
| Students use class nicknames. | 4 | Pass |
| Sessions expire automatically. | 3 | session-retention |
| Free for classes up to 40. | 6 | free-capacity |
| Four checkpoints make the drafting process easier to discuss. | 9 | Pass |
| Students name one claim, one evidence location, one revision, and one next step. | 13 | Pass |
| Memory acts like a second setting. | 6 | Sample content |
| I moved the scene before my explanation. | 7 | Sample content |
| Add the class name, prompt, and deletion date. | 8 | Pass |
| Keep the private teacher link. | 5 | teacher-control |
| Students use a class nickname and answer four short prompts. | 10 | pseudonymous-flow |
| Read each ticket beside the draft. | 6 | Pass |
| Export the full session as CSV. | 6 | csv-export; write “Download a spreadsheet (CSV).” |
| The ticket gives teachers a starting point for feedback. | 9 | Pass |
| It does not judge who wrote a draft. | 9 | **F-1-1** |
| Record in-class drafting without surveillance. | 5 | Footer repeat; pass |

### Landing headings, labels, and fragments

| Copy | Check |
| --- | --- |
| A process record, not a detector | **F-1-1**; use “Classroom drafting record” after registering/removing the promise. |
| Live preview | Pass: names the section. |
| A ticket stays short | Replace with “Four drafting prompts”; “short” does not say what the preview contains. |
| Three stops, one class period | Replace with “How it works in three steps”; the time phrase is unsupported and not a section name. |
| How it works | Pass. |
| Clear boundaries | Pass. |
| What this does not do | Pass. |
| No AI detection | **F-1-1**. |
| No webcam or microphone | privacy-minimal. |
| No keystroke logging | privacy-minimal. |
| No claim of proving authorship | **F-1-1**. |
| Try it with sample data / Start a class session / Export sample CSV / Reset demo / Start for real | Result-naming verbs; pass. |
| Submit / Go / Continue | Not present; pass. |

### README sentences

| Copy | Words | Check |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | Pass |
| In-Class Draft Ticket is for writing teachers who want a short process record during class. | 15 | Pass |
| A teacher creates a timed session and shares its six-character code. | 11 | Pass |
| Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. | 15 | pseudonymous-flow |
| The teacher reviews the tickets and exports the full session as CSV. | 12 | csv-export |
| It does not detect AI, record keystrokes, use cameras, or claim to prove authorship. | 14 | **F-1-1** for detection/authorship; camera/keystrokes covered. |
| Open `/demo` for one fictional seminar with three completed tickets. | 10 | sample-demo |
| Demo work uses the `demo:` browser namespace and a separate one-day backend workspace. | 13 | sample-demo |
| Choose Reset demo for fresh sample data. | 7 | sample-demo |
| Requirements: Node 22+, npm, and the current stable Rust toolchain. | 9 | Pass |
| Open `http://localhost:8080`. | 2 | Pass |
| The server creates `./data/tickets.db` when no configuration is supplied. | 9 | Pass |
| For frontend development, run `cargo run` and `npm run dev` in separate terminals. | 10 | Pass |
| Vite proxies `/api` to port 8080. | 6 | Pass |
| The command checks release contracts, builds `dist/` and the Rust service, then runs the Playwright suite. | 15 | Pass |
| Building the service before Playwright's startup timer keeps the first claim command reliable on a clean checkout. | 16 | Pass |
| Claim tests are listed in `.factory/claims.json` and use only fresh sessions or `/demo` sample data. | 14 | Pass |
| The container runs as a non-root user and reads only `PORT`, which defaults to `8080`. | 15 | Pass |
| `DATA_DIR` is an optional local-development override. | 6 | Pass |
| `GET /health` returns the build SHA. | 5 | Pass |
| The container needs no configuration beyond `PORT`: without `DATABASE_URL` it uses local SQLite under `/app/data`. | 16 | Pass |
| Production supplies `DATABASE_URL` from Key Vault and runs one PostgreSQL-backed replica. | 12 | production-topology |
| `deployment/containerapp-contract.json` records the database secret reference and scale settings. | 8 | production-topology |
| The deploy gate creates a session, restarts the active revision, then reads and deletes that same session before it reports success. | 20 | production-topology |
| An Azure Container Apps revision refuses to start without `DATABASE_URL`. | 10 | production-topology |
| This prevents a generic deployment from silently switching production to replica-local SQLite. | 12 | production-topology |
| Local and self-hosted containers keep the zero-configuration SQLite default. | 9 | Pass |
| Authorized factory workers deploy the committed revision with `deployment/deploy.sh`. | 9 | Pass |
| That path builds in ACR, binds the Key Vault PostgreSQL URL to the new revision, and refuses success until fresh browser flows and the revision-restart persistence check pass. | 28 | **F-1-4** |
| Sessions expire after the teacher's chosen one, seven, or thirty days. | 11 | session-retention |
| Free sessions accept up to 40 tickets. | 7 | free-capacity |
| Teachers can delete a session early. | 6 | teacher-control |
| See `/privacy` and `/terms` for the full plain-language policies. | 8 | Pass |
| All class-session features are free. | 5 | **F-1-1** |
| The researched freemium add-on is intentionally not offered until its Sociobot billing product is registered; the core teacher and student workflow remains available without payment or an account. | 26 | **F-1-1**, **F-1-4** |
| MIT licensed. | 2 | Pass |
| Built by Param Factory. | 4 | Pass |

### Terminology

| Concept | Term used |
| --- | --- |
| Teacher’s class container | session |
| Student record | draft ticket / ticket |
| Student identifier | class nickname |
| Teacher-only credential | private teacher link |
| Sample environment | demo / sample data |

Terminology is consistent; “ticket” is a clear short form of “draft ticket.”

## Structure, privacy, and accessibility

- Root has title, `lang="en"`, one h1, main, description, canonical, favicon/apple icon, OG/Twitter image, and theme color.
- `/`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` returned 200. Inspected SPA routes had one h1, route title/canonical, and footer.
- `/not-a-route` returns a real 404 and h1, with residual F-1-2.
- Fresh landing traffic was same-origin HTML, JS, CSS, self-hosted fonts, and local hero art. Demo added only same-origin API calls.
- Root sends CSP with `frame-ancestors 'none'`, `nosniff`, and strict-origin referrer policy; no CSP console error appeared.
- The full local suite covers axe serious/critical violations, skip link, route focus, back scroll, reduced motion, offline shell reload, and 200% reflow; it passed.
- Original art, type, ticket corners, and plotted-line layout match `.factory/design.md` and are product-specific rather than a generic SaaS template.

## Earlier-review reconciliation

Every earlier `.factory/verification*.md` and `.factory/handoff.md` was read. No earlier `review-*.md` or `polish-*.md` exists. Earlier defects were verified as follows:

| Earlier reports/findings | Current confirmation |
| --- | --- |
| `verification.md`: deep links, metadata, back-scroll | Public routes return 200; route titles/canonicals inspected; full suite passed back-scroll. Unknown 404 has residual F-1-2. |
| `verification.md`: PWA/offline | Passing suite covers service-worker cache and offline shell reload; live root serves manifest. |
| `verification.md`: capacity; mobile targets; source checks | `@claim:free-capacity` and full suite pass, including 44 px target tests. |
| `verification.md`, `verification-8.md`: unavailable paid checkout | No purchasable tier is advertised. The new free/no-account promise remains F-1-1 until tested. |
| `verification-2.md`: replica-local state; pinned Rust; first claim command | Live health reports PostgreSQL and one replica ID; Dockerfile is `rust:1-alpine`; all exact claims passed after fresh `npm ci`. |
| `verification-3.md` to `verification-11.md`: replica split, rate multiplier, demo 401/console error | Fresh demo was repeatable and error-free; live health reports PostgreSQL; release contracts and rate/session tests pass. |
| `verification-3.md`, `verification-8.md`: claims incomplete | Existing registered claims now pass, but F-1-1 confirms remaining unlisted copy. |
| `verification-3.md`: stale copy audit | Audit exists; this full audit finds F-1-4. |
| `verification-5.md`: CSV formula injection; docs mismatch | Current full suite includes CSV boundary coverage; README and Dockerfile agree on current storage/topology. |
| `verification-9.md` to `verification-11.md`: local quality gate / demo console error | `npm test` passed; fresh live demo produced no console error. |

## Missed leverage

No missing AI feature is identified. The brief asks for a humane, short classroom process record; model assistance would be decorative and conflict with the privacy boundary. CSV export already exists and is verified. No provider key is embedded or requested.

## What would make this perfect

Register/test or remove every promise in F-1-1, make the true 404 a complete product route, retain Demo and Privacy in the mobile header, and split the two README sentences. Then repeat the fresh first-read, demo, claims, privacy, route, and history checks. PASS requires zero findings.
