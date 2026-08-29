# Adversarial first-read review 2 — FAIL

- Product: In-Class Draft Ticket
- Live URL: <https://in-class-draft-ticket.sociobot.in>
- Reviewed: 29 August 2026 UTC
- Repository base: `9f89cf06320d49ca4ca6acfe39afd1d3d955c467`
- Live build reported by `/health`: `7c5d302535fac3ab95637edc3d82b1be147b078b`
- Context: fresh Chromium at 390 × 844 and 1440 × 900; fresh storage and blocked service workers for first-read/request checks
- Verdict: **FAIL — 2 blocking, 7 major, and 4 minor findings.** All registered commands pass, but the privacy copy is inaccurate and the demo does not show a completed ticket in its first viewport.

## First screen

Before scrolling, my answers were:

- **What does this do?** It records a few choices students make while drafting in class, without using surveillance.
- **For whom?** Writing teachers.
- **What should I click first?** **Try it with sample data**, which says it will show three completed tickets.

This first-read gate passes at both sizes. The exact text was:

> “Record in-class drafting without surveillance”

> “For writing teachers who need useful evidence of student choices during class.”

> “Try it with sample data” / “See three completed tickets.”

The fresh landing page returned 200, had no console/page errors, made only same-origin requests, and had no horizontal overflow. Finding F-2-3 still applies because the three required plain facts are outside the mobile first screen.

## Findings

### F-2-1 — BLOCKING — the privacy page makes an inaccurate, unlisted storage claim

**Exact location and quote:** `/privacy`: “In-Class Draft Ticket stores only what teachers and students enter.”

**Evidence:** `migrations/202608280001_init.sql` also stores generated session codes, raw teacher bearer tokens, session/ticket IDs, creation timestamps, expiry timestamps, and the demo flag. `migrations/202608290002_cluster_rate_limits.sql` stores `client_key`; `src/main.rs:280-350` binds the request IP as that key. Production cleanup runs every 30 seconds and removes counters older than two seconds, so an IP can remain for roughly 32 seconds. The next privacy sentence also admits that timestamps are stored, directly contradicting “only what teachers and students enter.” No `claims.json` entry tests the actual stored-data inventory.

**Why this misleads:** A teacher evaluating FERPA/GDPR exposure is told that the service stores no server-generated or request data. That is false even though the additional data has legitimate operational uses.

**Concrete fix:** Replace the quote with an accurate inventory, for example: “We store class content, random record IDs, a teacher access credential, timestamps, and a short-lived rate-limit key derived from the request IP.” State the exact IP-key lifetime. Prefer hashing teacher tokens at rest and using a keyed, rotating value instead of a raw IP. Add a `data-storage-minimization` claim and a database-level test that asserts every stored field and its deletion time.

### F-2-2 — BLOCKING — the demo’s first screen does not show any completed ticket

**Exact locations and quotes:** Landing action: “Try it with sample data” / “See three completed tickets.” Demo h1: “Review a sample draft session.”

**Evidence:** After sample data finished loading, the first `.response-ticket` began at y=1094 in the 844px mobile viewport and y=1015 in the 900px desktop viewport. The first screens showed the banner, repeated site navigation, a large heading, a sample code, and an export action. Neither showed Blue Finch, Copper Kite, Quiet Maple, or any draft response. The first API-backed ticket was more than one screen down on mobile.

**Why this fails the demo gate:** The promised core value is a completed draft ticket, not a session code. A visitor must scroll before seeing the product used with realistic sample data, contrary to the one-click demo requirement.

**Concrete fix:** Put a compact completed ticket or its first claim/revision directly below the demo heading and above administration controls. At 390 × 844 and 1440 × 900, assert that one named ticket and at least one realistic response are fully visible without scrolling. Keep the complete teacher sheet below it.

### F-2-3 — Major — the three required plain facts are outside the mobile first screen

**Exact location:** Landing `.plain-facts`: “Students use class nicknames.”, “Sessions expire automatically.”, and “Free for classes up to 40.”

