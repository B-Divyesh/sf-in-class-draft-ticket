# In-Class Draft Ticket

Record in-class drafting without surveillance.

In-Class Draft Ticket is for writing teachers who want a short process record during class. A teacher creates a timed session and shares its six-character code. Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. The teacher reviews the tickets and exports the full session as CSV.

It does not detect AI, record keystrokes, use cameras, or claim to prove authorship.

## Try the demo

Open `/demo` for one fictional seminar with three completed tickets. Demo work uses the `demo:` browser namespace and a separate one-day backend workspace. Choose **Reset demo** for fresh sample data.

Production URL: <https://in-class-draft-ticket.sociobot.in/demo>

## Run locally

Requirements: Node 22+, npm, and the current stable Rust toolchain.

```sh
npm ci
npm run build
cargo run
```

Open <http://localhost:8080>. The server creates `./data/tickets.db` when no configuration is supplied.

For frontend development, run `cargo run` and `npm run dev` in separate terminals. Vite proxies `/api` to port 8080.

## Test

```sh
npm test
```

The command checks release contracts, builds `dist/` and the Rust service, then runs the Playwright suite. Building the service before Playwright's startup timer keeps the first claim command reliable on a clean checkout. Claim tests are listed in `.factory/claims.json` and use only fresh sessions or `/demo` sample data.

## Container

```sh
docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) -t in-class-draft-ticket .
docker run --rm -p 8080:8080 -v draft-ticket-data:/app/data in-class-draft-ticket
```

The container runs as a non-root user and reads only `PORT`, which defaults to `8080`. `DATA_DIR` is an optional local-development override. `GET /health` returns the build SHA.

The container needs no configuration beyond `PORT`: without `DATABASE_URL` it uses local SQLite under `/app/data`. Factory production supplies `DATABASE_URL` from Key Vault and runs two to three replicas against one dedicated schema in the existing managed PostgreSQL service. Sessions and per-client rate counters are therefore shared across every replica. [`deployment/containerapp-contract.json`](deployment/containerapp-contract.json) records the database secret reference and scale settings. `npm run test:contracts` also starts three local processes on one datastore and checks demo, teacher, student, export, delete, capacity, and rate-limit behavior across them.

Authorized factory workers deploy the committed revision with `deployment/deploy.sh`. That path builds in ACR, applies the shared-volume contract atomically, and refuses success until the live revision reports both the commit and the mount.

## Privacy and limits

Sessions expire after the teacher's chosen one, seven, or thirty days. Free sessions accept up to 40 tickets. Teachers can delete a session early. See `/privacy` and `/terms` for the full plain-language policies.

An active teacher license can add ten prompt presets stored on the current device. New licenses are not sold from this site; existing licenses are checked through the Sociobot billing API. This repository contains no payment-provider code or product ID.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and artwork provenance.
- `.factory/demo.md` explains demo isolation.
- `.factory/copy-audit.md` records the plain-language audit.
- `.factory/handoff.md` records verification results and known gaps.

MIT licensed. Built by Param Factory.
