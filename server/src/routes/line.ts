import { Router } from 'express';
import { q } from '../db';
import { LINE_MAP, type LineId } from '../data/lines';
import { getRidershipStats } from '../services/ridershipStats';
import type { FleetRow, RidershipRow } from '../types';

export const lineRouter = Router();

lineRouter.get('/:id', (req, res) => {
  const lineId = req.params.id as LineId;
  const lineConfig = LINE_MAP.get(lineId);
  if (!lineConfig) return res.status(404).json({ error: 'Line not found' });

  const latest  = q.getLatestOnTime.get(lineId)     as { on_time_pct: number } | undefined;
  const trend30 = q.getHourlyTrend.all(lineId, '-30') as Array<{ bucket: string; onTimePct: number }>;
  const trend24 = q.getOnTimeLast24h.all(lineId)    as Array<{ bucket: string; avg_pct: number }>;
  const trend7d = q.getLastFullWeekTrend.all(lineId) as Array<{ bucket: string; avg_pct: number }>;
  const fleet   = q.getFleet.all(lineId)            as FleetRow[];
  const ridership = q.getTodayLineRidership.get(lineId) as { total: number } | undefined;
  const rs = getRidershipStats(lineId);

  const avg6h  = q.getAvgOnTimePeriod.get(lineId, '-6')  as { avg_pct: number | null } | undefined;
  const avg24h = q.getAvgOnTimePeriod.get(lineId, '-24') as { avg_pct: number | null } | undefined;
  const avg7d  = q.getAvgLastFullWeek.get(lineId)        as { avg_pct: number | null } | undefined;
  const avg30d = q.getAvgOnTimePeriod.get(lineId, '-720') as { avg_pct: number | null } | undefined;

  const fallback = latest ? Math.round(latest.on_time_pct * 10) / 10 : 90.0;
  const round = (v: number | null | undefined) =>
    v != null ? Math.round(v * 10) / 10 : fallback;
  const stations = q.getStationsWithRidership.all(lineId) as Array<{
    station_id: string; station_name: string; ada: number; rides_latest: number; rides_avg: number;
  }>;

  const maxCars = fleet.reduce((m, f) => Math.max(m, f.car_count), 1);

  const stationsWithRidership = stations.map(s => {
    const weekly = q.getRidership7dForStation.all(s.station_id) as RidershipRow[];
    return {
      stationId: s.station_id,
      stationName: s.station_name,
      ada: s.ada === 1,
      ridesToday: s.rides_latest,
      ridesWeeklyAvg: Math.round(s.rides_avg),
      ridership7d: weekly.map(r => ({ date: r.date, rides: r.rides })),
    };
  });

  res.json({
    id: lineConfig.id,
    name: lineConfig.name,
    color: lineConfig.color,
    textColor: lineConfig.textColor,
    description: lineConfig.description,
    onTimePct:    fallback,
    onTimePct6h:  round(avg6h?.avg_pct),
    onTimePct24h: round(avg24h?.avg_pct),
    onTimePct7d:  round(avg7d?.avg_pct),
    onTimePct30d: round(avg30d?.avg_pct),
    onTimeTrend24h: trend24.map(r => ({ bucket: r.bucket, onTimePct: Math.round(r.avg_pct * 10) / 10 })),
    onTimeTrend7d:  trend7d.map(r =>  ({ bucket: r.bucket, onTimePct: Math.round(r.avg_pct * 10) / 10 })),
    onTimeTrend30d: trend30,
    totalRidesToday: ridership?.total ?? 0,
    ridershipMonthly:    rs.ridershipMonthly,
    ridershipYoY:        rs.ridershipYoY,
    ridershipWeekdayAvg: rs.ridershipWeekdayAvg,
    ridershipWeekendAvg: rs.ridershipWeekendAvg,
    fleet: fleet.map(f => ({
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