**Evidence:** At 390 × 844 the facts start at y=1281, y=1312, and y=1343 because the hero artwork is ordered before them. They are 437–522px below the first viewport. Desktop places them at y=811–897, barely inside a 900px viewport.

**Why this matters:** The first-screen contract requires the privacy/retention/price facts next to the primary action. A phone visitor cannot evaluate those boundaries during the promised five-second read.

**Concrete fix:** On mobile, place `.plain-facts` before `.hero-art` and reduce the hero spacing enough to keep all three lines within the first 844px. Add a 390px assertion that all three bounding boxes end above `window.innerHeight`.

### F-2-4 — Major — the demo isolation test cannot detect damage to existing real data

**Exact claim:** `sample-demo`: “The demo opens with three fictional draft tickets and saves nothing to a real class.”

**Evidence:** `tests/product.spec.ts` opens a fresh empty context and expects the only key to be `demo:workspace`. It never seeds a `teacher:<code>` key or a real backend session before entering, resetting, and leaving the demo. The test would not catch a regression that deleted or changed existing real data. An independent live check for this review seeded `teacher:REAL99`; the current implementation preserved it through entry/reset/exit, but that behavior is not protected by the registered claim test.

**Why this matters:** “Real data is untouched” is the safety boundary of the demo, and the automated evidence does not exercise that boundary.

**Concrete fix:** Extend the single `@claim:sample-demo` test to create a real session and seed its `teacher:` key first. Enter and reset the demo, then verify the real session response and local key are byte-for-byte unchanged; leave the demo and verify only `demo:workspace` was removed.

### F-2-5 — Major — the privacy claim test does not test two promises it names

**Exact claim:** `privacy-minimal`: “The app uses no webcam, microphone, keystroke logging, analytics, or third-party tracking; session requests stay on this service.”

**Evidence:** The test records origins and stubs `getUserMedia`, which covers media capture and third-party requests. It does not type into a form and prove that keystrokes cause no storage or network activity. It also allows every same-origin request, so a same-origin analytics endpoint would pass.

**Why this matters:** A passing claim command currently overstates what it proves. The two most classroom-sensitive promises could regress while the test remains green.

**Concrete fix:** During `@claim:privacy-minimal`, type in every student field without submitting and assert that local/session storage and the exact request allowlist do not change. Then submit and assert only the documented session API call occurs. Fail on analytics/event/telemetry paths even when they are same-origin.

### F-2-6 — Major — one-day demo deletion is a quantitative claim with no registered test

**Exact locations and quotes:** README: “Demo work uses the `demo:` browser namespace and a separate one-day backend workspace.” `/privacy`: “Demo sessions expire after one day.”

**Evidence:** `sample-demo` does not include one-day expiry in its claim text and does not assert `expires_at`. `session-retention` covers real sessions at one, seven, and thirty days, not demo sessions.

**Why this matters:** Teachers can rely on the stated deletion time. A quantitative retention promise must be asserted, not inferred from implementation.

**Concrete fix:** Add the 24-hour demo expiry to `sample-demo` and assert `expires_at` within a stated margin. Use the debug clock to observe demo cleanup, or remove both one-day statements.

### F-2-7 — Major — “easier to discuss” is an unlisted effectiveness claim

**Exact location and quote:** Landing hero-art caption: “Four checkpoints make the drafting process easier to discuss.”

**Why this misleads:** No claim entry or test measures whether discussion becomes easier. It is an outcome claim, not a description of the interface.

**Concrete fix:** Replace it with the factual, registered behavior: “Each ticket records a claim, evidence location, revision, and next step.”

### F-2-8 — Major — “starting point for feedback” is another unlisted effectiveness claim

**Exact location and quote:** Landing boundaries section: “The ticket gives teachers a starting point for feedback.”

**Why this misleads:** No claim or test establishes a feedback outcome, and the sentence does not tell the visitor what action creates that outcome.

