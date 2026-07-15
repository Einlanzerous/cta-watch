// Cron Triggers replace node-cron. Schedules live in wrangler.toml (UTC);
// dispatch happens here on the cron expression that fired.

import { createQ } from './db';
import { fetchTrainSnapshots } from './services/ctaApi';
import { fetchRecentRidership } from './services/chicagoData';
import { generateMockPoll } from './services/mock';
import { isMockMode, type Env } from './env';

export const CRON_POLL = '*/5 * * * *';
export const CRON_PRUNE = '0 9 * * *';
export const CRON_RIDERSHIP = '0 12 * * 1';

function chicagoHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false })
      .format(new Date()),
    10
  );
}

// Poll every 5 minutes: collect on-time data
async function pollOnTime(env: Env): Promise<void> {
  const hour = chicagoHour();
  if (hour < 5 && hour > 1) return; // CTA overnight shutdown

  const mock = isMockMode(env);
  const snapshots = mock ? generateMockPoll() : await fetchTrainSnapshots(env.CTA_API_KEY!);

  const now = new Date().toISOString();
  const bucket = now.slice(0, 13) + ':00:00Z';

  const q = createQ(env.DB);
  await env.DB.batch(snapshots.flatMap(s => [
    q.insertOnTime(s.lineId, s.totalTrains, s.delayedTrains, Math.round(s.onTimePct * 10) / 10, mock ? 1 : 0, now),
    q.upsertHourly(s.lineId, bucket, s.onTimePct),
  ]));
}

// Nightly prune: remove on_time_records older than 1 year
async function pruneOnTime(env: Env): Promise<void> {
  const result = await createQ(env.DB).pruneOnTime().run();
  if (result.meta.changes > 0) {
    console.log(`[prune] Removed ${result.meta.changes} on-time records older than 1 year`);
  }
}

// Weekly ridership refresh from Chicago Data Portal
async function syncRidership(env: Env): Promise<void> {
  console.log('[ridership] Syncing ridership from Chicago Data Portal...');
  const data = await fetchRecentRidership(30);

  const q = createQ(env.DB);
  const CHUNK = 200;
  for (let i = 0; i < data.length; i += CHUNK) {
    await env.DB.batch(data.slice(i, i + CHUNK).map(r => q.upsertRidership(r.stationId, r.date, r.rides)));
  }
  console.log(`[ridership] Updated ${data.length} ridership records`);
}

export async function handleScheduled(controller: ScheduledController, env: Env): Promise<void> {
  switch (controller.cron) {
    case CRON_POLL:      return pollOnTime(env);
    case CRON_PRUNE:     return pruneOnTime(env);
    case CRON_RIDERSHIP: return syncRidership(env);
    default:
      console.warn(`[jobs] No handler for cron "${controller.cron}"`);
  }
}
