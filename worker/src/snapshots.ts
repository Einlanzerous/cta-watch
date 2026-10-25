// Precomputed API responses (SERV-251).
//
// D1 bills rows read, and the free tier allows 5M a day. Computing every
// line's stats per request scanned tens of thousands of rows per page view, and
// *.workers.dev has no edge cache to absorb that, so a few hundred visits used
// the whole day's allowance. Instead the cron jobs build each response once and
// the routes read a single row.
//
// Each part is rebuilt on the cadence its data actually changes:
//   part:ridership    — weekly sync (the portal runs weeks behind anyway)
//   part:fleet        — admin edits (they drop it; the next poll rebuilds)
//   part:ontime-long  — hourly: last full week and 30-day windows
//   latest/6h/24h     — every poll, never stored on its own
// and the route payloads (`lines`, `line:<id>`, `stations:<id>`) are rewritten every poll.
// A missing part is built on first use, so a fresh database still serves.
//
// Free-plan Workers get 10ms of CPU per invocation, cron included, and JSON is
// the cost here: the 30-day trends alone are ~280KB of floats. So the heavy
// members are serialized once, when their part is built, and spliced into the
// payloads as strings (`members`/`withMembers`); requests return the stored
// body without parsing it.

import { createQ, type Q } from './db';
import { LINES, type LineId } from '../../server/src/data/lines';
import type { FleetRow } from '../../server/src/types';
import { computeRidershipStats, type MonthlyPoint, type DayTypeAvg, type RidershipStats } from './services/ridershipStats';
import { isMockMode, type Env } from './env';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type PerLine<T> = Record<LineId, T>;
type Point = { bucket: string; onTimePct: number };
type HourRow = { bucket: string; avg: number; n: number };

interface StationOut {
  stationId: string;
  stationName: string;
  ada: boolean;
  ridesToday: number;
  ridesWeeklyAvg: number;
  ridership7d: Array<{ date: string; rides: number }>;
}

interface RidershipPart {
  ridershipDate: string | null;
  /** `stats`: RidershipStats + totalRidesToday as members; `stations`: StationOut[] as JSON. */
  lines: PerLine<{ stats: string; stations: string }>;
}

interface OnTimeLong {
  /** onTimeTrend7d and onTimeTrend30d as members. */
  trends: string;
  avg7d: number | null;
  avg30d: number | null;
}

interface OnTimeShort {
  latest: { on_time_pct: number; recorded_at: string } | null;
  onTimeTrend24h: Point[];
  avg6h: number | null;
  avg24h: number | null;
}

/** Hour bucket containing `t`, in the format the poll writes (`…T14:00:00Z`). */
const bucketOf = (t: number) => new Date(t).toISOString().slice(0, 13) + ':00:00Z';

const round1 = (v: number) => Math.round(v * 10) / 10;

/** An object's members as a JSON fragment: `{"a":1,"b":2}` → `"a":1,"b":2`. */
const members = (obj: object) => JSON.stringify(obj).slice(1, -1);

/** Serialize `obj` with pre-serialized member fragments appended. */
function withMembers(obj: object, ...extra: string[]): string {
  const all = [members(obj), ...extra].filter(Boolean);
  return `{${all.join(',')}}`;
}

/** Sample-weighted mean of hourly buckets — the mean of the raw polls they hold. */
function weightedAvg(rows: HourRow[]): number | null {
  let sum = 0, n = 0;
  for (const r of rows) { sum += r.avg * r.n; n += r.n; }
  return n > 0 ? sum / n : null;
}

/**
 * Last full Sun–Sat week (UTC) as [start, end) hour buckets — the same week
 * the old `date('now', 'weekday 6', '-13 days')` predicate selected.
 */
export function lastFullWeek(now: Date): { start: string; end: string } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const saturday = today + ((6 - now.getUTCDay() + 7) % 7) * DAY; // 'weekday 6': today if Saturday
  return { start: bucketOf(saturday - 13 * DAY), end: bucketOf(saturday - 6 * DAY) };
}

const byLine = <T>(build: (lineId: LineId, i: number) => T): PerLine<T> =>
  Object.fromEntries(LINES.map((l, i) => [l.id, build(l.id, i)])) as PerLine<T>;

// ── Part builders ──────────────────────────────────────────────────────────────