**Concrete fix:** Replace it with “Teachers can read each ticket beside the student’s draft.” and cover that read path in an existing workflow claim, or delete the sentence because the How it works section already gives the instruction.

### F-2-9 — Major — the hero calls the evidence “useful” without evidence

**Exact location and quote:** Landing first screen: “For writing teachers who need useful evidence of student choices during class.”

**Why this misleads:** “Useful” is an untested quality claim in the most prominent supporting sentence. The brief calls usefulness a pilot success measure, not an established result.

**Concrete fix:** Use a factual audience sentence: “For writing teachers recording student choices during class.” If usefulness is later claimed, register a measurable pilot claim and evidence.

### F-2-10 — Minor — the README’s demo wording uses jargon and inconsistent container terms

**Exact location and quote:** README, Try the demo: “Open `/?demo=1` for one fictional seminar with three completed tickets. Demo work uses the `demo:` browser namespace and a separate one-day backend workspace.”

**Why this slows comprehension:** The product calls the class container a “session,” then calls the sample a “seminar” and a “backend workspace.” “Browser namespace” is implementation jargon in a user-facing demo instruction.

**Concrete fix:** “Open `/?demo=1` for a sample session with three completed tickets. Demo work stays separate from your classes.” Keep namespace details in `.factory/demo.md`.

### F-2-11 — Minor — “timed session” implies a timer the product does not have

**Exact location and quote:** README introduction: “A teacher creates a timed session and shares its six-character code.”

**Why this misleads:** Teachers choose a deletion period of one, seven, or thirty days; there is no class-period timer or submission countdown.

**Concrete fix:** “A teacher creates a session with a deletion date and shares its six-character code.”

### F-2-12 — Minor — the 404 h1 is a visual metaphor, not the error

**Exact locations and quote:** Live unknown route and `public/404.html`: “This point is not connected.”

**Why this slows recovery:** Heard alone in a heading list, the line does not say that the page was not found. The “point” metaphor requires the visual system to decode it.

**Concrete fix:** Use “Page not found” as the h1. Keep the disconnected-point artwork and move “This point is not connected” to decorative or supporting copy if desired.

### F-2-13 — Minor — the social description uses an unprovable marketing adjective

**Exact location and quote:** Raw landing metadata in `index.html`: `og:description` and `twitter:description`: “A humane process record for in-class writing.”

**Why this misleads:** Social crawlers generally read the raw HTML rather than the client-side replacement. “Humane” is a value judgment with no registered evidence and says less than the tested privacy boundary.

**Concrete fix:** Use “Record in-class drafting choices without surveillance.” for both raw descriptions.

## Demo and sandbox evidence

- The landing action opened `/?demo=1` in one click.
- After loading, the demo contained Blue Finch, Copper Kite, and Quiet Maple with realistic claim/evidence/revision/reflection content.
- The persistent banner read “Demo — sample data, nothing is saved to your classes” and exposed **Reset demo** and **Start for real**.
- Reset changed the sample code and restored three tickets.
- A seeded `teacher:REAL99` local-storage entry remained unchanged through demo entry and reset. **Start for real** removed only `demo:workspace`.
- Landing and demo requests stayed on `https://in-class-draft-ticket.sociobot.in`; no analytics, model, CDN, media, or other third-party request appeared.
- F-2-2 remains blocking because the completed records are below the first viewport. F-2-4 and F-2-5 identify gaps in the lasting regression evidence even though the current manual checks passed.

## Registered claims and clean-clone tests

A separate clone at `/tmp/in-class-review2.UzEIIA/repo` was created from the committed repository. `npm ci` completed first. Every command in `.factory/claims.json` then ran exactly as declared:

