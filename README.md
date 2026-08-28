# In-Class Draft Ticket

Record in-class drafting without surveillance.

In-Class Draft Ticket is for writing teachers who want a short process record during class. A teacher creates a timed session and shares its six-character code. Students use class nicknames to record a claim, evidence location, revision choice, and exit reflection. The teacher reviews the tickets and exports the full session as CSV.

It does not detect AI, record keystrokes, use cameras, or claim to prove authorship.

## Try the demo

Open `/demo` for one fictional seminar with three completed tickets. Demo work uses the `demo:` browser namespace and a separate one-day backend workspace. Choose **Reset demo** for fresh sample data.

Production URL: <https://in-class-draft-ticket.sociobot.in/demo>

## Run locally

Requirements: Node 22+, npm, and Rust 1.88+.

```sh
npm install
npm run build
cargo run
```

Open <http://localhost:8080>. The server creates `./data/tickets.db` when no configuration is supplied.

For frontend development, run `cargo run` and `npm run dev` in separate terminals. Vite proxies `/api` to port 8080.

## Test

```sh
npm test
```

The command builds `dist/`, starts the Rust service, and runs the Playwright suite. Claim tests are listed in `.factory/claims.json` and use only fresh sessions or `/demo` sample data.

## Container

```sh
docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) -t in-class-draft-ticket .
docker run --rm -p 8080:8080 -v draft-ticket-data:/app/data in-class-draft-ticket
```

The container runs as a non-root user and reads only `PORT`, which defaults to `8080`. `DATA_DIR` is an optional local-development override. `GET /health` returns the build SHA.

## Privacy and limits

Sessions expire after the teacher's chosen one, seven, or thirty days. Free sessions accept up to 40 tickets. Teachers can delete a session early. See `/privacy` and `/terms` for the full plain-language policies.

The optional $24 one-time teacher license adds ten prompt presets stored on the current device. Checkout and license checks use the Sociobot billing API; this repository contains no payment-provider code or product ID.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and artwork provenance.
- `.factory/demo.md` explains demo isolation.
- `.factory/copy-audit.md` records the plain-language audit.
- `.factory/handoff.md` records verification results and known gaps.

MIT licensed. Built by Param Factory.
