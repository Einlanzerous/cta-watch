import { Hono } from 'hono';
import { createQ } from '../db';
import { LINE_MAP, type LineId } from '../../../server/src/data/lines';
import type { Env } from '../env';

export const stationsRouter = new Hono<{ Bindings: Env }>();

stationsRouter.get('/:line', async (c) => {
  const lineId = c.req.param('line') as LineId;
  if (!LINE_MAP.has(lineId)) return c.json({ error: 'Line not found' }, 404);

  const q = createQ(c.env.DB);
  const stations = (await q.getStationsWithRidership(lineId).all<{
    station_id: string; station_name: string; ada: number; rides_latest: number; rides_avg: number;
  }>()).results;

  const weekly = stations.length > 0
    ? await c.env.DB.batch(stations.map(s => q.getRidership7dForStation(s.station_id)))
    : [];

  const result = stations.map((s, i) => ({
    stationId: s.station_id,
    stationName: s.station_name,
    ada: s.ada === 1,
    ridesToday: s.rides_latest,
    ridesWeeklyAvg: Math.round(s.rides_avg),
    ridership7d: weekly[i].results as Array<{ date: string; rides: number }>,
  }));

  return c.json({ lineId, stations: result, updatedAt: new Date().toISOString() });
});
