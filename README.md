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

Open <http://localhost:8080>.

For frontend development, run `cargo run` and `npm run dev` in separate terminals.

## Test

```sh
npm test
```

## Container

```sh
docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) -t in-class-draft-ticket .
docker run --rm -p 8080:8080 -v draft-ticket-data:/data in-class-draft-ticket
```

`PORT` defaults to `8080`. SQLite stores runtime state in `/data/tickets.db` when `/data` is mounted and `./data/tickets.db` otherwise. `DATA_DIR` chooses another local path.

`GET /health` returns the build SHA and selected storage backend.

## Release

Factory workers deploy a clean, pushed `main` commit with `DEPLOY_IMAGE=<immutable-image> npm run deploy:release`. The release gate requires one ready replica, one mounted `/data` volume, and no runtime secrets.

## Privacy and limits

Sessions expire after the teacher's chosen one, seven, or thirty days. Free sessions accept up to 40 draft tickets. Teachers can delete a session early. See `/privacy` and `/terms` for the full plain-language policies.

There is no paid plan. Teachers and students can use the core workflow for free and without an account.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and artwork provenance.
- `.factory/demo.md` explains demo isolation.
- `.factory/copy-audit.md` records the plain-language audit.
- `.factory/handoff.md` records verification results and known gaps.

MIT licensed. Built by Param Factory.
