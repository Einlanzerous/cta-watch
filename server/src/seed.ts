import { db, q } from './db';
import { LINES, type LineId } from './data/lines';
import { FLEET_SEED, SERIES_DATA } from './data/fleet';
import { fetchStations, fetchRecentRidership } from './services/chicagoData';
import { generateHistoricalData, MOCK_RIDERSHIP } from './services/mock';

// Minimal hardcoded station fallback used when Chicago Data Portal is unreachable
const FALLBACK_STATIONS: Array<{ stationId: string; lineId: LineId; name: string }> = [
  // Red Line
  { stationId: '40900', lineId: 'red', name: 'Howard' },
  { stationId: '41190', lineId: 'red', name: 'Loyola' },
  { stationId: '40080', lineId: 'red', name: 'Granville' },
  { stationId: '41300', lineId: 'red', name: 'Addison' },
  { stationId: '41220', lineId: 'red', name: 'Belmont' },
  { stationId: '41320', lineId: 'red', name: 'Fullerton' },
  { stationId: '40650', lineId: 'red', name: "North/Clybourn" },
  { stationId: '41450', lineId: 'red', name: 'Clark/Division' },
  { stationId: '40630', lineId: 'red', name: 'Chicago (Red)' },
  { stationId: '41660', lineId: 'red', name: 'Grand (Red)' },
  { stationId: '40560', lineId: 'red', name: 'Lake (Red)' },
  { stationId: '41090', lineId: 'red', name: 'Monroe (Red)' },
  { stationId: '40600', lineId: 'red', name: 'Jackson (Red)' },
  { stationId: '41400', lineId: 'red', name: 'Roosevelt (Red/Orange/Green)' },
  { stationId: '41510', lineId: 'red', name: 'Garfield (Red)' },
  { stationId: '41420', lineId: 'red', name: '95th/Dan Ryan' },
  // Blue Line
  { stationId: '40890', lineId: 'blue', name: "O'Hare" },
  { stationId: '40820', lineId: 'blue', name: 'Rosemont' },
  { stationId: '40750', lineId: 'blue', name: 'Cumberland' },
  { stationId: '41280', lineId: 'blue', name: 'Jefferson Park' },
  { stationId: '40570', lineId: 'blue', name: 'Belmont (Blue)' },
  { stationId: '40670', lineId: 'blue', name: 'Logan Square' },
  { stationId: '41020', lineId: 'blue', name: 'California' },
  { stationId: '40590', lineId: 'blue', name: 'Damen (Blue)' },
  { stationId: '40430', lineId: 'blue', name: 'Division (Blue)' },
  { stationId: '40490', lineId: 'blue', name: 'Chicago (Blue)' },
  { stationId: '40380', lineId: 'blue', name: 'Grand (Blue)' },
  { stationId: '41340', lineId: 'blue', name: 'Clark/Lake' },
  { stationId: '40850', lineId: 'blue', name: 'UIC-Halsted' },
  { stationId: '40810', lineId: 'blue', name: 'Illinois Medical District' },
  { stationId: '40920', lineId: 'blue', name: 'Forest Park' },
  // Brown Line
  { stationId: '41290', lineId: 'brown', name: 'Kimball' },
  { stationId: '41180', lineId: 'brown', name: 'Kedzie (Brown)' },
  { stationId: '41480', lineId: 'brown', name: 'Francisco' },
  { stationId: '40360', lineId: 'brown', name: 'Rockwell' },
  { stationId: '40540', lineId: 'brown', name: 'Western (Brown)' },
  { stationId: '41500', lineId: 'brown', name: 'Damen (Brown)' },
  { stationId: '40660', lineId: 'brown', name: 'Montrose (Brown)' },
  { stationId: '41440', lineId: 'brown', name: 'Irving Park (Brown)' },
  { stationId: '41310', lineId: 'brown', name: 'Addison (Brown)' },
  { stationId: '41060', lineId: 'brown', name: 'Paulina' },
  { stationId: '41130', lineId: 'brown', name: 'Southport' },
  { stationId: '41220', lineId: 'brown', name: 'Belmont (Brown/Red/Purple)' },
  { stationId: '40530', lineId: 'brown', name: 'Diversey' },
  { stationId: '41210', lineId: 'brown', name: 'Wellington' },
  { stationId: '40460', lineId: 'brown', name: 'Armitage' },
  { stationId: '40800', lineId: 'brown', name: 'Sedgwick' },
  { stationId: '40710', lineId: 'brown', name: 'Chicago (Brown/Purple)' },
  { stationId: '40260', lineId: 'brown', name: 'Merchandise Mart' },
  { stationId: '40380', lineId: 'brown', name: 'Clark/Lake' },
  // Green Line
  { stationId: '40020', lineId: 'green', name: 'Harlem/Lake' },
  { stationId: '40810', lineId: 'green', name: 'Oak Park (Green)' },
  { stationId: '41350', lineId: 'green', name: 'Ridgeland' },
  { stationId: '40280', lineId: 'green', name: 'Austin (Green)' },
  { stationId: '40700', lineId: 'green', name: 'Central (Green)' },
  { stationId: '40480', lineId: 'green', name: 'Laramie' },
  { stationId: '40390', lineId: 'green', name: 'Cicero (Green)' },
  { stationId: '40680', lineId: 'green', name: 'Conservatory-Central Park Drive' },
  { stationId: '41070', lineId: 'green', name: 'Kedzie (Green)' },
  { stationId: '40170', lineId: 'green', name: 'California (Green)' },
  { stationId: '41260', lineId: 'green', name: 'Ashland (Green/Pink)' },
  { stationId: '41340', lineId: 'green', name: 'Clark/Lake' },
  { stationId: '40400', lineId: 'green', name: 'Garfield (Green)' },
  { stationId: '40800', lineId: 'green', name: 'Cottage Grove' },
  // Orange Line
  { stationId: '40930', lineId: 'orange', name: 'Midway' },
  { stationId: '40960', lineId: 'orange', name: 'Pulaski (Orange)' },
  { stationId: '41150', lineId: 'orange', name: 'Kedzie-Homan (Orange)' },
  { stationId: '40310', lineId: 'orange', name: 'Western (Orange)' },
  { stationId: '40120', lineId: 'orange', name: 'Halsted (Orange)' },
  { stationId: '41400', lineId: 'orange', name: 'Roosevelt' },
  { stationId: '40850', lineId: 'orange', name: 'Harold Washington Library-State/Van Buren' },
  { stationId: '40680', lineId: 'orange', name: 'LaSalle/Van Buren' },
  { stationId: '40640', lineId: 'orange', name: 'Quincy/Wells' },
  { stationId: '40160', lineId: 'orange', name: 'Washington/Wells' },
  { stationId: '40730', lineId: 'orange', name: 'Clark/Lake' },
  // Pink Line
  { stationId: '40580', lineId: 'pink', name: '54th/Cermak' },
  { stationId: '40780', lineId: 'pink', name: 'Cicero (Pink)' },
  { stationId: '40420', lineId: 'pink', name: 'Kostner' },
  { stationId: '40600', lineId: 'pink', name: 'Pulaski (Pink)' },
  { stationId: '41040', lineId: 'pink', name: 'Central Park (Pink)' },
  { stationId: '40170', lineId: 'pink', name: 'Kedzie (Pink)' },
  { stationId: '41260', lineId: 'pink', name: 'Ashland (Green/Pink)' },
  { stationId: '40830', lineId: 'pink', name: 'Polk' },
  { stationId: '41230', lineId: 'pink', name: 'Morgan (Green/Pink)' },
  // Purple Line
  { stationId: '41680', lineId: 'purple', name: 'Linden' },
  { stationId: '41700', lineId: 'purple', name: 'Central (Purple)' },
  { stationId: '41760', lineId: 'purple', name: 'Noyes' },
  { stationId: '41800', lineId: 'purple', name: 'Foster' },
  { stationId: '41820', lineId: 'purple', name: 'Davis' },
  { stationId: '41840', lineId: 'purple', name: 'Dempster' },
  { stationId: '41860', lineId: 'purple', name: 'Main' },
  { stationId: '40900', lineId: 'purple', name: 'Howard' },
  // Yellow Line
  { stationId: '40140', lineId: 'yellow', name: 'Dempster-Skokie' },
  { stationId: '40840', lineId: 'yellow', name: 'Oakton-Skokie' },
  { stationId: '40900', lineId: 'yellow', name: 'Howard (transfer)' },
];

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
