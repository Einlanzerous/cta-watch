import { Hono } from 'hono';
import { LINE_MAP, type LineId } from '../../../server/src/data/lines';
import { readSnapshot, servedAt, stationsKey, jsonBody } from '../snapshots';
import type { Env } from '../env';

export const stationsRouter = new Hono<{ Bindings: Env }>();

stationsRouter.get('/:line', async (c) => {
  const lineId = c.req.param('line') as LineId;
  if (!LINE_MAP.has(lineId)) return c.json({ error: 'Line not found' }, 404);

  const { body, builtAt } = await readSnapshot(c.env, stationsKey(lineId));
  return jsonBody(body, `"lineId":"${lineId}"`, `"updatedAt":"${servedAt(builtAt)}"`);
});