| Claim | Declared command | Result |
| --- | --- | --- |
| `sample-demo` | `npm test -- --grep @claim:sample-demo` | PASS — 2 browser projects |
| `csv-export` | `npm test -- --grep @claim:csv-export` | PASS — 2 browser projects |
| `pseudonymous-flow` | `npm test -- --grep @claim:pseudonymous-flow` | PASS — 2 browser projects |
| `session-retention` | `npm test -- --grep @claim:session-retention` | PASS — 2 browser projects |
| `free-capacity` | `npm test -- --grep @claim:free-capacity` | PASS — 2 browser projects |
| `privacy-minimal` | `npm test -- --grep @claim:privacy-minimal` | PASS — 2 browser projects; incomplete coverage in F-2-5 |
| `no-ai-detection-or-authorship-verdict` | `npm test -- --grep @claim:no-ai-detection-or-authorship-verdict` | PASS — 2 browser projects |
| `free-no-account-core-flow` | `npm test -- --grep @claim:free-no-account-core-flow` | PASS — 2 browser projects |
| `teacher-control` | `npm test -- --grep @claim:teacher-control` | PASS — 2 browser projects |
| `production-topology` | `npm run test:production-topology` | PASS — 1 contract test |

The complete clean-clone `npm test` also passed: 12/12 contract tests and 52/52 Playwright tests. Vite produced `dist/` with 61.90 kB raw / 22.51 kB gzip JavaScript and 15.06 kB raw / 4.09 kB gzip CSS.

The commands pass, so there is no failing-claim-test blocker. F-2-1, F-2-6, F-2-7, F-2-8, and F-2-9 are unlisted claims. F-2-4 and F-2-5 are claim-test adequacy findings.

## Copy audit

Counts treat hyphenated terms, URLs, and code literals as one word. No audited sentence exceeds 22 words, and no banned marketing word appears. Flags concern unlisted value claims, jargon, and inconsistent wording.

### Landing sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| For writing teachers who need useful evidence of student choices during class. | 12 | **F-2-9** |
| See three completed tickets. | 4 | `sample-demo`; presentation failure **F-2-2** |
| Students use class nicknames. | 4 | `pseudonymous-flow` |
| Sessions expire automatically. | 3 | `session-retention` |
| Free for classes up to 40. | 6 | `free-capacity`, `free-no-account-core-flow` |
| Four checkpoints make the drafting process easier to discuss. | 9 | **F-2-7** |
| Students name one claim, one evidence location, one revision, and one next step. | 13 | `pseudonymous-flow` |
| Memory acts like a second setting. | 6 | Fictional sample content |
| I moved the scene before my explanation. | 7 | Fictional sample content |
| Add the class name, prompt, and deletion date. | 8 | Plain instruction |
| Keep the private teacher link. | 5 | `teacher-control` |
| Students use a class nickname and answer four short prompts. | 10 | `pseudonymous-flow` |
| Read each ticket beside the draft. | 6 | Plain instruction |
| Export the full session as CSV. | 6 | `csv-export` |
| The ticket gives teachers a starting point for feedback. | 9 | **F-2-8** |
| It does not judge who wrote a draft. | 8 | `no-ai-detection-or-authorship-verdict` |
| Record in-class drafting without surveillance. | 5 | Footer repeat; `privacy-minimal` |

### README sentences

