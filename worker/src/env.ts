export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** "true" forces mock data even when CTA_API_KEY is set. */
  MOCK_MODE?: string;
  /** Secret. Absent → mock mode. */
  CTA_API_KEY?: string;
  /** Secret. Bearer token for fleet mutation endpoints. Absent → endpoints disabled. */
  ADMIN_TOKEN?: string;
}

export function isMockMode(env: Env): boolean {
  return env.MOCK_MODE === 'true' || !env.CTA_API_KEY;
}
