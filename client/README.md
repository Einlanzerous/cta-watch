# CTA Watch — Client

Vue 3 + TypeScript + Vite frontend. A pure display layer — all data comes from the Express server at `/api`.

## Development

```bash
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # vue-tsc type check + vite build → dist/
npm run preview  # Preview the production build locally
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001`. The server must be running for data to load; the UI shows skeleton loaders and an error state if it isn't.

## Design System

Tailwind UI dark-mode aesthetic. Key tokens:

| Element | Class / Style |
|---------|---------------|
| Page background | `bg-gray-950` |
| Cards | `rounded-2xl bg-gray-900 ring-1 ring-white/10` |
| Section labels | `section-label` utility — 11px, uppercase, gray-500 |
| Numbers | `font-semibold tabular-nums text-white` |
| Secondary text | `text-gray-400` / `text-gray-500` |
| HP bar track | `bg-gray-800/80 rounded-full` |
| HP bar fill | Line color + `box-shadow` glow |
| Train series icon | 32×32px bordered box, line color, `font-mono font-bold` |

Line colors are CTA's official hex values:

| Line | Color |
|------|-------|
| Red | `#C60C30` |
| Blue | `#00A1DE` |
| Brown | `#62361B` |
| Green | `#009B3A` |
| Orange | `#F9461C` |
| Pink | `#E27EA6` |
| Purple | `#522398` |
| Yellow | `#F9E300` |

## Component Reference

### Layout

| Component | Description |
|-----------|-------------|
| `App.vue` | Root — system summary strip, `LineGrid`, `LineDetailModal` |
| `AppHeader.vue` | Sticky header with logo, last-updated time, mock-mode badge, live/stale indicator |
| `LineGrid.vue` | Responsive 1–4 column grid of `LineCard` components with skeleton and error states |

### Cards & Visualization

| Component | Description |
|-----------|-------------|
| `LineCard.vue` | Per-line dashboard card. Shows on-time HP bar + 24h sparkline, fleet series bars, ridership. Clicking opens `LineDetailModal`. |
| `HpBar.vue` | Colored progress bar with glow. Props: `value`, `max` (default 100), `color`, `size` (xs/sm/md/lg), `showLabel`. |
| `SeriesIcon.vue` | The `|5|`-style car generation badge. Shows first digit of series number in a bordered box. Props: `series: number`, `color: string`. |
| `MiniSparkline.vue` | Tiny 56×20px SVG line chart. Used for 24h on-time sparkline on cards and 7-day ridership sparkline in station table. |
| `TrendChart.vue` | Full-width SVG area chart with Y-axis labels and date ticks. Used for the 30-day trend in the line modal. |

### Modal Detail

| Component | Description |
|-----------|-------------|
| `LineDetailModal.vue` | Full modal with three tabs: Overview, Fleet, Stations. Uses `Teleport to="body"` with fade + slide transition. |
| `FleetDisplay.vue` | Per-series list with `SeriesIcon`, HP bar, car count, builder, and upgrade badge. Used in both the card (compact) and fleet tab (full). |
| `UpgradeProgress.vue` | Gradient progress bar showing `5000 → 7000` upgrade percentage. Appears in the fleet tab when an active upgrade is in progress. |
| `StationList.vue` | Filterable table of stations with yesterday's riders, 7-day average, and a `MiniSparkline` per row. |

## Composables

| Composable | Description |
|------------|-------------|
| `usePolling(fetcher, intervalMs, default)` | Generic interval-based fetch. Returns `{ data, loading, error, refresh }`. Cleans up the interval on `onUnmounted`. |
| `useLineDetail()` | Lazy fetch for `GET /api/line/:id`. Caches results in a module-level `Map` so re-opening the same modal skips the network round-trip. Returns `{ detail, loading, error, fetchDetail, invalidate }`. |

`App.vue` calls `usePolling` for `/api/lines` on a 30-second interval. `LineDetailModal.vue` calls `useLineDetail.fetchDetail(lineId)` when the modal is opened.

## Project Structure

```
src/
├── main.ts
├── App.vue
├── index.css                  Tailwind directives + .glass-card / .section-label utilities
├── api/
│   └── client.ts              Typed fetch wrapper
├── types/
│   └── index.ts               All shared TypeScript interfaces (mirrors server API shapes)
├── constants/
│   └── lines.ts               LINE_META — name + hex color per line ID
├── composables/
│   ├── usePolling.ts
│   └── useLineDetail.ts
└── components/
    ├── AppHeader.vue
    ├── LineGrid.vue
    ├── LineCard.vue
    ├── HpBar.vue
    ├── SeriesIcon.vue
    ├── MiniSparkline.vue
    ├── TrendChart.vue
    ├── FleetDisplay.vue
    ├── UpgradeProgress.vue
    ├── LineDetailModal.vue
    └── StationList.vue
```

## Adding a New Visualization

1. Add any new fields to the relevant interface in `src/types/index.ts`
2. Ensure the server route returns those fields
3. Build the component — use `HpBar`, `SeriesIcon`, or `MiniSparkline` as primitives
4. Drop it into `LineCard.vue` (dashboard) or a tab in `LineDetailModal.vue` (detail view)

## Production Build

```bash
npm run build
```

Output goes to `dist/`. In production mode the Express server at `PORT=3001` serves this directory — no separate static host needed.

To preview the production build locally against the running server:
```bash
npm run preview   # http://localhost:4173, also proxied to :3001
```
