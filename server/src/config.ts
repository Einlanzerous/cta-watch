import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  ctaApiKey: process.env.CTA_API_KEY ?? '',
  mockMode: process.env.MOCK_MODE === 'true' || !process.env.CTA_API_KEY,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dbPath: process.env.DB_PATH ?? './data/cta-watch.db',
} as const;
