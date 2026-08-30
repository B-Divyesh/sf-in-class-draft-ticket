# Copy audit

Checked 30 August 2026 for polish round 4. Counts treat hyphenated terms, URLs, and numbers as one word. No audited sentence exceeds 22 words or contains a banned marketing word.

## Landing page sentences

| Copy | Words | Claim or status |
| --- | ---: | --- |
| Record in-class drafting without surveillance. | 5 | `privacy-minimal` |
| For writing teachers recording student choices during class. | 8 | Factual audience sentence |
| See three completed tickets. | 4 | `sample-demo` |
| Students use class nicknames. | 4 | `pseudonymous-flow` |
| Sessions expire automatically. | 3 | `session-retention` |
| Free sessions accept up to 40 draft tickets. | 8 | `free-capacity` |
| Each ticket records a claim, evidence location, revision, and exit reflection. | 11 | `pseudonymous-flow` |
| Students name one claim, one evidence location, one revision, and one exit reflection. | 13 | `pseudonymous-flow` |
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

## README runtime and release promises repaired after verification 19

| Copy | Words | Claim or status |
| --- | ---: | --- |
| `PORT` defaults to `8080`. | 4 | `runtime-defaults` |
| SQLite stores runtime state in `/data/tickets.db` when `/data` is mounted and `./data/tickets.db` otherwise. | 15 | `runtime-defaults` |
| `DATA_DIR` chooses another local path. | 5 | `runtime-defaults` |
| `GET /health` returns the build SHA and selected storage backend. | 9 | `health-build-identity` |
| Factory workers deploy a clean, pushed `main` commit with `npm run deploy:release`. | 10 | Release instruction |
| The release gate requires one ready replica, one mounted `/data` volume, and no runtime secrets. | 15 | `release-contract` |

The three runtime and release promises are now entries in `.factory/claims.json`. Their declared commands run entirely in a local sandbox; the production-mutating command remains outside the claim runner.

## Polish round 4 terminology repair

| Copy | Words | Claim or status |
| --- | ---: | --- |
| Free sessions accept up to 40 draft tickets. | 8 | `free-capacity`; landing, terms, and README use the same unit. |
| Each ticket records a claim, evidence location, revision, and exit reflection. | 11 | `pseudonymous-flow`; matches the student field. |
| Students name one claim, one evidence location, one revision, and one exit reflection. | 13 | `pseudonymous-flow`; matches the student field. |
| What will you revisit after class? | 6 | Helper text for the exit reflection field. |

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
| Fourth drafting checkpoint | exit reflection |
| Downloaded session sheet | CSV export |

Catalog description: “Record up to 40 in-class draft tickets without surveillance.” (60 characters).
