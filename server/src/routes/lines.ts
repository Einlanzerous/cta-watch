import { Router } from 'express';
import { q } from '../db';
import { LINES } from '../data/lines';
import { config } from '../config';
import { getRidershipStats } from '../services/ridershipStats';
import type { FleetRow } from '../types';

export const linesRouter = Router();

linesRouter.get('/', (_req, res) => {
  const latestRidershipDate = (
    q.getLatestRidershipDate.get() as { max_date: string | null } | undefined
  )?.max_date ?? null;

  const lines = LINES.map(line => {
    const latest  = q.getLatestOnTime.get(line.id) as { on_time_pct: number; recorded_at: string } | undefined;
    const trend24 = q.getOnTimeLast24h.all(line.id)        as Array<{ bucket: string; avg_pct: number }>;
    const trend7d = q.getLastFullWeekTrend.all(line.id)   as Array<{ bucket: string; avg_pct: number }>;
    const fleet   = q.getFleet.all(line.id) as FleetRow[];
    const ridership = q.getTodayLineRidership.get(line.id) as { total: number } | undefined;
    const rs = getRidershipStats(line.id);

    const avg6h  = q.getAvgOnTimePeriod.get(line.id, '-6')   as { avg_pct: number | null } | undefined;
    const avg24h = q.getAvgOnTimePeriod.get(line.id, '-24')  as { avg_pct: number | null } | undefined;
    const avg7d  = q.getAvgLastFullWeek.get(line.id)          as { avg_pct: number | null } | undefined;
    const avg30d = q.getAvgOnTimePeriod.get(line.id, '-720') as { avg_pct: number | null } | undefined;

    const fallback = latest ? Math.round(latest.on_time_pct * 10) / 10 : 90.0;
    const round = (v: number | null | undefined) =>
      v != null ? Math.round(v * 10) / 10 : fallback;

    const maxCars = fleet.reduce((m, f) => Math.max(m, f.car_count), 1);

    return {
      id: line.id,
      name: line.name,
      color: line.color,
      textColor: line.textColor,
      description: line.description,
      onTimePct:    fallback,
      onTimePct6h:  round(avg6h?.avg_pct),
      onTimePct24h: round(avg24h?.avg_pct),
      onTimePct7d:  round(avg7d?.avg_pct),
      onTimePct30d: round(avg30d?.avg_pct),
      lastRecorded: latest?.recorded_at ?? null,
      onTimeTrend24h: trend24.map(r => ({ bucket: r.bucket, onTimePct: Math.round(r.avg_pct * 10) / 10 })),
      onTimeTrend7d:  trend7d.map(r =>  ({ bucket: r.bucket, onTimePct: Math.round(r.avg_pct * 10) / 10 })),
      onTimeTrend30d: (q.getHourlyTrend.all(line.id, '-30') as Array<{ bucket: string; onTimePct: number }>),
      totalRidesToday: ridership?.total ?? 0,
      ridershipMonthly:    rs.ridershipMonthly,
      ridershipYoY:        rs.ridershipYoY,
      ridershipWeekdayAvg: rs.ridershipWeekdayAvg,
      ridershipWeekendAvg: rs.ridershipWeekendAvg,
      fleet: {
        total: fleet.reduce((s, f) => s + f.car_count, 0),
        isUpgrading: fleet.some(f => f.upgrading_to !== null),
        upgradePct: fleet.find(f => f.upgrading_to !== null)?.upgrade_pct ?? 0,
        series: fleet.map(f => ({
          series: f.series,
          carCount: f.car_count,
          isUpgrading: f.upgrading_to !== null || f.upgrading_from !== null,
          upgradePct: f.upgrade_pct,
          builder: f.builder,
          originCountry: f.origin_country,
          yearIntroduced: f.year_introduced,
          barPct: Math.round((f.car_count / maxCars) * 100),
        })),
      },
    };
  });

  res.json({ lines, updatedAt: new Date().toISOString(), mockMode: config.mockMode, ridershipDate: latestRidershipDate });
});
