import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config';

const dbDir = path.dirname(path.resolve(config.dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS on_time_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id         TEXT    NOT NULL,
    total_trains    INTEGER NOT NULL DEFAULT 0,
    delayed_trains  INTEGER NOT NULL DEFAULT 0,
    on_time_pct     REAL    NOT NULL DEFAULT 100.0,
    is_mock         INTEGER NOT NULL DEFAULT 0,
    recorded_at     TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ontime_line_time
    ON on_time_records(line_id, recorded_at);

  CREATE TABLE IF NOT EXISTS on_time_hourly (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id       TEXT    NOT NULL,
    hour_bucket   TEXT    NOT NULL,
    avg_on_time   REAL    NOT NULL,
    sample_count  INTEGER NOT NULL DEFAULT 1,
    UNIQUE(line_id, hour_bucket)
  );
  CREATE INDEX IF NOT EXISTS idx_hourly_line_bucket
    ON on_time_hourly(line_id, hour_bucket);

  CREATE TABLE IF NOT EXISTS fleet_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id         TEXT    NOT NULL,
    series          INTEGER NOT NULL,
    car_count       INTEGER NOT NULL DEFAULT 0,
    upgrading_from  INTEGER,
    upgrading_to    INTEGER,
    upgrade_pct     REAL    NOT NULL DEFAULT 0.0,
    updated_at      TEXT    NOT NULL,
    UNIQUE(line_id, series)
  );

  CREATE TABLE IF NOT EXISTS series_info (
    series            INTEGER PRIMARY KEY,
    builder           TEXT    NOT NULL,
    origin_country    TEXT    NOT NULL,
    year_introduced   INTEGER NOT NULL,
    year_retired      INTEGER,
    notes             TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS stations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id    TEXT    NOT NULL,
    line_id       TEXT    NOT NULL,
    station_name  TEXT    NOT NULL,
    ada           INTEGER NOT NULL DEFAULT 0,
    lat           REAL,
    lon           REAL,
    UNIQUE(station_id, line_id)
  );
  CREATE INDEX IF NOT EXISTS idx_stations_line ON stations(line_id);

  CREATE TABLE IF NOT EXISTS ridership_records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id  TEXT    NOT NULL,
    ride_date   TEXT    NOT NULL,
    rides       INTEGER NOT NULL DEFAULT 0,
    UNIQUE(station_id, ride_date)
  );
  CREATE INDEX IF NOT EXISTS idx_ridership_station_date
    ON ridership_records(station_id, ride_date);
