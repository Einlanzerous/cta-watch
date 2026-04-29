import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { apiRouter } from './routes';
import { runSeedIfNeeded } from './seed';
import { startAllJobs } from './jobs';

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001'] }));
app.use(express.json());

app.use('/api', apiRouter);

// In production, serve the built Vue app
if (config.nodeEnv === 'production') {
  const staticPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

async function main() {
  console.log(`[boot] CTA Watch server starting (mock=${config.mockMode})...`);
  await runSeedIfNeeded();
  startAllJobs();
  app.listen(config.port, () => {
    console.log(`[boot] Server listening on http://localhost:${config.port}`);
    if (config.mockMode) {
      console.log('[boot] Running in MOCK MODE — set CTA_API_KEY in .env for live data');
    }
  });
}

main().catch(err => {
  console.error('[boot] Fatal error:', err);
  process.exit(1);
});
