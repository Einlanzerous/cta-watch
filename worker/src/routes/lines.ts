import { Hono } from 'hono';
import { createQ, SQL } from '../db';
import { LINES } from '../../../server/src/data/lines';
import { isMockMode, type Env } from '../env';
import { lineCoreStatements, assembleLineCore, CORE_STMT_COUNT } from './lineStats';

export const linesRouter = new Hono<{ Bindings: Env }>();

linesRouter.get('/', async (c) => {
  const db = c.env.DB;
  const q = createQ(db);

  // One batch: 12 statements per line + the latest-ridership-date lookup.
  const stmts = LINES.flatMap(line => lineCoreStatements(q, line.id));
  stmts.push(db.prepare(SQL.getLatestRidershipDate));
  const results = await db.batch(stmts);

  const latestRidershipDate =
    (results[LINES.length * CORE_STMT_COUNT].results as Array<{ max_date: string | null }>)[0]?.max_date ?? null;

  const lines = LINES.map((line, i) => {
    const core = assembleLineCore(results, i * CORE_STMT_COUNT);
    const { fleetRows, maxCars, lastRecorded, ...stats } = core;

    return {
      id: line.id,
      name: line.name,
      color: line.color,
      textColor: line.textColor,
      description: line.description,
      ...stats,
      lastRecorded,
      fleet: {
        total: fleetRows.reduce((s, f) => s + f.car_count, 0),
        isUpgrading: fleetRows.some(f => f.upgrading_to !== null),
        upgradePct: fleetRows.find(f => f.upgrading_to !== null)?.upgrade_pct ?? 0,
        series: fleetRows.map(f => ({
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

  return c.json({
    lines,
    updatedAt: new Date().toISOString(),
    mockMode: isMockMode(c.env),
    ridershipDate: latestRidershipDate,
  });
});
