import type { TimePeriod } from '@/types';

export function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function lastFullWeekLabel(): string {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 6=Sat
  const daysBackToSat = dow === 6 ? 7 : dow + 1;
  const lastSat = new Date(today);
  lastSat.setDate(today.getDate() - daysBackToSat);
  const lastSun = new Date(lastSat);
  lastSun.setDate(lastSat.getDate() - 6);
  return `${fmtShort(lastSun)} – ${fmtShort(lastSat)}`;
}

export function periodRangeLabel(period: TimePeriod): string {
  const today = new Date();
  const daysBack = (n: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    return d;
  };
  switch (period) {
    case '6h':  return 'Last 6 hours';
    case '24h': return `${fmtShort(daysBack(1))} – ${fmtShort(today)}`;
    case '30d': return `${fmtShort(daysBack(30))} – ${fmtShort(today)}`;
    case '7d':  return lastFullWeekLabel();
  }
}