async function buildRidership(db: D1Database, q: Q): Promise<RidershipPart> {
  const PER_LINE = 4;
  const results = await db.batch([
    ...LINES.flatMap(l => [
      q.getTodayLineRidership(l.id),
      q.getRidershipMonthly(l.id),
      q.getRidershipDayTypeAvg(l.id),
      q.getStationsWithRidership(l.id),
    ]),
    q.getLatestRidershipDate(),
  ]);

  type StationRow = { station_id: string; station_name: string; ada: number; rides_latest: number; rides_avg: number };
  const stationsByLine = byLine(
    (_, i) => results[i * PER_LINE + 3].results as StationRow[],
  );

  // Transfer stations appear on several lines; fetch each sparkline once.
  const stationIds = [...new Set(Object.values(stationsByLine).flat().map(s => s.station_id))];
  const sparklines = new Map<string, Array<{ date: string; rides: number }>>();
  const CHUNK = 100;
  for (let i = 0; i < stationIds.length; i += CHUNK) {
    const ids = stationIds.slice(i, i + CHUNK);
    const weekly = await db.batch(ids.map(id => q.getRidership7dForStation(id)));
    ids.forEach((id, j) => sparklines.set(id, weekly[j].results as Array<{ date: string; rides: number }>));
  }

  return {
    ridershipDate:
      (results[LINES.length * PER_LINE].results as Array<{ max_date: string | null }>)[0]?.max_date ?? null,
    lines: byLine((lineId, i) => {
      const at = (k: number) => results[i * PER_LINE + k].results;
      const stats: RidershipStats & { totalRidesToday: number } = {
        totalRidesToday: (at(0) as Array<{ total: number }>)[0]?.total ?? 0,
        ...computeRidershipStats(at(1) as MonthlyPoint[], (at(2) as DayTypeAvg[])[0] ?? null),
      };
      const stations: StationOut[] = stationsByLine[lineId].map(s => ({
        stationId: s.station_id,
        stationName: s.station_name,
        ada: s.ada === 1,
        ridesToday: s.rides_latest,
        ridesWeeklyAvg: Math.round(s.rides_avg),
        ridership7d: sparklines.get(s.station_id) ?? [],
      }));
      return { stats: members(stats), stations: JSON.stringify(stations) };
    }),
  };
}

async function buildFleet(db: D1Database, q: Q): Promise<PerLine<FleetRow[]>> {
  const results = await db.batch(LINES.map(l => q.getFleet(l.id)));
  return byLine((_, i) => results[i].results as FleetRow[]);
}

async function buildOnTimeLong(db: D1Database, q: Q, now: Date): Promise<PerLine<OnTimeLong>> {
  const results = await db.batch(LINES.map(l => q.getHourlySince(l.id, bucketOf(now.getTime() - 30 * DAY))));
  const week = lastFullWeek(now);
  return byLine((_, i) => {
    const month = results[i].results as HourRow[];
    const lastWeek = month.filter(r => r.bucket >= week.start && r.bucket < week.end);
    return {
      trends: members({
        onTimeTrend7d: lastWeek.map(r => ({ bucket: r.bucket, onTimePct: round1(r.avg) })),
        onTimeTrend30d: month.map(r => ({ bucket: r.bucket, onTimePct: r.avg })),
      }),
      avg7d: weightedAvg(lastWeek),
      avg30d: weightedAvg(month),
    };
  });
}

async function buildOnTimeShort(db: D1Database, q: Q, now: Date): Promise<PerLine<OnTimeShort>> {
  const t = now.getTime();
  const results = await db.batch(LINES.flatMap(l => [
    q.getLatestOnTime(l.id),
    q.getHourlySince(l.id, bucketOf(t - 24 * HOUR)),
  ]));
  const since6h = bucketOf(t - 6 * HOUR);
  return byLine((_, i) => {
    const day = results[i * 2 + 1].results as HourRow[];
    return {
      latest: (results[i * 2].results as OnTimeShort['latest'][])[0] ?? null,
      onTimeTrend24h: day.map(r => ({ bucket: r.bucket, onTimePct: round1(r.avg) })),
      avg6h: weightedAvg(day.filter(r => r.bucket >= since6h)),
      avg24h: weightedAvg(day),
    };
  });
}

// ── Payload assembly ───────────────────────────────────────────────────────────

/** Per-line stats as members; the trends and ridership arrive pre-serialized. */
function lineStats(lineId: LineId, short: OnTimeShort, long: OnTimeLong, ridership: RidershipPart, head: object): string {
  // A window with no samples reports the latest reading, as the per-request
  // queries did; 90 is the old no-data placeholder.
  const fallback = short.latest ? round1(short.latest.on_time_pct) : 90.0;
  const pct = (v: number | null) => (v != null ? round1(v) : fallback);
  return members({
    ...head,
    onTimePct: fallback,
    onTimePct6h: pct(short.avg6h),
    onTimePct24h: pct(short.avg24h),
    onTimePct7d: pct(long.avg7d),
    onTimePct30d: pct(long.avg30d),
    onTimeTrend24h: short.onTimeTrend24h,
  }) + ',' + long.trends + ',' + ridership.lines[lineId].stats;
}

const maxCarsOf = (fleet: FleetRow[]) => fleet.reduce((m, f) => Math.max(m, f.car_count), 1);

const lineHead = (line: (typeof LINES)[number]) => ({
  id: line.id,
  name: line.name,
  color: line.color,
  textColor: line.textColor,
  description: line.description,
});

