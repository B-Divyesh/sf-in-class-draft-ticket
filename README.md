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

The container needs no configuration beyond `PORT`: without `DATABASE_URL` it uses local SQLite under `/app/data`. Production supplies `DATABASE_URL` from Key Vault and runs one PostgreSQL-backed replica. [`deployment/containerapp-contract.json`](deployment/containerapp-contract.json) records the database secret reference and scale settings. The deploy gate creates a session, restarts the active revision, then reads and deletes that same session before it reports success.

An Azure Container Apps revision refuses to start without `DATABASE_URL`. This prevents a generic deployment from silently switching production to replica-local SQLite. Local and self-hosted containers keep the zero-configuration SQLite default.

Authorized factory workers deploy the committed revision with `deployment/deploy.sh`. That path builds in ACR, binds the Key Vault PostgreSQL URL to the new revision, and refuses success until fresh browser flows and the revision-restart persistence check pass.

## Privacy and limits

Sessions expire after the teacher's chosen one, seven, or thirty days. Free sessions accept up to 40 tickets. Teachers can delete a session early. See `/privacy` and `/terms` for the full plain-language policies.

All class-session features are free. The researched freemium add-on is intentionally not offered until its Sociobot billing product is registered; the core teacher and student workflow remains available without payment or an account.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and artwork provenance.
- `.factory/demo.md` explains demo isolation.
- `.factory/copy-audit.md` records the plain-language audit.
- `.factory/handoff.md` records verification results and known gaps.

MIT licensed. Built by Param Factory.
