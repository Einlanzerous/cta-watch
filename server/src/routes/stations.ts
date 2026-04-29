import { Router } from 'express';
import { q } from '../db';
import { LINE_MAP, type LineId } from '../data/lines';

export const stationsRouter = Router();

stationsRouter.get('/:line', (req, res) => {
  const lineId = req.params.line as LineId;
  if (!LINE_MAP.has(lineId)) return res.status(404).json({ error: 'Line not found' });

  const stations = q.getStationsWithRidership.all(lineId) as Array<{
    station_id: string; station_name: string; ada: number; rides_latest: number; rides_avg: number;
  }>;

  const result = stations.map(s => {
    const weekly = q.getRidership7dForStation.all(s.station_id) as Array<{ date: string; rides: number }>;
    return {
      stationId: s.station_id,
      stationName: s.station_name,
      ada: s.ada === 1,
      ridesToday: s.rides_latest,
      ridesWeeklyAvg: Math.round(s.rides_avg),
      ridership7d: weekly,
    };
  });

  res.json({ lineId, stations: result, updatedAt: new Date().toISOString() });
});
