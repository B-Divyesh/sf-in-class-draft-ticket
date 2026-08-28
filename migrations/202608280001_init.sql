CREATE TABLE IF NOT EXISTS sessions (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  teacher_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  session_code TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  claim TEXT NOT NULL,
  evidence TEXT NOT NULL,
  revision TEXT NOT NULL,
  reflection TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS tickets_session_idx ON tickets(session_code, created_at);
