import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { cache } from 'hono/cache';
import type { Env } from './env';
import { linesRouter } from './routes/lines';
import { lineRouter } from './routes/line';
import { fleetRouter } from './routes/fleet';
import { stationsRouter } from './routes/stations';
import { handleScheduled } from './jobs';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Edge + browser caching: every visitor polls /api/lines every 30s, but data
// changes at most every 5 minutes — cache so N visitors cost one D1 read.
// (The Cache API is a no-op on *.workers.dev; Cache-Control still gives
// per-browser caching there. Full edge caching kicks in on a custom domain.)
const cacheGet = (maxAge: number): MiddlewareHandler<{ Bindings: Env }> => {
  const mw = cache({ cacheName: 'cta-watch-api', cacheControl: `public, max-age=${maxAge}` });
  return (c, next) => (c.req.method === 'GET' ? mw(c, next) : next());
};
app.use('/api/lines', cacheGet(60));
app.use('/api/line/*', cacheGet(60));
app.use('/api/stations/*', cacheGet(300));
app.use('/api/fleet/*', cacheGet(300));

app.route('/api/lines', linesRouter);
app.route('/api/line', lineRouter);
app.route('/api/fleet', fleetRouter);
app.route('/api/stations', stationsRouter);

// Only /api/* reaches the Worker (assets.run_worker_first); anything else
// under /api that didn't match a route is a genuine 404.
app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>;
