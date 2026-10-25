import { Hono } from 'hono';
import { readSnapshot, jsonBody } from '../snapshots';
import type { Env } from '../env';

export const linesRouter = new Hono<{ Bindings: Env }>();

// Precomputed by the poll cron (src/snapshots.ts). updatedAt stays the serve
// time: the header flags the response as stale after 90s, and the data is
// never older than one 5-minute poll.
linesRouter.get('/', async (c) =>
  jsonBody(await readSnapshot(c.env, 'lines'), `"updatedAt":"${new Date().toISOString()}"`));
