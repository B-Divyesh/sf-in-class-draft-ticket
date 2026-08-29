CREATE TABLE IF NOT EXISTS in_class_draft_ticket.sessions (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  teacher_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS in_class_draft_ticket.tickets (
  id TEXT PRIMARY KEY,
  session_code TEXT NOT NULL REFERENCES in_class_draft_ticket.sessions(code) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  claim TEXT NOT NULL,
  evidence TEXT NOT NULL,
  revision TEXT NOT NULL,
  reflection TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS tickets_session_idx ON in_class_draft_ticket.tickets(session_code, created_at);

CREATE TABLE IF NOT EXISTS in_class_draft_ticket.api_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_start BIGINT NOT NULL,
  request_count BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx ON in_class_draft_ticket.api_rate_limits(window_start);
