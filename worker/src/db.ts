// D1 port of server/src/db.ts. SQL is unchanged; the sync better-sqlite3 API
// becomes bound D1 prepared statements that callers await (.first()/.all()/.run())
// or collect into db.batch() where the original used db.transaction().

export const SQL = {
  // ── On-time raw records ──────────────────────────────────────────────────────
  insertOnTime: `INSERT INTO on_time_records (line_id, total_trains, delayed_trains, on_time_pct, is_mock, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  countOnTime: `SELECT COUNT(*) as cnt FROM on_time_records`,
  getLatestOnTime: `SELECT on_time_pct, recorded_at FROM on_time_records
     WHERE line_id = ? ORDER BY recorded_at DESC LIMIT 1`,
  getOnTimeLast24h: `SELECT strftime('%Y-%m-%dT%H:00:00Z', recorded_at) as bucket,
            AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ? AND recorded_at >= datetime('now', '-24 hours')
     GROUP BY bucket ORDER BY bucket ASC`,
  pruneOnTime: `DELETE FROM on_time_records WHERE recorded_at < datetime('now', '-365 days')`,
  getAvgOnTimePeriod: `SELECT AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ? AND recorded_at >= datetime('now', ? || ' hours')`,
  // Last full Sun–Sat week (not a rolling 7 days)
  getLastFullWeekTrend: `SELECT strftime('%Y-%m-%dT%H:00:00Z', recorded_at) as bucket,
            AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ?
       AND date(recorded_at) >= date('now', 'weekday 6', '-13 days')
       AND date(recorded_at) <= date('now', 'weekday 6', '-7 days')
     GROUP BY bucket ORDER BY bucket ASC`,
  getAvgLastFullWeek: `SELECT AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ?
       AND date(recorded_at) >= date('now', 'weekday 6', '-13 days')
       AND date(recorded_at) <= date('now', 'weekday 6', '-7 days')`,

  // ── Hourly aggregates ────────────────────────────────────────────────────────
  upsertHourly: `INSERT INTO on_time_hourly (line_id, hour_bucket, avg_on_time, sample_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(line_id, hour_bucket) DO UPDATE SET
       avg_on_time   = (avg_on_time * sample_count + excluded.avg_on_time) / (sample_count + 1),
       sample_count  = sample_count + 1`,
  getHourlyTrend: `SELECT hour_bucket as bucket, avg_on_time as onTimePct
     FROM on_time_hourly
     WHERE line_id = ? AND hour_bucket >= datetime('now', ? || ' days')
     ORDER BY bucket ASC`,

  // ── Fleet ────────────────────────────────────────────────────────────────────
  upsertFleet: `INSERT INTO fleet_records (line_id, series, car_count, upgrading_from, upgrading_to, upgrade_pct, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(line_id, series) DO UPDATE SET
       car_count = excluded.car_count, upgrading_from = excluded.upgrading_from,
       upgrading_to = excluded.upgrading_to, upgrade_pct = excluded.upgrade_pct,
       updated_at = excluded.updated_at`,
  countFleet: `SELECT COUNT(*) as cnt FROM fleet_records`,
  getFleet: `SELECT fr.series, fr.car_count, fr.upgrading_from, fr.upgrading_to, fr.upgrade_pct,
            si.builder, si.origin_country, si.year_introduced, si.year_retired, si.notes
     FROM fleet_records fr
     JOIN series_info si ON fr.series = si.series
     WHERE fr.line_id = ? AND fr.car_count > 0 ORDER BY fr.car_count DESC`,

  // ── Series info ──────────────────────────────────────────────────────────────
  insertSeriesInfo: `INSERT INTO series_info (series, builder, origin_country, year_introduced, year_retired, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(series) DO UPDATE SET
       builder = excluded.builder, origin_country = excluded.origin_country,
       year_introduced = excluded.year_introduced, year_retired = excluded.year_retired,
       notes = excluded.notes`,

  // ── Stations ────────────────────────────────────────────────────────────────
  upsertStation: `INSERT INTO stations (station_id, line_id, station_name, ada, lat, lon)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(station_id, line_id) DO NOTHING`,
  countStations: `SELECT COUNT(*) as cnt FROM stations`,
  getStationsForLine: `SELECT station_id, station_name, ada, lat, lon FROM stations WHERE line_id = ? ORDER BY station_name ASC`,

  // ── Ridership ────────────────────────────────────────────────────────────────
  upsertRidership: `INSERT INTO ridership_records (station_id, ride_date, rides)
     VALUES (?, ?, ?)
     ON CONFLICT(station_id, ride_date) DO UPDATE SET rides = excluded.rides`,
  getLatestRidershipDate: `SELECT MAX(ride_date) as max_date FROM ridership_records`,
  getRidershipMonthly: `SELECT strftime('%Y-%m', rr.ride_date) as month,
            SUM(rr.rides) as total,
            COUNT(DISTINCT rr.ride_date) as days
     FROM ridership_records rr
     JOIN stations s ON rr.station_id = s.station_id
     WHERE s.line_id = ?
     GROUP BY month ORDER BY month DESC LIMIT 16`,
  getRidershipDayTypeAvg: `SELECT
       ROUND(AVG(CASE WHEN strftime('%w', sub.ride_date) NOT IN ('0','6') THEN sub.daily END)) as weekday_avg,
       ROUND(AVG(CASE WHEN strftime('%w', sub.ride_date) IN ('0','6') THEN sub.daily END)) as weekend_avg
     FROM (
       SELECT rr.ride_date, SUM(rr.rides) as daily
       FROM ridership_records rr
       JOIN stations s ON rr.station_id = s.station_id
       WHERE s.line_id = ?
       GROUP BY rr.ride_date
     ) sub`,
  getTodayLineRidership: `SELECT COALESCE(SUM(rr.rides), 0) as total
     FROM ridership_records rr
     JOIN stations s ON rr.station_id = s.station_id
     WHERE s.line_id = ?
       AND rr.ride_date = (SELECT MAX(ride_date) FROM ridership_records)`,
  getStationsWithRidership: `SELECT s.station_id, s.station_name, s.ada,
            COALESCE(MAX(CASE WHEN rr.ride_date = (SELECT MAX(ride_date) FROM ridership_records) THEN rr.rides END), 0) as rides_latest,
            COALESCE(AVG(rr.rides), 0) as rides_avg
     FROM stations s
     LEFT JOIN ridership_records rr ON s.station_id = rr.station_id
     WHERE s.line_id = ?
     GROUP BY s.station_id, s.station_name, s.ada
     ORDER BY rides_latest DESC`,
  getRidership7dForStation: `SELECT ride_date as date, rides
     FROM ridership_records
     WHERE station_id = ?
     ORDER BY ride_date DESC LIMIT 7`,
} as const;

/** Bound-statement builders mirroring the old `q` object. */
export function createQ(db: D1Database) {
  return {
    insertOnTime: (lineId: string, total: number, delayed: number, pct: number, isMock: number, at: string) =>
      db.prepare(SQL.insertOnTime).bind(lineId, total, delayed, pct, isMock, at),
    getLatestOnTime: (lineId: string) => db.prepare(SQL.getLatestOnTime).bind(lineId),
    getOnTimeLast24h: (lineId: string) => db.prepare(SQL.getOnTimeLast24h).bind(lineId),
    pruneOnTime: () => db.prepare(SQL.pruneOnTime),
    getAvgOnTimePeriod: (lineId: string, hours: string) => db.prepare(SQL.getAvgOnTimePeriod).bind(lineId, hours),
    getLastFullWeekTrend: (lineId: string) => db.prepare(SQL.getLastFullWeekTrend).bind(lineId),
    getAvgLastFullWeek: (lineId: string) => db.prepare(SQL.getAvgLastFullWeek).bind(lineId),
    upsertHourly: (lineId: string, bucket: string, pct: number) =>
      db.prepare(SQL.upsertHourly).bind(lineId, bucket, pct),
    getHourlyTrend: (lineId: string, days: string) => db.prepare(SQL.getHourlyTrend).bind(lineId, days),
    upsertFleet: (lineId: string, series: number, carCount: number, from: number | null, to: number | null, pct: number, at: string) =>
      db.prepare(SQL.upsertFleet).bind(lineId, series, carCount, from, to, pct, at),
    getFleet: (lineId: string) => db.prepare(SQL.getFleet).bind(lineId),
    insertSeriesInfo: (series: number, builder: string, country: string, introduced: number, retired: number | null, notes: string) =>
      db.prepare(SQL.insertSeriesInfo).bind(series, builder, country, introduced, retired, notes),
    upsertRidership: (stationId: string, date: string, rides: number) =>
      db.prepare(SQL.upsertRidership).bind(stationId, date, rides),
    getLatestRidershipDate: () => db.prepare(SQL.getLatestRidershipDate),
    getRidershipMonthly: (lineId: string) => db.prepare(SQL.getRidershipMonthly).bind(lineId),
    getRidershipDayTypeAvg: (lineId: string) => db.prepare(SQL.getRidershipDayTypeAvg).bind(lineId),
    getTodayLineRidership: (lineId: string) => db.prepare(SQL.getTodayLineRidership).bind(lineId),
    getStationsWithRidership: (lineId: string) => db.prepare(SQL.getStationsWithRidership).bind(lineId),
    getRidership7dForStation: (stationId: string) => db.prepare(SQL.getRidership7dForStation).bind(stationId),
  };
}

export type Q = ReturnType<typeof createQ>;
