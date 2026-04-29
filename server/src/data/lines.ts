export type LineId = 'red' | 'blue' | 'brown' | 'green' | 'orange' | 'pink' | 'purple' | 'yellow';

export interface LineConfig {
  id: LineId;
  name: string;
  color: string;
  textColor: string;
  ctaCode: string;
  description: string;
}

export const LINES: LineConfig[] = [
  { id: 'red',    name: 'Red Line',    color: '#C60C30', textColor: '#ffffff', ctaCode: 'Red',  description: 'Howard — 95th/Dan Ryan' },
  { id: 'blue',   name: 'Blue Line',   color: '#00A1DE', textColor: '#ffffff', ctaCode: 'Blue', description: "O'Hare — Forest Park" },
  { id: 'brown',  name: 'Brown Line',  color: '#62361B', textColor: '#ffffff', ctaCode: 'Brn',  description: 'Kimball — The Loop' },
  { id: 'green',  name: 'Green Line',  color: '#009B3A', textColor: '#ffffff', ctaCode: 'G',    description: 'Harlem/Lake — Ashland/63rd' },
  { id: 'orange', name: 'Orange Line', color: '#F9461C', textColor: '#ffffff', ctaCode: 'Org',  description: 'Midway — The Loop' },
  { id: 'pink',   name: 'Pink Line',   color: '#E27EA6', textColor: '#ffffff', ctaCode: 'Pink', description: '54th/Cermak — The Loop' },
  { id: 'purple', name: 'Purple Line', color: '#522398', textColor: '#ffffff', ctaCode: 'P',    description: 'Linden — Howard — The Loop' },
  { id: 'yellow', name: 'Yellow Line', color: '#F9E300', textColor: '#000000', ctaCode: 'Y',    description: 'Dempster-Skokie — Howard' },
];

// CTA Train Tracker API route code (lowercase) → line ID
export const CTA_CODE_TO_LINE: Record<string, LineId> = {
  red: 'red', blue: 'blue', brn: 'brown', g: 'green',
  org: 'orange', pink: 'pink', p: 'purple', pexp: 'purple', y: 'yellow',
};

// Chicago Open Data Portal column name → line ID
export const PORTAL_COL_TO_LINE: Record<string, LineId> = {
  red: 'red', blue: 'blue', brn: 'brown', g: 'green',
  o: 'orange', pnk: 'pink', p: 'purple', pexp: 'purple', y: 'yellow',
};

export const LINE_MAP = new Map<LineId, LineConfig>(LINES.map(l => [l.id, l]));
