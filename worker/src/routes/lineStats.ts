// Shared per-line stats assembly for /api/lines and /api/line/:id.
//
// Each D1 call is a network round-trip (and a subrequest against the Worker's
// per-invocation cap), so instead of ~12 awaits per line we emit the statements
// for a db.batch() and reassemble from the positional results.

import type { Q } from '../db';
import type { LineId } from '../../../server/src/data/lines';
import type { FleetRow } from '../../../server/src/types';
import { computeRidershipStats, type MonthlyPoint, type DayTypeAvg, type RidershipStats } from '../services/ridershipStats';

// Statement order — lineCoreStatements() and assembleLineCore() must agree.
export const CORE_STMT_COUNT = 12;

export function lineCoreStatements(q: Q, lineId: LineId): D1PreparedStatement[] {
  return [
    q.getLatestOnTime(lineId),            //  0
    q.getOnTimeLast24h(lineId),           //  1
    q.getLastFullWeekTrend(lineId),       //  2
    q.getHourlyTrend(lineId, '-30'),      //  3
    q.getFleet(lineId),                   //  4
    q.getTodayLineRidership(lineId),      //  5
    q.getRidershipMonthly(lineId),        //  6
    q.getRidershipDayTypeAvg(lineId),     //  7
    q.getAvgOnTimePeriod(lineId, '-6'),   //  8
    q.getAvgOnTimePeriod(lineId, '-24'),  //  9
    q.getAvgLastFullWeek(lineId),         // 10
    q.getAvgOnTimePeriod(lineId, '-720'), // 11
  ];
}

export interface LineCore extends RidershipStats {
  onTimePct: number;
  onTimePct6h: number;
  onTimePct24h: number;
  onTimePct7d: number;
  onTimePct30d: number;
  lastRecorded: string | null;
  onTimeTrend24h: Array<{ bucket: string; onTimePct: number }>;
  onTimeTrend7d: Array<{ bucket: string; onTimePct: number }>;
  onTimeTrend30d: Array<{ bucket: string; onTimePct: number }>;
  totalRidesToday: number;
  fleetRows: FleetRow[];
  maxCars: number;
}

export function assembleLineCore(results: D1Result[], offset: number): LineCore {
  const first = <T>(i: number) => (results[offset + i].results as T[])[0] as T | undefined;
  const all   = <T>(i: number) => results[offset + i].results as T[];

  const latest  = first<{ on_time_pct: number; recorded_at: string }>(0);
  const trend24 = all<{ bucket: string; avg_pct: number }>(1);
  const trend7d = all<{ bucket: string; avg_pct: number }>(2);
  const trend30 = all<{ bucket: string; onTimePct: number }>(3);
  const fleet   = all<FleetRow>(4);
  const ridership = first<{ total: number }>(5);
  const rs = computeRidershipStats(all<MonthlyPoint>(6), first<DayTypeAvg>(7) ?? null);

  const avg6h  = first<{ avg_pct: number | null }>(8);
  const avg24h = first<{ avg_pct: number | null }>(9);
  const avg7d  = first<{ avg_pct: number | null }>(10);
  const avg30d = first<{ avg_pct: number | null }>(11);

  const fallback = latest ? Math.round(latest.on_time_pct * 10) / 10 : 90.0;
  const round = (v: number | null | undefined) =>
    v != null ? Math.round(v * 10) / 10 : fallback;

  const maxCars = fleet.reduce((m, f) => Math.max(m, f.car_count), 1);

  return {
    onTimePct:    fallback,
    onTimePct6h:  round(avg6h?.avg_pct),
    onTimePct24h: round(avg24h?.avg_pct),
    onTimePct7d:  round(avg7d?.avg_pct),
    onTimePct30d: round(avg30d?.avg_pct),
    lastRecorded: latest?.recorded_at ?? null,
    onTimeTrend24h: trend24.map(r => ({ bucket: r.bucket, onTimePct: Math.round(r.avg_pct * 10) / 10 })),
    onTimeTrend7d:  trend7d.map(r =>  ({ bucket: r.bucket, onTimePct: Math.round(r.avg_pct * 10) / 10 })),
    onTimeTrend30d: trend30,
    totalRidesToday: ridership?.total ?? 0,
    ...rs,
    fleetRows: fleet,
    maxCars,
  };
}
