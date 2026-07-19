import { db, q } from './db';
import { LINES, type LineId } from './data/lines';
import { FLEET_SEED, SERIES_DATA } from './data/fleet';
import { fetchStations, fetchRecentRidership } from './services/chicagoData';
import { generateHistoricalData, MOCK_RIDERSHIP } from './services/mock';
import { FALLBACK_STATIONS } from './data/fallbackStations';

export async function runSeedIfNeeded(): Promise<void> {
  const now = new Date().toISOString();

  // 1. Fleet + series info — always upsert so updates to fleet.ts take effect on restart
  console.log('[seed] Applying fleet data...');
  const seedFleet = db.transaction(() => {
    for (const info of Object.values(SERIES_DATA)) {
      q.insertSeriesInfo.run(
        info.series, info.builder, info.originCountry,
        info.yearIntroduced, info.yearRetired ?? null, info.notes
      );
    }
    for (const e of FLEET_SEED) {
      q.upsertFleet.run(
        e.lineId, e.series, e.carCount,
        e.upgradingFrom ?? null, e.upgradingTo ?? null, e.upgradePct, now
      );
    }
  });
  seedFleet();
  console.log(`[seed] Fleet applied: ${FLEET_SEED.length} entries`);

  // 2. Stations
  const stationCount = (q.countStations.get() as { cnt: number }).cnt;
  if (stationCount === 0) {
    console.log('[seed] Fetching stations from Chicago Data Portal...');
    try {
      const stations = await fetchStations();
      const insertStations = db.transaction(() => {
        for (const s of stations) {
          q.upsertStation.run(s.stationId, s.lineId, s.stationName, s.ada ? 1 : 0, s.lat, s.lon);
        }
      });
      insertStations();
      console.log(`[seed] Stations seeded: ${stations.length} entries`);
    } catch (err) {
      console.warn('[seed] Chicago Data Portal unreachable, using fallback stations');
      const insertFallback = db.transaction(() => {
        for (const s of FALLBACK_STATIONS) {
          q.upsertStation.run(s.stationId, s.lineId, s.name, 0, null, null);
        }
      });
      insertFallback();
    }
  }

  // 3. On-time history
  const ontimeCount = (q.countOnTime.get() as { cnt: number }).cnt;
  if (ontimeCount === 0) {
    console.log('[seed] Generating 30-day on-time history...');
    const history = generateHistoricalData(30);
    const insertHistory = db.transaction(() => {
      for (const r of history) {
        q.insertOnTime.run(r.lineId, r.totalTrains, r.delayedTrains, r.onTimePct, 1, r.recordedAt);
        const bucket = r.recordedAt.slice(0, 13) + ':00:00Z';
        q.upsertHourly.run(r.lineId, bucket, r.onTimePct);
      }
    });
    insertHistory();
    console.log(`[seed] On-time history seeded: ${history.length} records`);
  }

  // 4. Ridership — fetch 14 months on first boot for YoY comparisons; weekly job handles ongoing updates
  const ridershipDays = (
    q.countRidershipDays.get() as { days: number }
  ).days;
  if (ridershipDays >= 60) {
    console.log(`[seed] Ridership already seeded (${ridershipDays} days), skipping full pull`);
    return;
  }
  try {
    console.log('[seed] Fetching 14 months of ridership from Chicago Data Portal (first boot)...');
    const ridership = await fetchRecentRidership(425);
    const insertRidership = db.transaction(() => {
      for (const r of ridership) {
        q.upsertRidership.run(r.stationId, r.date, r.rides);
      }
    });
    insertRidership();
    console.log(`[seed] Ridership seeded: ${ridership.length} records`);
  } catch {
    console.warn('[seed] Could not fetch ridership — seeding with mock averages');
    // Seed mock ridership for yesterday so the UI shows numbers
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const stations = q.getStationsForLine;
    const insertMock = db.transaction(() => {
      for (const line of LINES) {
        const lineStations = stations.all(line.id) as Array<{ station_id: string }>;
        if (lineStations.length === 0) continue;
        const perStation = Math.round(MOCK_RIDERSHIP[line.id] / lineStations.length);
        for (const s of lineStations) {
          const noise = Math.round((Math.random() - 0.5) * perStation * 0.4);
          q.upsertRidership.run(s.station_id, yesterday, Math.max(0, perStation + noise));
        }
      }
    });
    insertMock();
  }
}
