import axios from 'axios';
import { PORTAL_COL_TO_LINE, type LineId } from '../data/lines';

const PORTAL = 'https://data.cityofchicago.org/resource';

interface RawStop {
  stop_id: string;
  station_name: string;
  map_id: string;
  ada: boolean | string;
  location?: { latitude: string; longitude: string };
  // Line boolean columns
  red?: boolean | string; blue?: boolean | string; g?: boolean | string;
  brn?: boolean | string; p?: boolean | string; pexp?: boolean | string;
  y?: boolean | string; pnk?: boolean | string; o?: boolean | string;
}

interface RawRidership {
  station_id: string;
  stationname: string;
  date: string;
  rides: string;
}

export interface ParsedStation {
  stationId: string;
  lineId: LineId;
  stationName: string;
  ada: boolean;
  lat: number | null;
  lon: number | null;
}

export async function fetchStations(): Promise<ParsedStation[]> {
  const { data } = await axios.get<RawStop[]>(`${PORTAL}/8pix-ypme.json`, {
    params: { $limit: 600 },
    timeout: 15_000,
  });

  const rows: StationRow[] = [];

  for (const stop of data) {
    const lineKeys = Object.keys(PORTAL_COL_TO_LINE);
    for (const col of lineKeys) {
      const val = stop[col as keyof RawStop];
      if (val === true || val === 'true') {
        const lineId = PORTAL_COL_TO_LINE[col];
        rows.push({
          stationId: stop.map_id,
          lineId,
          stationName: stop.station_name,
          ada: stop.ada === true || stop.ada === 'true',
          lat: stop.location ? parseFloat(stop.location.latitude) : null,
          lon: stop.location ? parseFloat(stop.location.longitude) : null,
        });
        break; // map_id is unique per station; one entry per line
      }
    }
  }

  // Deduplicate by (stationId, lineId)
  const seen = new Set<string>();
  return rows.filter(r => {
    const key = `${r.stationId}:${r.lineId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchRecentRidership(daysBack = 60): Promise<Array<{ stationId: string; date: string; rides: number }>> {
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().split('T')[0];
  const allData: RawRidership[] = [];
  const PAGE = 50_000;
  let offset = 0;

  while (true) {
    const { data } = await axios.get<RawRidership[]>(`${PORTAL}/5neh-572f.json`, {
      params: {
        $where: `date >= '${since}'`,
        $limit: PAGE,
        $offset: offset,
        $order: 'date DESC',
      },
      timeout: 30_000,
    });
    allData.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return allData.map(r => ({
    stationId: r.station_id,
    date: r.date.split('T')[0],
    rides: parseInt(r.rides, 10),
  }));
}
