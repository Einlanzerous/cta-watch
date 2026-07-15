import { Hono } from 'hono';
import { createQ } from '../db';
import { LINE_MAP, type LineId } from '../../../server/src/data/lines';
import type { Env } from '../env';
import { lineCoreStatements, assembleLineCore } from './lineStats';

export const lineRouter = new Hono<{ Bindings: Env }>();

lineRouter.get('/:id', async (c) => {
  const lineId = c.req.param('id') as LineId;
  const lineConfig = LINE_MAP.get(lineId);
  if (!lineConfig) return c.json({ error: 'Line not found' }, 404);

  const db = c.env.DB;
  const q = createQ(db);

  const results = await db.batch([
    ...lineCoreStatements(q, lineId),
    q.getStationsWithRidership(lineId),
  ]);
  const core = assembleLineCore(results, 0);
  const stations = results[results.length - 1].results as Array<{
    station_id: string; station_name: string; ada: number; rides_latest: number; rides_avg: number;
  }>;

  // Second batch: 7-day sparkline per station.
  const weekly = stations.length > 0
    ? await db.batch(stations.map(s => q.getRidership7dForStation(s.station_id)))
    : [];

  const stationsWithRidership = stations.map((s, i) => ({
    stationId: s.station_id,
    stationName: s.station_name,
    ada: s.ada === 1,
    ridesToday: s.rides_latest,
    ridesWeeklyAvg: Math.round(s.rides_avg),
    ridership7d: weekly[i].results as Array<{ date: string; rides: number }>,
  }));

  const { fleetRows, maxCars, lastRecorded: _lastRecorded, ...stats } = core;

  return c.json({
    id: lineConfig.id,
    name: lineConfig.name,
    color: lineConfig.color,
    textColor: lineConfig.textColor,
    description: lineConfig.description,
    ...stats,
    fleet: fleetRows.map(f => ({
      series: f.series,
      carCount: f.car_count,
      upgradingFrom: f.upgrading_from,
      upgradingTo: f.upgrading_to,
      upgradePct: f.upgrade_pct,
      barPct: Math.round((f.car_count / maxCars) * 100),
      seriesInfo: {
        builder: f.builder,
        originCountry: f.origin_country,
        yearIntroduced: f.year_introduced,
        yearRetired: f.year_retired,
        notes: f.notes,
      },
    })),
    stations: stationsWithRidership,
  });
});
