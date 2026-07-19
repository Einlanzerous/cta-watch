import { Hono } from 'hono';
import type { Context } from 'hono';
import { createQ } from '../db';
import { LINE_MAP, type LineId } from '../../../server/src/data/lines';
import { FLEET_SEED, SERIES_DATA } from '../../../server/src/data/fleet';
import type { FleetRow } from '../../../server/src/types';
import type { Env } from '../env';

interface FleetUpdateBody {
  series: number;
  carCount: number;
  upgradingFrom?: number | null;
  upgradingTo?: number | null;
  upgradePct?: number;
}

export const fleetRouter = new Hono<{ Bindings: Env }>();

// The Express server was localhost-only; on a public Worker the mutation
// endpoints need a gate. ADMIN_TOKEN unset disables them entirely.
function checkAdmin(c: Context<{ Bindings: Env }>): Response | null {
  if (!c.env.ADMIN_TOKEN) return c.json({ error: 'Admin endpoints disabled' }, 403);
  if (c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

fleetRouter.get('/:line', async (c) => {
  const lineId = c.req.param('line') as LineId;
  if (!LINE_MAP.has(lineId)) return c.json({ error: 'Line not found' }, 404);

  const q = createQ(c.env.DB);
  const fleet = (await q.getFleet(lineId).all<FleetRow>()).results;

  return c.json({ lineId, fleet, updatedAt: new Date().toISOString() });
});

// Manual fleet update endpoint (for weekly maintenance)
fleetRouter.patch('/:line', async (c) => {
  const denied = checkAdmin(c);
  if (denied) return denied;

  const lineId = c.req.param('line') as LineId;
  if (!LINE_MAP.has(lineId)) return c.json({ error: 'Line not found' }, 404);

  const body = await c.req.json<FleetUpdateBody | FleetUpdateBody[]>();
  const updates: FleetUpdateBody[] = Array.isArray(body) ? body : [body];
  const now = new Date().toISOString();

  const q = createQ(c.env.DB);
  await c.env.DB.batch(updates.map(u =>
    q.upsertFleet(lineId, u.series, u.carCount, u.upgradingFrom ?? null, u.upgradingTo ?? null, u.upgradePct ?? 0, now)
  ));

  return c.json({ ok: true, updatedAt: now });
});

// Re-seed fleet from static data (useful after editing fleet.ts)
fleetRouter.post('/reseed', async (c) => {
  const denied = checkAdmin(c);
  if (denied) return denied;

  const now = new Date().toISOString();
  const q = createQ(c.env.DB);
  await c.env.DB.batch([
    ...Object.values(SERIES_DATA).map(info =>
      q.insertSeriesInfo(info.series, info.builder, info.originCountry, info.yearIntroduced, info.yearRetired ?? null, info.notes)
    ),
    ...FLEET_SEED.map(e =>
      q.upsertFleet(e.lineId, e.series, e.carCount, e.upgradingFrom ?? null, e.upgradingTo ?? null, e.upgradePct, now)
    ),
  ]);

  return c.json({ ok: true, seeded: FLEET_SEED.length });
});
