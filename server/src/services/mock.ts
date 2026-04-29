import { LINES, type LineId } from '../data/lines';

interface PollRecord {
  lineId: LineId;
  totalTrains: number;
  delayedTrains: number;
  onTimePct: number;
  recordedAt: string;
}

// Typical on-time baseline per line (weekday, off-peak)
const BASE_RATES: Record<LineId, number> = {
  red: 87, blue: 85, brown: 91, green: 88,
  orange: 89, pink: 90, purple: 90, yellow: 94,
};

// Typical peak ridership (trains in service) per line
const TYPICAL_TRAINS: Record<LineId, number> = {
  red: 28, blue: 24, brown: 16, green: 14,
  orange: 12, pink: 10, purple: 10, yellow: 3,
};

function computePct(lineId: LineId, hour: number, isWeekend: boolean): number {
  let base = BASE_RATES[lineId];
  const isRush = !isWeekend && ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18));
  if (isRush) base -= 5 + Math.random() * 5;
  if (isWeekend) base += 2 + Math.random() * 4;
  base += (Math.random() - 0.5) * 8;
  return Math.max(58, Math.min(100, base));
}

export function generateMockPoll(): PollRecord[] {
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const ts = now.toISOString();

  return LINES.map(line => {
    const pct = computePct(line.id, hour, isWeekend);
    const total = TYPICAL_TRAINS[line.id] + Math.floor((Math.random() - 0.5) * 4);
    const delayed = Math.round(total * (1 - pct / 100));
    const onTimePct = Math.round(((total - delayed) / total) * 1000) / 10;
    return { lineId: line.id, totalTrains: total, delayedTrains: delayed, onTimePct, recordedAt: ts };
  });
}

/** Generate hourly records going back `days` days for initial DB seed. */
export function generateHistoricalData(days: number): PollRecord[] {
  const records: PollRecord[] = [];
  const now = Date.now();

  for (let d = days; d >= 0; d--) {
    for (let h = 5; h <= 23; h++) {
      const dt = new Date(now - d * 86_400_000);
      dt.setHours(h, 0, 0, 0);
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;

      for (const line of LINES) {
        const pct = computePct(line.id, h, isWeekend);
        const total = TYPICAL_TRAINS[line.id];
        const delayed = Math.round(total * (1 - pct / 100));
        const onTimePct = Math.round(((total - delayed) / total) * 1000) / 10;
        records.push({
          lineId: line.id,
          totalTrains: total,
          delayedTrains: delayed,
          onTimePct,
          recordedAt: dt.toISOString(),
        });
      }
    }
  }

  return records;
}

/** Generate plausible daily ridership numbers per line for seed purposes. */
export const MOCK_RIDERSHIP: Record<LineId, number> = {
  red: 95_000, blue: 80_000, brown: 42_000, green: 30_000,
  orange: 22_000, pink: 16_000, purple: 14_000, yellow: 2_800,
};
