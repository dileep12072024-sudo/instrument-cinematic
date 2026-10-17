-- One row per device (anonymous browser ID kept in the visitor's localStorage); one row per visit (browser tab session).
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, visits INTEGER NOT NULL DEFAULT 0,
  device TEXT, os TEXT, browser TEXT, screen TEXT, language TEXT, timezone TEXT, city TEXT, region TEXT, country TEXT, label TEXT
);
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY, device_id TEXT NOT NULL, started INTEGER NOT NULL, last_active INTEGER NOT NULL,
  host TEXT, path TEXT, referrer TEXT, city TEXT, country TEXT
);
CREATE INDEX IF NOT EXISTS visits_by_device ON visits (device_id, started);
CREATE INDEX IF NOT EXISTS devices_by_last ON devices (last_seen);
