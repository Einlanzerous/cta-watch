-- Migration number: 0001 	 init
-- Schema ported verbatim from server/src/db.ts (better-sqlite3 → D1).

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
