import type { LineId } from './lines';

export interface SeriesData {
  series: number;
  builder: string;
  originCountry: string;
  yearIntroduced: number;
  yearRetired: number | null;
  notes: string;
}

export interface FleetEntry {
  lineId: LineId;
  series: number;
  carCount: number;
  upgradingFrom: number | null;
  upgradingTo: number | null;
  upgradePct: number;
}

export const SERIES_DATA: Record<number, SeriesData> = {
  2600: {
    series: 2600,
    builder: 'Budd Company',
    originCountry: 'United States',
    yearIntroduced: 1981,
    yearRetired: 2022,
    notes: 'Stainless steel construction. First CTA cars with system-wide air conditioning. Replaced by 5000-series.',
  },
  3200: {
    series: 3200,
    builder: 'Morrison Knudsen Transportation',
    originCountry: 'United States',
    yearIntroduced: 1992,
    yearRetired: null,
    notes: 'Current mid-generation fleet backbone. High-visibility orange and white exterior. 256 cars delivered.',
  },
  5000: {
    series: 5000,
    builder: 'Bombardier Transportation',
    originCountry: 'Canada',
    yearIntroduced: 2009,
    yearRetired: null,
    notes: 'Largest CTA procurement at the time — 706 cars total. Open gangway articulation on select married pairs. LED lighting throughout.',
  },
  7000: {
    series: 7000,
    builder: 'CRRC Sifang America',
    originCountry: 'China',
    yearIntroduced: 2021,
    yearRetired: null,
    notes: 'Largest procurement in CTA history — 846 cars contracted. Assembled by CRRC Sifang America at their Chicago plant. Features wider doors and open gangways between married pairs.',
  },
};

// Fleet assignments — approximate as of early 2026.
// 7000-series: 846 cars contracted from CRRC Sifang America, assembled in Springfield IL.
// ~240 in service as of early 2026, deployed first on Red then Blue.
// Verify against https://www.transitchicago.com/assets/1/6/7000-Series_FAQ.pdf for updates.
// Update car counts here and restart the server to apply (fleet always re-seeds on boot).
export const FLEET_SEED: FleetEntry[] = [
  // Red Line: largest 7000 deployment; 5000s displaced to storage/other lines
  { lineId: 'red',    series: 5000, carCount: 94,  upgradingFrom: null, upgradingTo: 7000, upgradePct: 0  },
  { lineId: 'red',    series: 7000, carCount: 144, upgradingFrom: 5000, upgradingTo: null, upgradePct: 61 },

  // Blue Line: second major 7000 deployment, mix of all three series
  { lineId: 'blue',   series: 3200, carCount: 58,  upgradingFrom: null, upgradingTo: 7000, upgradePct: 0 },
  { lineId: 'blue',   series: 5000, carCount: 42,  upgradingFrom: null, upgradingTo: 7000, upgradePct: 0 },
  { lineId: 'blue',   series: 7000, carCount: 96,  upgradingFrom: 5000, upgradingTo: null, upgradePct: 70 },

  // Brown Line: 3200s + 5000s (no 7000s confirmed yet)
  { lineId: 'brown',  series: 3200, carCount: 58,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'brown',  series: 5000, carCount: 10,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Green Line: 3200s + 5000s
  { lineId: 'green',  series: 3200, carCount: 30,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'green',  series: 5000, carCount: 18,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Orange Line: 3200s + 5000s
  { lineId: 'orange', series: 3200, carCount: 30,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'orange', series: 5000, carCount: 12,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Pink Line: 3200s + 5000s
  { lineId: 'pink',   series: 3200, carCount: 20,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'pink',   series: 5000, carCount: 10,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Purple Line: 3200s + 5000s
  { lineId: 'purple', series: 3200, carCount: 26,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'purple', series: 5000, carCount: 8,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Yellow Line (Skokie Swift): 2-car shuttle, 3200s only
  { lineId: 'yellow', series: 3200, carCount: 4,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
];
