import { Hono } from 'hono';
import { readSnapshot, servedAt, jsonBody } from '../snapshots';
import type { Env } from '../env';

export const linesRouter = new Hono<{ Bindings: Env }>();

// Precomputed by the poll cron (src/snapshots.ts); see servedAt for updatedAt.
linesRouter.get('/', async (c) => {
  const { body, builtAt } = await readSnapshot(c.env, 'lines');
  return jsonBody(body, `"updatedAt":"${servedAt(builtAt)}"`);
});
