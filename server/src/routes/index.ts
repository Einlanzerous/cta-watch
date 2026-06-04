import { Router } from 'express';
import { linesRouter } from './lines';
import { lineRouter } from './line';
import { fleetRouter } from './fleet';
import { stationsRouter } from './stations';

export const apiRouter = Router();

// Lightweight liveness probe (used by the docker-compose healthcheck).
apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));

apiRouter.use('/lines', linesRouter);
apiRouter.use('/line', lineRouter);
apiRouter.use('/fleet', fleetRouter);
apiRouter.use('/stations', stationsRouter);