`);

export const q = {
  // ── On-time raw records ──────────────────────────────────────────────────────
  insertOnTime: db.prepare(
    `INSERT INTO on_time_records (line_id, total_trains, delayed_trains, on_time_pct, is_mock, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ),
  countOnTime: db.prepare(`SELECT COUNT(*) as cnt FROM on_time_records`),
  getLatestOnTime: db.prepare(
    `SELECT on_time_pct, recorded_at FROM on_time_records
     WHERE line_id = ? ORDER BY recorded_at DESC LIMIT 1`
  ),
  getOnTimeLast24h: db.prepare(
    `SELECT strftime('%Y-%m-%dT%H:00:00Z', recorded_at) as bucket,
            AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ? AND recorded_at >= datetime('now', '-24 hours')
     GROUP BY bucket ORDER BY bucket ASC`
  ),
  pruneOnTime: db.prepare(
    `DELETE FROM on_time_records WHERE recorded_at < datetime('now', '-365 days')`
  ),
  getAvgOnTimePeriod: db.prepare(
    `SELECT AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ? AND recorded_at >= datetime('now', ? || ' hours')`
  ),
  // Last full Sun–Sat week (not a rolling 7 days)
  getLastFullWeekTrend: db.prepare(
    `SELECT strftime('%Y-%m-%dT%H:00:00Z', recorded_at) as bucket,
            AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ?
       AND date(recorded_at) >= date('now', 'weekday 6', '-13 days')
       AND date(recorded_at) <= date('now', 'weekday 6', '-7 days')
     GROUP BY bucket ORDER BY bucket ASC`
  ),
  getAvgLastFullWeek: db.prepare(
    `SELECT AVG(on_time_pct) as avg_pct
     FROM on_time_records
     WHERE line_id = ?
       AND date(recorded_at) >= date('now', 'weekday 6', '-13 days')
       AND date(recorded_at) <= date('now', 'weekday 6', '-7 days')`
  ),

  // ── Hourly aggregates ────────────────────────────────────────────────────────
  upsertHourly: db.prepare(
    `INSERT INTO on_time_hourly (line_id, hour_bucket, avg_on_time, sample_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(line_id, hour_bucket) DO UPDATE SET
       avg_on_time   = (avg_on_time * sample_count + excluded.avg_on_time) / (sample_count + 1),
       sample_count  = sample_count + 1`
  ),
  getHourlyTrend: db.prepare(
    `SELECT hour_bucket as bucket, avg_on_time as onTimePct
     FROM on_time_hourly
     WHERE line_id = ? AND hour_bucket >= datetime('now', ? || ' days')
     ORDER BY bucket ASC`
  ),

  // ── Fleet ────────────────────────────────────────────────────────────────────
  upsertFleet: db.prepare(
    `INSERT INTO fleet_records (line_id, series, car_count, upgrading_from, upgrading_to, upgrade_pct, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(line_id, series) DO UPDATE SET
       car_count = excluded.car_count, upgrading_from = excluded.upgrading_from,
       upgrading_to = excluded.upgrading_to, upgrade_pct = excluded.upgrade_pct,
       updated_at = excluded.updated_at`
  ),
  countFleet: db.prepare(`SELECT COUNT(*) as cnt FROM fleet_records`),
  getFleet: db.prepare(
    `SELECT fr.series, fr.car_count, fr.upgrading_from, fr.upgrading_to, fr.upgrade_pct,
            si.builder, si.origin_country, si.year_introduced, si.year_retired, si.notes
     FROM fleet_records fr
     JOIN series_info si ON fr.series = si.series
     WHERE fr.line_id = ? ORDER BY fr.car_count DESC`
  ),

  // ── Series info ──────────────────────────────────────────────────────────────
  insertSeriesInfo: db.prepare(
    `INSERT INTO series_info (series, builder, origin_country, year_introduced, year_retired, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(series) DO UPDATE SET
       builder = excluded.builder, origin_country = excluded.origin_country,
       year_introduced = excluded.year_introduced, year_retired = excluded.year_retired,
       notes = excluded.notes`
  ),

  // ── Stations ────────────────────────────────────────────────────────────────
  upsertStation: db.prepare(
    `INSERT INTO stations (station_id, line_id, station_name, ada, lat, lon)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(station_id, line_id) DO NOTHING`
  ),
  countStations: db.prepare(`SELECT COUNT(*) as cnt FROM stations`),
  getStationsForLine: db.prepare(
    `SELECT station_id, station_name, ada, lat, lon FROM stations WHERE line_id = ? ORDER BY station_name ASC`
  ),

  // ── Ridership ────────────────────────────────────────────────────────────────
  upsertRidership: db.prepare(
    `INSERT INTO ridership_records (station_id, ride_date, rides)
     VALUES (?, ?, ?)
     ON CONFLICT(station_id, ride_date) DO UPDATE SET rides = excluded.rides`
  ),
  getStationRidership7d: db.prepare(
    `SELECT ride_date, rides FROM ridership_records
     WHERE station_id = ? ORDER BY ride_date DESC LIMIT 7`
  ),
  getLatestRidershipDate: db.prepare(
    `SELECT MAX(ride_date) as max_date FROM ridership_records`
  ),
  countRidershipDays: db.prepare(
    `SELECT COUNT(DISTINCT ride_date) as days FROM ridership_records`
  ),
  getRidershipMonthly: db.prepare(
    `SELECT strftime('%Y-%m', rr.ride_date) as month,
            SUM(rr.rides) as total,
            COUNT(DISTINCT rr.ride_date) as days
     FROM ridership_records rr
     JOIN stations s ON rr.station_id = s.station_id
     WHERE s.line_id = ?
     GROUP BY month ORDER BY month DESC LIMIT 16`
  ),
  getRidershipDayTypeAvg: db.prepare(
    `SELECT
       ROUND(AVG(CASE WHEN strftime('%w', sub.ride_date) NOT IN ('0','6') THEN sub.daily END)) as weekday_avg,
       ROUND(AVG(CASE WHEN strftime('%w', sub.ride_date) IN ('0','6') THEN sub.daily END)) as weekend_avg
     FROM (
       SELECT rr.ride_date, SUM(rr.rides) as daily
       FROM ridership_records rr
       JOIN stations s ON rr.station_id = s.station_id
       WHERE s.line_id = ?
       GROUP BY rr.ride_date
     ) sub`
  ),
  getTodayLineRidership: db.prepare(
    `SELECT COALESCE(SUM(rr.rides), 0) as total
     FROM ridership_records rr
     JOIN stations s ON rr.station_id = s.station_id
     WHERE s.line_id = ?
       AND rr.ride_date = (SELECT MAX(ride_date) FROM ridership_records)`
  ),
  getStationsWithRidership: db.prepare(
    `SELECT s.station_id, s.station_name, s.ada,
            COALESCE(MAX(CASE WHEN rr.ride_date = (SELECT MAX(ride_date) FROM ridership_records) THEN rr.rides END), 0) as rides_latest,
            COALESCE(AVG(rr.rides), 0) as rides_avg
     FROM stations s
     LEFT JOIN ridership_records rr ON s.station_id = rr.station_id
     WHERE s.line_id = ?
     GROUP BY s.station_id, s.station_name, s.ada
     ORDER BY rides_latest DESC`
  ),
  getRidership7dForStation: db.prepare(
    `SELECT ride_date as date, rides
     FROM ridership_records
     WHERE station_id = ?
     ORDER BY ride_date DESC LIMIT 7`
  ),
};
