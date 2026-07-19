import { CTA_CODE_TO_LINE, type LineId } from '../../../server/src/data/lines';

const CTA_BASE = 'https://lapi.transitchicago.com/api/1.0';
const ALL_ROUTES = 'Red,Blue,Brn,G,Org,P,Pink,Y';

interface RawTrain {
  rn: string;
  rt: string;
  isDly: string;
  lat: string;
  lon: string;
  heading: string;
}

interface RawRoute {
  '@name': string;
  train?: RawTrain | RawTrain[];
}

interface CtaResponse {
  ctatt: {
    errCd: string;
    errNm: string | null;
    route: RawRoute | RawRoute[];
  };
}

export interface LineSnapshot {
  lineId: LineId;
  totalTrains: number;
  delayedTrains: number;
  onTimePct: number;
}

export async function fetchTrainSnapshots(apiKey: string): Promise<LineSnapshot[]> {
  const params = new URLSearchParams({ key: apiKey, rt: ALL_ROUTES, outputType: 'JSON' });
  const res = await fetch(`${CTA_BASE}/ttpositions.aspx?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`CTA API HTTP ${res.status}`);
  const { ctatt } = await res.json<CtaResponse>();

  if (ctatt.errCd !== '0') throw new Error(`CTA API error ${ctatt.errCd}: ${ctatt.errNm}`);

  const routes = Array.isArray(ctatt.route) ? ctatt.route : [ctatt.route];

  return routes.flatMap(route => {
    const lineId = CTA_CODE_TO_LINE[route['@name'].toLowerCase()];
    if (!lineId) return [];

    const trains: RawTrain[] = !route.train
      ? []
      : Array.isArray(route.train) ? route.train : [route.train];
    const total = trains.length;
    const delayed = trains.filter(t => t.isDly === '1').length;
    const onTimePct = total === 0 ? 100 : ((total - delayed) / total) * 100;

    return [{ lineId, totalTrains: total, delayedTrains: delayed, onTimePct }];
  });
}
