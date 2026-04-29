// Shared row-level types for route handlers.
// These mirror the SQLite columns returned by the prepared statements in db.ts.

export interface FleetRow {
  series: number;
  car_count: number;
  upgrading_from: number | null;
  upgrading_to: number | null;
  upgrade_pct: number;
  builder: string;
  origin_country: string;
  year_introduced: number;
  year_retired: number | null;
  notes: string;
}

export interface StationRow {
  station_id: string;
  station_name: string;
  ada: number;
}

export interface RidershipRow {
  date: string;
  rides: number;
}
