-- Migration number: 0002 	 read budget (SERV-251)
-- D1 bills rows read, and the free tier allows 5M/day. The API used to
-- recompute every line's stats from raw records on each request, which blew
-- through that on a few hundred page views.

-- MAX(ride_date) was a full-table scan; this makes it one index probe.
CREATE INDEX IF NOT EXISTS idx_ridership_date ON ridership_records(ride_date);

-- Precomputed API payloads and the parts they are assembled from, written by
-- the cron jobs (src/snapshots.ts). A request reads one row.
CREATE TABLE IF NOT EXISTS api_snapshots (
  key       TEXT PRIMARY KEY,
  body      TEXT NOT NULL,
  built_at  TEXT NOT NULL
);
