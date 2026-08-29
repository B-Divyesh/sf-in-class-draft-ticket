# In-Class Draft Ticket

Record in-class drafting without surveillance.

In-Class Draft Ticket is for writing teachers who want a short process record during class. A teacher creates a session with a deletion date and shares its six-character code. Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. The teacher reviews the tickets and exports the full session as CSV.

It does not detect AI, record keystrokes, use cameras, or claim to prove authorship.

## Try the demo

Open `/?demo=1` for a sample session with three completed tickets. Demo work stays separate from your classes and expires after 24 hours. Choose **Reset demo** for fresh sample data.

Production URL: <https://in-class-draft-ticket.sociobot.in/?demo=1>

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

The container runs as a non-root user. `PORT` defaults to `8080`. `DATA_DIR` and `DATABASE_URL` are optional overrides. `GET /health` returns the build SHA.

The container needs no configuration beyond `PORT`. Without `DATABASE_URL`, it uses local SQLite under `/app/data`.

Local and self-hosted containers keep the zero-configuration SQLite default.

## Release

Authorized factory workers deploy the committed revision with `npm run deploy:release`. This command changes the live service, so it is not a claim test.

The release command rejects dirty or unpushed code. It samples the uncached live build identity 20 times before and after a restart. It also checks browser flows, rate limiting, and record persistence.

To check a deployed candidate without changing production, run:

```sh
LIVE_EXPECTED_SHA=$(git rev-parse HEAD) npm run verify:live-identity
```

The latest SHA-bound deployment evidence is recorded in [`.factory/polish-3.md`](.factory/polish-3.md). The deployment contract remains in [`deployment/containerapp-contract.json`](deployment/containerapp-contract.json).

## Privacy and limits

Sessions expire after the teacher's chosen one, seven, or thirty days. Free sessions accept up to 40 tickets. Teachers can delete a session early. See `/privacy` and `/terms` for the full plain-language policies.

There is no paid plan. Teachers and students can use the core workflow for free and without an account.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and artwork provenance.
- `.factory/demo.md` explains demo isolation.
- `.factory/copy-audit.md` records the plain-language audit.
- `.factory/handoff.md` records verification results and known gaps.

MIT licensed. Built by Param Factory.