| Sentence | Words | Result |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| In-Class Draft Ticket is for writing teachers who want a short process record during class. | 15 | Plain audience statement |
| A teacher creates a timed session and shares its six-character code. | 11 | **F-2-11** |
| Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. | 15 | `pseudonymous-flow` |
| The teacher reviews the tickets and exports the full session as CSV. | 12 | `csv-export` |
| It does not detect AI, record keystrokes, use cameras, or claim to prove authorship. | 14 | `privacy-minimal`, `no-ai-detection-or-authorship-verdict` |
| Open `/?demo=1` for one fictional seminar with three completed tickets. | 10 | `sample-demo`; terminology in **F-2-10** |
| Demo work uses the `demo:` browser namespace and a separate one-day backend workspace. | 13 | Jargon in **F-2-10**; untested retention in **F-2-6** |
| Choose Reset demo for fresh sample data. | 7 | `sample-demo` |
| Requirements: Node 22+, npm, and the current stable Rust toolchain. | 10 | Run requirement |
| Open `http://localhost:8080`. | 2 | Run instruction |
| The server creates `./data/tickets.db` when no configuration is supplied. | 9 | Operator fact; source verified |
| For frontend development, run `cargo run` and `npm run dev` in separate terminals. | 13 | Run instruction |
| Vite proxies `/api` to port 8080. | 6 | Operator fact; config verified |
| The command checks release contracts, builds `dist/` and the Rust service, then runs the Playwright suite. | 16 | Test instruction; observed |
| Building the service before Playwright's startup timer keeps the first claim command reliable on a clean checkout. | 17 | Developer rationale |
| Claim tests are listed in `.factory/claims.json` and use only fresh sessions or `/demo` sample data. | 15 | Test documentation |
| The container runs as a non-root user. | 7 | Operator fact; Dockerfile verified |
| `PORT` defaults to `8080`. | 4 | Operator fact; source verified |
| `DATA_DIR` and `DATABASE_URL` are optional overrides. | 6 | Operator fact |
| `GET /health` returns the build SHA. | 6 | Operator fact; live response verified |
| The container needs no configuration beyond `PORT`: without `DATABASE_URL` it uses local SQLite under `/app/data`. | 15 | Operator fact; later Azure qualifier supplies context |
| Production supplies `DATABASE_URL` from Key Vault and runs one PostgreSQL-backed replica. | 11 | `production-topology` |
| `deployment/containerapp-contract.json` records the database secret reference and scale settings. | 9 | `production-topology` documentation |
| The deploy gate creates a session, restarts the active revision, then reads and deletes that same session before it reports success. | 21 | `production-topology` |
| An Azure Container Apps revision refuses to start without `DATABASE_URL`. | 10 | Deployment safeguard; source/contract verified |
| This prevents a generic deployment from silently switching production to replica-local SQLite. | 12 | Deployment explanation |
| Local and self-hosted containers keep the zero-configuration SQLite default. | 9 | Operator fact; source verified |
| Authorized factory workers deploy the committed revision with `deployment/deploy.sh`. | 9 | Deploy instruction |
| The deploy check starts a new revision. | 7 | `production-topology` |
| It then confirms that the same session remains available. | 9 | `production-topology` |
| Sessions expire after the teacher's chosen one, seven, or thirty days. | 11 | `session-retention` |
| Free sessions accept up to 40 tickets. | 7 | `free-capacity` |
| Teachers can delete a session early. | 6 | `teacher-control` |
| See `/privacy` and `/terms` for the full plain-language policies. | 9 | Link instruction; policy defect **F-2-1** |
| There is no paid plan. | 5 | `free-no-account-core-flow` |
| Teachers and students can use the core workflow for free and without an account. | 14 | `free-no-account-core-flow` |
| MIT licensed. | 2 | LICENSE present |
| Built by Param Factory. | 4 | Attribution |

### Headings, labels, actions, and terminology

- Landing semantic headings are specific: “Record in-class drafting without surveillance,” “Four drafting prompts,” “How it works,” “Create a session,” “Share the code,” “Review the choices,” and “What this does not do.”
- README headings are understandable out of context: “Try the demo,” “Run locally,” “Test,” “Container,” “Privacy and limits,” and “Project notes.”
- Landing actions name results: **Try it with sample data**, **Start a class session**, and **Export sample CSV**. Demo controls use the required **Reset demo** and **Start for real** wording. No Submit/Go/Continue button appears.
- The 404 h1 is the metaphor finding F-2-12. Raw social metadata is F-2-13.

| Concept | Consistent term | Exception |
| --- | --- | --- |
| Teacher-created class container | session | “timed session,” “seminar,” and “backend workspace” in README; F-2-10/F-2-11 |
| Student process record | draft ticket / ticket | None |
| Student identifier | class nickname | None |
| Teacher credential | private teacher link | Database stores the raw token; disclosure issue F-2-1 |
| Sample environment | demo / sample data | “backend workspace” in README; F-2-10 |
| Download | CSV export | None |

