import { Hono } from 'hono';
import { LINE_MAP, type LineId } from '../../../server/src/data/lines';
import { readSnapshot, lineKey, jsonBody } from '../snapshots';
import type { Env } from '../env';

export const lineRouter = new Hono<{ Bindings: Env }>();

lineRouter.get('/:id', async (c) => {
  const lineId = c.req.param('id') as LineId;
  if (!LINE_MAP.has(lineId)) return c.json({ error: 'Line not found' }, 404);

  return jsonBody((await readSnapshot(c.env, lineKey(lineId))).body);
});
