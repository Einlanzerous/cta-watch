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
    yearRetired: null,
    notes: 'Stainless steel construction; first CTA cars with system-wide air conditioning. Still ~445 cars in revenue service — backbone of the Blue and Orange lines and mixed with 3200s on the Brown. A life-extension program beginning 2026 keeps them on secondary routes pending full 7000/9000-series replacement (~2030).',
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
// 2600-series: ~445 cars still in revenue service — Blue/Orange backbone, mixed with 3200s on Brown.
// Verify against https://www.transitchicago.com/assets/1/6/7000-Series_FAQ.pdf for updates.
// Update car counts here and restart the server to apply (fleet always re-seeds on boot).
// To retire an allocation set carCount: 0 — seedFleet upserts (never deletes), and the
// getFleet query hides 0-count rows, so a 0 cleanly removes a series from a line.
export const FLEET_SEED: FleetEntry[] = [
  // Red Line: largest 7000 deployment; 5000s displaced to storage/other lines
  { lineId: 'red',    series: 5000, carCount: 94,  upgradingFrom: null, upgradingTo: 7000, upgradePct: 0  },
  { lineId: 'red',    series: 7000, carCount: 144, upgradingFrom: 5000, upgradingTo: null, upgradePct: 61 },

  // Blue Line: 2600s are the backbone; 7000 deployment ramping up (replacing 2600s); legacy 3200s mixed in.
  { lineId: 'blue',   series: 2600, carCount: 124, upgradingFrom: null, upgradingTo: 7000, upgradePct: 0  },
  { lineId: 'blue',   series: 7000, carCount: 56,  upgradingFrom: 2600, upgradingTo: null, upgradePct: 31 },
  { lineId: 'blue',   series: 3200, carCount: 16,  upgradingFrom: null, upgradingTo: null, upgradePct: 0  },
  { lineId: 'blue',   series: 5000, carCount: 0,   upgradingFrom: null, upgradingTo: null, upgradePct: 0  }, // 5000s reassigned off the Blue Line

  // Brown Line: classic 2600 + 3200 mixed consists (no 7000s assigned yet).
  { lineId: 'brown',  series: 3200, carCount: 40,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'brown',  series: 2600, carCount: 28,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'brown',  series: 5000, carCount: 0,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 }, // 5000s never assigned to the Brown Line

  // Green Line: 3200s + 5000s
  { lineId: 'green',  series: 3200, carCount: 30,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'green',  series: 5000, carCount: 18,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Orange Line: almost entirely 2600-series, with a handful of 3200s.
  { lineId: 'orange', series: 2600, carCount: 36,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'orange', series: 3200, carCount: 6,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'orange', series: 5000, carCount: 0,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 }, // 5000s never assigned to the Orange Line

  // Pink Line: 3200s + 5000s
  { lineId: 'pink',   series: 3200, carCount: 20,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'pink',   series: 5000, carCount: 10,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Purple Line: 3200s + 5000s
  { lineId: 'purple', series: 3200, carCount: 26,  upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
  { lineId: 'purple', series: 5000, carCount: 8,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 },

  // Yellow Line (Skokie Swift): 2-car shuttle, 3200s only
  { lineId: 'yellow', series: 3200, carCount: 4,   upgradingFrom: null, upgradingTo: null, upgradePct: 0 },
];
