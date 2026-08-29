CREATE TABLE IF NOT EXISTS api_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx
  ON api_rate_limits(window_start);
