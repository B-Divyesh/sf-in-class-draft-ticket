# Copy audit

Checked 29 August 2026 for polish round 3. Counts treat hyphenated terms, URLs, and numbers as one word. No audited sentence exceeds 22 words or contains a banned marketing word.

## Landing page sentences

| Copy | Words | Claim or status |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| For writing teachers recording student choices during class. | 8 | Factual audience sentence |
| See three completed tickets. | 4 | `sample-demo` |
| Students use class nicknames. | 4 | `pseudonymous-flow` |
| Sessions expire automatically. | 3 | `session-retention` |
| Free for classes up to 40. | 6 | `free-capacity`, `free-no-account-core-flow` |
| Each ticket records a claim, evidence location, revision, and next step. | 11 | `pseudonymous-flow` |
| Students name one claim, one evidence location, one revision, and one next step. | 13 | `pseudonymous-flow` |
| Memory acts like a second setting. | 6 | Fictional sample content |
| I moved the scene before my explanation. | 7 | Fictional sample content |
| Add the class name, prompt, and deletion date. | 8 | Instruction |
| Keep the private teacher link. | 5 | `teacher-control` |
| Students use a class nickname and answer four short prompts. | 10 | `pseudonymous-flow` |
| Read each ticket beside the draft. | 6 | Instruction |
| Export the full session as CSV. | 6 | `csv-export` |
| Teachers can read each ticket beside the student's draft. | 9 | `pseudonymous-flow` |
| The ticket does not judge who wrote a draft. | 9 | `no-ai-detection-or-authorship-verdict` |

The headings name their sections: “Classroom drafting record,” “Four drafting prompts,” “How it works,” and “What this does not do.” Actions use result-naming verbs. No unsupported effectiveness adjective remains.

## Demo and legal sentences changed in round 2

| Copy | Words | Claim or status |
| --- | ---: | --- |
| These three fictional tickets show the session sheet after an in-class draft. | 12 | `sample-demo` |
| In-Class Draft Ticket stores class content and the service data needed to protect and delete each session. | 17 | `data-storage-minimization` |
| We store class names, prompts, class nicknames, ticket answers, and creation and deletion timestamps. | 14 | `data-storage-minimization` |
| Random IDs connect records without using student names. | 8 | `data-storage-minimization` |
| A demo marker keeps sample sessions separate. | 7 | `data-storage-minimization`, `sample-demo` |
| Teacher links contain a random credential. | 6 | `teacher-control`, `data-storage-minimization` |
| The database stores only its one-way hash. | 7 | `data-storage-minimization` |
| A random server key turns each request IP into a rotating, one-way rate-limit key before storage. | 16 | `data-storage-minimization` |
| Rate-limit counters and keys are deleted within four seconds. | 9 | `data-storage-minimization` |
| We do not ask for student names, email addresses, or accounts. | 11 | `data-storage-minimization`, `free-no-account-core-flow` |
| Demo sessions expire after 24 hours. | 6 | `sample-demo` |
| Page not found. | 3 | Plain 404 heading |
| This point is not connected to a draft session or page. | 11 | Supporting visual-system copy |

## README sentences changed in round 2

| Copy | Words | Claim or status |
| --- | ---: | --- |
| A teacher creates a session with a deletion date and shares its six-character code. | 14 | `session-retention` |
| Open `/?demo=1` for a sample session with three completed tickets. | 10 | `sample-demo` |
| Demo work stays separate from your classes and expires after 24 hours. | 12 | `sample-demo` |
| Choose Reset demo for fresh sample data. | 7 | `sample-demo` |

## README sentences changed in round 3

| Copy | Words | Claim or status |
| --- | ---: | --- |
| The container needs no configuration beyond `PORT`. | 7 | Runtime instruction; release-contract test |
| Without `DATABASE_URL`, it uses local SQLite under `/app/data`. | 7 | Runtime instruction; Rust configuration test |
| Local and self-hosted containers keep the zero-configuration SQLite default. | 9 | Runtime instruction; Rust configuration test |
| Authorized factory workers deploy the committed revision with `npm run deploy:release`. | 9 | Release instruction, not a product claim |
| This command changes the live service, so it is not a claim test. | 13 | F-3-1 boundary |
| The release command rejects dirty or unpushed code. | 8 | Release instruction; release-contract test |
| It samples the uncached live build identity 20 times before and after a restart. | 14 | Release instruction; live-identity regression test |
| It also checks browser flows, rate limiting, and record persistence. | 9 | Release instruction; release-contract test |
| To check a deployed candidate without changing production, run: | 9 | Release instruction |
| The latest SHA-bound deployment evidence is recorded in `.factory/polish-3.md`. | 9 | Evidence pointer |
| The deployment contract remains in `deployment/containerapp-contract.json`. | 5 | Documentation pointer |

The production-mutating operation is no longer listed in `.factory/claims.json`. The new `every product claim runs in a clean local sandbox` contract rejects deploy, Azure, live-verifier, and live-domain commands.

## First-screen read-aloud check

“Record in-class drafting without surveillance. For writing teachers recording student choices during class. Try it with sample data.”

The job, user, and first action fit one breath. The three privacy, retention, and price facts appear in the initial 390 × 844 viewport.

## Terminology

| Concept | Approved term |
| --- | --- |
| Teacher-created collection period | session |
| One student's process record | draft ticket |
| Student identifier | class nickname |
| Secret recovery URL | private teacher link |
| Sample environment | demo |
| Downloaded session sheet | CSV export |

Catalog description: “Record four in-class drafting choices without surveillance.” (59 characters).
