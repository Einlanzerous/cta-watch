-- One-time cleanup (CTAW-24) — remove the mock on-time data that kept the trend
-- charts populated at launch, now that enough real history has accumulated to
-- fill them on its own.
--
--   npm run db:purge-mock:remote --workspace=worker    # production D1
--   npm run db:purge-mock:local  --workspace=worker    # local dev D1
--
-- Run it only once the 30-day trend window is entirely real data (the charts
-- read `on_time_hourly` over the last 30 days and `on_time_records` over the
-- last 720 hours); purging earlier leaves visible gaps until the poll job
-- catches up.
--
-- Safe to re-run, and safe on a database that has never seen live data: every
-- statement is a no-op unless at least one real (is_mock = 0) record exists, so
-- mock-mode deployments and local dev keep their seeded history.

-- 1. Raw records: the 30-day seed history plus any polls recorded while the
--    Worker was still in mock mode.
DELETE FROM on_time_records
WHERE is_mock = 1
  AND EXISTS (SELECT 1 FROM on_time_records WHERE is_mock = 0);

-- 2. Hourly aggregates, rebuilt from the surviving real records rather than
--    deleted by date. `on_time_hourly` has no is_mock column and the nightly
--    prune never touches it, so a rebuild is what both drops the mock-only
--    buckets and de-contaminates the cutover hour, whose running average
--    blended the last mock polls with the first real ones.
--
--    Rebuilding is lossless for anything the app reads: raw records are kept
--    for a year and the only reader of this table asks for 30 days. The
--    averages shift by at most 0.05 because raw on_time_pct is stored rounded
--    to one decimal while the live upsert averaged the unrounded value. The
--    rebuild does reassign on_time_hourly row ids; nothing reads them.
DELETE FROM on_time_hourly
WHERE EXISTS (SELECT 1 FROM on_time_records WHERE is_mock = 0);

INSERT INTO on_time_hourly (line_id, hour_bucket, avg_on_time, sample_count)
SELECT line_id,
       strftime('%Y-%m-%dT%H:00:00Z', recorded_at) AS hour_bucket,
       AVG(on_time_pct),
       COUNT(*)
FROM on_time_records
WHERE is_mock = 0
GROUP BY line_id, hour_bucket;

-- 3. Report what survived, so the operator can confirm the purge landed.
SELECT (SELECT COUNT(*) FROM on_time_records WHERE is_mock = 1) AS mock_records_left,
       (SELECT COUNT(*) FROM on_time_records)                   AS real_records,
       (SELECT COUNT(*) FROM on_time_hourly)                    AS hourly_buckets,
       (SELECT MIN(recorded_at) FROM on_time_records)           AS oldest_record,
       (SELECT MAX(recorded_at) FROM on_time_records)           AS newest_record;
