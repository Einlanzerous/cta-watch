import { q } from '../db';
import type { LineId } from '../data/lines';

export interface MonthlyPoint {
  month: string;   // "2026-02"
  total: number;
  days: number;
}

export interface RidershipStats {
  ridershipMonthly: MonthlyPoint[];
  ridershipYoY: number | null;
  ridershipWeekdayAvg: number;
  ridershipWeekendAvg: number;
}

export function getRidershipStats(lineId: LineId): RidershipStats {
  const raw = q.getRidershipMonthly.all(lineId) as MonthlyPoint[];

  // Drop partial months at both edges of the window (< 20 days of data in any month
  // that should have 28–31 days means we caught it mid-month). Newest-first from the query.
  let monthly = raw;
  if (monthly.length > 0 && monthly[monthly.length - 1].days < 20) {
    monthly = monthly.slice(0, -1); // drop oldest partial month
  }
  // Cap at 13 full months so the chart always shows a clean year-over-year span
  monthly = monthly.slice(0, 13);

  // YoY: compare daily averages for the same calendar month, one year apart.
  // Using daily averages avoids the partial-month distortion at data edges.
  let ridershipYoY: number | null = null;
  if (monthly.length > 0) {
    const latest = monthly[0];
    const [yr, mo] = latest.month.split('-');
    const prevYearMonth = `${parseInt(yr) - 1}-${mo}`;
    const prevYear = monthly.find(m => m.month === prevYearMonth);
    if (prevYear && prevYear.days > 0 && latest.days > 0) {
      const latestAvg  = latest.total  / latest.days;
      const prevAvg    = prevYear.total / prevYear.days;
      if (prevAvg > 0) {
        ridershipYoY = Math.round(((latestAvg - prevAvg) / prevAvg) * 1000) / 10;
      }
    }
  }

  const dayType = q.getRidershipDayTypeAvg.get(lineId) as
    { weekday_avg: number | null; weekend_avg: number | null } | undefined;

  return {
    ridershipMonthly: [...monthly].reverse(), // oldest → newest for charting
    ridershipYoY,
    ridershipWeekdayAvg: dayType?.weekday_avg ?? 0,
    ridershipWeekendAvg: dayType?.weekend_avg ?? 0,
  };
}