function linesPayload(env: Env, short: PerLine<OnTimeShort>, long: PerLine<OnTimeLong>,
                      fleet: PerLine<FleetRow[]>, ridership: RidershipPart): string {
  const lines = LINES.map(line => {
    const rows = fleet[line.id];
    const maxCars = maxCarsOf(rows);
    return withMembers({
      lastRecorded: short[line.id].latest?.recorded_at ?? null,
      fleet: {
        total: rows.reduce((s, f) => s + f.car_count, 0),
        isUpgrading: rows.some(f => f.upgrading_to !== null),
        upgradePct: rows.find(f => f.upgrading_to !== null)?.upgrade_pct ?? 0,
        series: rows.map(f => ({
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
    }, lineStats(line.id, short[line.id], long[line.id], ridership, lineHead(line)));
  });
  return withMembers(
    { mockMode: isMockMode(env), ridershipDate: ridership.ridershipDate },
    `"lines":[${lines.join(',')}]`,
  );
}

function linePayload(lineId: LineId, short: OnTimeShort, long: OnTimeLong,
                     fleet: FleetRow[], ridership: RidershipPart): string {
  const line = LINES.find(l => l.id === lineId)!;
  const maxCars = maxCarsOf(fleet);
  return withMembers({
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
  }, lineStats(lineId, short, long, ridership, lineHead(line)), `"stations":${ridership.lines[lineId].stations}`);
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const lineKey = (lineId: LineId) => `line:${lineId}`;
export const stationsKey = (lineId: LineId) => `stations:${lineId}`;

export interface Rebuild {
  ridership?: boolean;
}

/**
 * Rebuild the route payloads, rebuilding any part that is missing, stale, or
 * named in `rebuild`. Returns the payloads it wrote, keyed like the store.
 */
export async function refreshSnapshots(env: Env, rebuild: Rebuild = {}): Promise<Map<string, string>> {
  const db = env.DB;
  const q = createQ(db);
  const now = new Date();
  const builtAt = now.toISOString();

  const keys = ['part:ridership', 'part:fleet', 'part:ontime-long'];
  const stored = await db.batch(keys.map(k => q.getSnapshot(k)));
  const existing = new Map(keys.map((k, i) => [k, (stored[i].results as Array<{ body: string; built_at: string }>)[0]]));

  const writes = new Map<string, string>();
  async function part<T>(key: string, force: boolean | undefined, build: () => Promise<T>): Promise<T> {
    const row = existing.get(key);
    if (row && !force) return JSON.parse(row.body) as T;
    const value = await build();
    writes.set(key, JSON.stringify(value));
    return value;
  }

  const ridership = await part('part:ridership', rebuild.ridership, () => buildRidership(db, q));
  const fleet = await part('part:fleet', false, () => buildFleet(db, q));
  const longBuiltAt = existing.get('part:ontime-long')?.built_at;
  const long = await part('part:ontime-long', longBuiltAt?.slice(0, 13) !== builtAt.slice(0, 13),
                          () => buildOnTimeLong(db, q, now));
  const short = await buildOnTimeShort(db, q, now);

  const payloads = new Map<string, string>([['lines', linesPayload(env, short, long, fleet, ridership)]]);
  for (const line of LINES) {
    payloads.set(lineKey(line.id), linePayload(line.id, short[line.id], long[line.id], fleet[line.id], ridership));
    payloads.set(stationsKey(line.id), `{"stations":${ridership.lines[line.id].stations}}`);
  }

  await db.batch([...writes, ...payloads].map(([k, v]) => q.putSnapshot(k, v, builtAt)));
  return payloads;
}

/** One payload as serialized JSON, with when it was built; on a fresh database, build everything first. */
export async function readSnapshot(env: Env, key: string): Promise<{ body: string; builtAt: string }> {
  const row = await createQ(env.DB).getSnapshot(key).first<{ body: string; built_at: string }>();
  if (row) return { body: row.body, builtAt: row.built_at };
  return { body: (await refreshSnapshots(env)).get(key)!, builtAt: new Date().toISOString() };
}

/**
 * The `updatedAt` to serve. The client flags a response as stale once it is
 * 90s old, which a 5-minute poll would always trip, so a snapshot from a
 * healthy poll is stamped with the serve time; one older than two polls means
 * the cron is failing, and then the real build time shows through.
 */
export function servedAt(builtAt: string): string {
  const now = Date.now();
  return now - Date.parse(builtAt) < 10 * 60_000 ? new Date(now).toISOString() : builtAt;
}

/** Drop a part so the next poll rebuilds it (and the payloads built from it). */
export const invalidatePart = (env: Env, part: 'part:fleet' | 'part:ridership' | 'part:ontime-long') =>
  env.DB.prepare('DELETE FROM api_snapshots WHERE key = ?').bind(part).run();

/** Return a serialized payload, appending pre-serialized members. */
export const jsonBody = (body: string, ...extra: string[]) =>
  new Response(extra.length ? `${body.slice(0, -1)},${extra.join(',')}}` : body,
               { headers: { 'Content-Type': 'application/json' } });
