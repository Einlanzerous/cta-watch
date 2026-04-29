import cron from 'node-cron';
import { db, q } from './db';
import { fetchTrainSnapshots } from './services/ctaApi';
import { fetchRecentRidership } from './services/chicagoData';
import { generateMockPoll } from './services/mock';
import { config } from './config';

function chicagoHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false })
      .format(new Date()),
    10
  );
}

// Poll every 5 minutes: collect on-time data
export function startPollJob(): void {
  cron.schedule('*/5 * * * *', async () => {
    const hour = chicagoHour();
    if (hour < 5 && hour > 1) return; // CTA overnight shutdown

    try {
      const snapshots = config.mockMode
        ? generateMockPoll()
        : await fetchTrainSnapshots();

      const now = new Date().toISOString();
      const bucket = now.slice(0, 13) + ':00:00Z';

      const insert = db.transaction(() => {
        for (const s of snapshots) {
          q.insertOnTime.run(
            s.lineId, s.totalTrains, s.delayedTrains,
            Math.round(s.onTimePct * 10) / 10, config.mockMode ? 1 : 0, now
          );
          q.upsertHourly.run(s.lineId, bucket, s.onTimePct);
        }
      });
      insert();
    } catch (err) {
      console.error('[poll] Error collecting on-time data:', err);
    }
  });
  console.log('[jobs] Train poll job registered (every 5 min during service hours)');
}

// Nightly prune: remove on_time_records older than 1 year
export function startPruneJob(): void {
  cron.schedule('0 3 * * *', () => {
    try {
      const result = q.pruneOnTime.run();
      if (result.changes > 0) {
        console.log(`[prune] Removed ${result.changes} on-time records older than 1 year`);
      }
    } catch (err) {
      console.error('[prune] Error pruning records:', err);
    }
  });
  console.log('[jobs] Prune job registered (daily at 03:00)');
}

// Weekly ridership refresh from Chicago Data Portal
export function startRidershipJob(): void {
  cron.schedule('0 6 * * 1', async () => {
    console.log('[ridership] Syncing ridership from Chicago Data Portal...');
    try {
      const data = await fetchRecentRidership(30);
      const insert = db.transaction(() => {
        for (const r of data) {
          q.upsertRidership.run(r.stationId, r.date, r.rides);
        }
      });
      insert();
      console.log(`[ridership] Updated ${data.length} ridership records`);
    } catch (err) {
      console.error('[ridership] Error syncing ridership:', err);
    }
  });
  console.log('[jobs] Ridership sync job registered (Mondays at 06:00)');
}

export function startAllJobs(): void {
  startPollJob();
  startPruneJob();
  startRidershipJob();
}
