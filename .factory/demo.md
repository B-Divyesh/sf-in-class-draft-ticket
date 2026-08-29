# Demo sandbox

- URL: `https://in-class-draft-ticket.sociobot.in/?demo=1` (local: `http://localhost:8080/?demo=1`; `/demo` is an equivalent route)
- Sample: one fictional literature seminar with three completed draft tickets from Blue Finch, Copper Kite, and Quiet Maple.
- First result: Blue Finch's completed claim and revision appear above session controls in the initial phone and desktop viewport.
- Reset: choose **Reset demo** in the persistent demo bar. This discards the current demo reference and provisions a fresh 24-hour session.
- Leave: choose **Start for real**. The demo reference is discarded before teacher setup opens.
- Browser namespace: only `demo:workspace` is used for the demo. Real teacher access uses `teacher:<code>` and is never read in demo mode.
- Backend isolation: `POST /api/demo` creates a new session marked `is_demo = true`, with a random code and private token. It expires after 24 hours. The demo route never queries a production teacher session.
- Regression boundary: `@claim:sample-demo` creates a real session first, then proves demo entry, reset, and exit leave its browser key and backend record byte-for-byte unchanged.

The sample can verify the teacher sheet, reset behavior, privacy boundary, and CSV export without an account or real student data.
