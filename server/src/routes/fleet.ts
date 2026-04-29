import { Router } from 'express';
import { db, q } from '../db';
import { LINE_MAP, type LineId } from '../data/lines';
import { FLEET_SEED, SERIES_DATA } from '../data/fleet';
import type { FleetRow } from '../types';

interface FleetUpdateBody {
  series: number;
  carCount: number;
  upgradingFrom?: number | null;
  upgradingTo?: number | null;
  upgradePct?: number;
}

export const fleetRouter = Router();

fleetRouter.get('/:line', (req, res) => {
  const lineId = req.params.line as LineId;
  if (!LINE_MAP.has(lineId)) return res.status(404).json({ error: 'Line not found' });

  const fleet = q.getFleet.all(lineId) as FleetRow[];

  res.json({ lineId, fleet, updatedAt: new Date().toISOString() });
});

// Manual fleet update endpoint (for weekly maintenance)
fleetRouter.patch('/:line', (req, res) => {
  const lineId = req.params.line as LineId;
  if (!LINE_MAP.has(lineId)) return res.status(404).json({ error: 'Line not found' });

  const updates: FleetUpdateBody[] = Array.isArray(req.body) ? req.body : [req.body];
  const now = new Date().toISOString();

  const apply = db.transaction(() => {
    for (const u of updates) {
      q.upsertFleet.run(
        lineId, u.series, u.carCount,
        u.upgradingFrom ?? null, u.upgradingTo ?? null, u.upgradePct ?? 0, now
      );
    }
  });
  apply();

  res.json({ ok: true, updatedAt: now });
});

// Re-seed fleet from static data (useful after editing fleet.ts)
fleetRouter.post('/reseed', (_req, res) => {
  const now = new Date().toISOString();
  const reseed = db.transaction(() => {
    for (const info of Object.values(SERIES_DATA)) {
      q.insertSeriesInfo.run(info.series, info.builder, info.originCountry, info.yearIntroduced, info.yearRetired ?? null, info.notes);
    }
    for (const e of FLEET_SEED) {
      q.upsertFleet.run(e.lineId, e.series, e.carCount, e.upgradingFrom ?? null, e.upgradingTo ?? null, e.upgradePct, now);
    }
  });
  reseed();
  res.json({ ok: true, seeded: FLEET_SEED.length });
});
