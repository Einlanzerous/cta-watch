export type LineId = 'red' | 'blue' | 'brown' | 'green' | 'orange' | 'pink' | 'purple' | 'yellow';

export interface TrendPoint {
  bucket: string;
  onTimePct: number;
}

export interface MonthlyRidership {
  month: string;   // "2026-02"
  total: number;
  days: number;    // how many days of data in this month (may be < full month at edges)
}

export interface FleetSeries {
  series: number;
  carCount: number;
  isUpgrading: boolean;
  upgradePct: number;
  builder: string;
  originCountry: string;
  yearIntroduced: number;
  barPct: number;
}

export interface FleetSummary {
  total: number;
  isUpgrading: boolean;
  upgradePct: number;
  series: FleetSeries[];
}

export interface LineSummary {
  id: LineId;
  name: string;
  color: string;
  textColor: string;
  description: string;
  onTimePct: number;
  onTimePct6h: number;
  onTimePct24h: number;
  onTimePct7d: number;
  onTimePct30d: number;
  lastRecorded: string | null;
  onTimeTrend24h: TrendPoint[];
  onTimeTrend7d: TrendPoint[];
  onTimeTrend30d: TrendPoint[];
  totalRidesToday: number;
  ridershipMonthly: MonthlyRidership[];
  ridershipYoY: number | null;
  ridershipWeekdayAvg: number;
  ridershipWeekendAvg: number;
  fleet: FleetSummary;
}

export type TimePeriod = '6h' | '24h' | '7d' | '30d';

export interface LinesResponse {
  lines: LineSummary[];
  updatedAt: string;
  mockMode: boolean;
  ridershipDate: string | null;
}

export interface SeriesInfo {
  builder: string;
  originCountry: string;
  yearIntroduced: number;
  yearRetired: number | null;
  notes: string;
}

export interface FleetDetail {
  series: number;
  carCount: number;
  upgradingFrom: number | null;
  upgradingTo: number | null;
  upgradePct: number;
  barPct: number;
  seriesInfo: SeriesInfo;
}

export interface WeeklyPoint {
  date: string;
  rides: number;
}

export interface StationDetail {
  stationId: string;
  stationName: string;
  ada: boolean;
  ridesToday: number;
  ridesWeeklyAvg: number;
  ridership7d: WeeklyPoint[];
}

export interface LineDetail {
  id: LineId;
  name: string;
  color: string;
  textColor: string;
  description: string;
  onTimePct: number;
  onTimePct6h: number;
  onTimePct24h: number;
  onTimePct7d: number;
  onTimePct30d: number;
  onTimeTrend24h: TrendPoint[];
  onTimeTrend7d: TrendPoint[];
  onTimeTrend30d: TrendPoint[];
  totalRidesToday: number;
  ridershipMonthly: MonthlyRidership[];
  ridershipYoY: number | null;
  ridershipWeekdayAvg: number;
  ridershipWeekendAvg: number;
  fleet: FleetDetail[];
  stations: StationDetail[];
}