## Structure, routing, accessibility, and visual identity

- `/`, `/?demo=1`, `/demo`, `/join`, `/start`, `/privacy`, and `/terms` returned 200. A direct unknown route returned a designed 404 document with the shared header/footer and legal links.
- Every inspected route had `lang="en"`, one h1, one main, its route title, description, canonical, OG image/title, Twitter card, SVG favicon, and 180px Apple icon. The social image is 1200 × 630. F-2-13 concerns only its raw description copy.
- Titles follow the product/action pattern, including “Demo — In-Class Draft Ticket,” “Privacy — In-Class Draft Ticket,” and “Terms — In-Class Draft Ticket.”
- All discovered internal links returned 200 except the deliberately tested missing URL, which returned 404. The external Param Factory link returned 200; the privacy email is an allowed `mailto:` link.
- The complete local suite passed deep links, Back restoration, route-change h1 focus, skip link, keyboard flow, reduced-motion behavior, offline shell reload, 200% text reflow, 44px targets, and serious/critical axe checks.
- `/opt/fleet/lib/verify-url.sh` passed the live root with no console errors, one h1, `lang=en`, a main landmark, complete alt text, and labelled buttons. Independent axe CLI 4.10.3 reported 0 violations on the live root.
- Response headers include `nosniff`, strict-origin referrer policy, and a CSP with `frame-ancestors 'none'`. No inline-policy error appeared.
- The cream editorial paper field, Fraunces/Atkinson pairing, clipped ticket corners, plotted lines, generated still life, and dark teacher surface match `.factory/design.md`. This is a distinct product identity rather than a generic SaaS card/gradient template.
- The 22.51 kB gzip initial JavaScript is below the applicable budget.

## Earlier-review reconciliation

Every earlier `.factory/review-*.md`, `.factory/polish-*.md`, and `.factory/handoff.md` was read. The four review-1 findings are fixed on the live site and in current source; none is reissued under its old ID.

| Earlier finding | Independent confirmation |
| --- | --- |
| `F-1-1` unlisted AI/authorship/free/no-account claims | Fixed. `claims.json` contains `no-ai-detection-or-authorship-verdict` and `free-no-account-core-flow`; both exact commands passed in two browser projects. New claim issues have new F-2 IDs. |
| `F-1-2` incomplete direct 404 | Fixed. The live 404 returns status 404 and includes header, footer, Privacy, Terms, description, canonical, OG/Twitter data, favicon, and accessible structure. Its metaphorical h1 is the separate F-2-12 copy issue. |
| `F-1-3` hidden mobile Demo/Privacy links | Fixed. At 390px all four header links—Demo, Join, Start a class, Privacy—are visible with 44px targets and no horizontal overflow. |
| `F-1-4` overlong README sentences | Fixed. The replacements are 7, 9, 5, and 14 words. No current landing/README sentence exceeds 22 words. |

The polish report’s additional statements about query-demo routing, reset, Start for real, claim count, catalog description, and visual repair were also checked. They remain present. The new findings concern requirements that those reports did not verify strictly enough.

## Missed leverage

No missing AI feature is identified. The brief asks for a short, privacy-conscious classroom process record; automated analysis of student writing would conflict with the product boundary. No provider or Azure key is embedded, and no model endpoint is called.

CSV export covers the obvious portability need. A roster import or long-lived sync would add student data and is not implied by the smallest useful product. No additional leverage finding is raised.

## What would make this perfect

Correct and test the stored-data disclosure in F-2-1; make a realistic completed ticket visible in the demo’s initial 390px and desktop view; move all three facts into the mobile first screen; strengthen the two weak claim tests; register or remove every unlisted retention/effectiveness claim; and apply the plain-word rewrites in F-2-10 through F-2-13. Then rerun every claim command from a clean clone, the full suite, the fresh live demo/storage check, the route crawl, and the live accessibility checks. PASS requires zero remaining findings.
