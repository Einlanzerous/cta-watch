# CTA Watch — Server

Express + TypeScript backend. Owns all data collection, persistence, and API endpoints. The client treats this as a black box.

## Configuration

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `CTA_API_KEY` | _(empty)_ | CTA Train Tracker API key. When absent, server runs in Mock Mode. |
| `MOCK_MODE` | `false` | Force mock data even if `CTA_API_KEY` is set. Useful for local dev without consuming API quota. |
| `PORT` | `3001` | HTTP port. The Vite dev server proxies `/api` here. |
| `NODE_ENV` | `development` | Set to `production` to serve the built Vue app as static files. |

## Development

```bash
npm run dev      # tsx watch — restarts on file changes
npm run build    # tsc → dist/
npm start        # node dist/index.js
```

## API Endpoints

All routes are prefixed with `/api`.

### `GET /api/lines`

Returns a summary of all 8 CTA lines. Called by the dashboard every 30 seconds.

```jsonc
{
  "lines": [
    {
      "id": "red",
      "name": "Red Line",
      "color": "#C60C30",
      "description": "Howard — 95th/Dan Ryan",
      "onTimePct": 87.2,
      "lastRecorded": "2025-04-03T18:00:00.000Z",
      "onTimeTrend24h": [{ "bucket": "2025-04-03T12:00:00Z", "onTimePct": 89.1 }, ...],
      "totalRidesToday": 94830,
      "fleet": {
        "total": 162,
        "isUpgrading": true,
        "upgradePct": 17,
        "series": [
          { "series": 5000, "carCount": 134, "barPct": 100, "builder": "Bombardier Transportation", ... },
          { "series": 7000, "carCount": 28,  "barPct": 21,  "isUpgrading": true, "upgradePct": 17, ... }
        ]
      }
    }
  ],
  "updatedAt": "2025-04-03T18:05:00.000Z",
  "mockMode": false
}
```

### `GET /api/line/:id`

Full detail for a single line. Called lazily when a line card is clicked.

`id` is one of: `red`, `blue`, `brown`, `green`, `orange`, `pink`, `purple`, `yellow`

Returns the line summary plus:
- `onTimeTrend30d` — 30 days of hourly on-time averages for the trend chart
- `fleet` — per-series car counts with full `seriesInfo` (builder, country, year, notes)
- `stations` — all stations on this line with `ridesToday`, `ridesWeeklyAvg`, and `ridership7d` array

### `GET /api/fleet/:line`

Returns only fleet records for one line. Useful for polling fleet data independently.

### `PATCH /api/fleet/:line`

Update car counts for one or more series on a line. Body is an array of `FleetUpdateBody`:

```jsonc
[
  { "series": 7000, "carCount": 56, "upgradingFrom": 5000, "upgradingTo": null, "upgradePct": 34.1 }
]
```

### `POST /api/fleet/reseed`

Re-seeds all fleet records from `src/data/fleet.ts`. Use after editing the static data file.

### `GET /api/stations/:line`

Returns the station list with ridership for a single line.

## Database

SQLite file at `./data/cta-watch.db` (created automatically on first boot; git-ignored).

| Table | Contents | Retention |
|-------|----------|-----------|
| `on_time_records` | Raw 5-minute on-time polls per line | 1 year (nightly prune) |
| `on_time_hourly` | Hourly aggregates, used for trend charts | Indefinite |
| `fleet_records` | Car counts + upgrade status per line+series | Indefinite |
| `series_info` | Static metadata per car series (builder, year, notes) | Indefinite |
| `stations` | Station names + line assignments from Chicago portal | Indefinite |
| `ridership_records` | Daily entry counts per station | Indefinite |

## Scheduled Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Train poll | Every 5 minutes | Fetch all train positions, compute on-time % per line, write to `on_time_records` and update `on_time_hourly`. Skips when Chicago service is suspended (between 01:00–05:00 CT). |
| Record prune | Daily 03:00 | Delete `on_time_records` rows older than 365 days. |
| Ridership sync | Mondays 06:00 | Re-fetch 30 days of ridership from Chicago Open Data Portal into `ridership_records`. |

## On-Time Calculation

The CTA Train Tracker API returns all active train positions with an `isDly` flag (`"1"` = delayed ≥ 5 minutes). On-time percentage is computed as:

```
on_time_pct = (total_trains - delayed_trains) / total_trains × 100
```

In **Mock Mode** the same formula is applied to synthetically generated counts. Mock data uses per-line baselines (Yellow ~94%, Red/Blue ~85–87%) with realistic rush-hour degradation (−5 to −10 points on weekday peaks) and weekend improvement (+3 to +5 points).

## Seed Behavior

On first boot, if tables are empty:

1. **Fleet** — inserts all entries from `src/data/fleet.ts` and populates `series_info`
2. **Stations** — fetches from Chicago Open Data Portal; falls back to a ~80-station hardcoded list if the network is unreachable
3. **On-time history** — generates 30 days of hourly mock records (one per line per hour during operating hours) so trend charts display immediately
4. **Ridership** — fetches last 60 days from Chicago Open Data Portal; falls back to per-station mock averages based on known line-level ridership estimates

## Project Structure

```
src/
├── index.ts              Entry point — boot sequence, Express setup
├── config.ts             Typed environment config
├── db.ts                 SQLite connection, schema migrations, prepared statements
├── seed.ts               First-run data population
├── jobs.ts               All node-cron scheduled jobs
├── data/
│   ├── lines.ts          CTA line metadata and API code mappings
│   └── fleet.ts          Static fleet seed data and series metadata
├── services/
│   ├── ctaApi.ts         CTA Train Tracker API client
│   ├── chicagoData.ts    Chicago Open Data Portal client (stations + ridership)
│   └── mock.ts           Mock data generator for dev / no-key usage
└── routes/
    ├── index.ts          Router mounting
    ├── lines.ts          GET /api/lines
    ├── line.ts           GET /api/line/:id
    ├── fleet.ts          GET /api/fleet/:line, PATCH /api/fleet/:line, POST /api/fleet/reseed
    └── stations.ts       GET /api/stations/:line
```
