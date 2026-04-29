<template>
  <section class="rounded-2xl bg-gray-900/60 ring-1 ring-white/8 p-6">
    <!-- Header -->
    <div class="flex items-baseline justify-between mb-5">
      <div>
        <p class="section-label mb-1 flex items-center gap-1">
          Fleet Composition
          <InfoTip>
            Car counts are manually maintained based on public CTA documents and fleet announcements.
            Figures are approximate and updated periodically — exact numbers shift as deliveries arrive
            and older cars are retired. Last verified early 2026.
          </InfoTip>
        </p>
        <h2 class="text-lg font-semibold text-white">
          System-Wide — {{ totalCars.toLocaleString() }} cars
        </h2>
      </div>
      <span class="text-xs text-gray-600">All {{ entries.length }} active series</span>
    </div>

    <!-- Stacked bar -->
    <div class="mb-6 flex h-5 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        v-for="e in entries"
        :key="e.series"
        class="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
        :style="{ width: `${e.pct}%`, backgroundColor: e.color }"
        :title="`${e.series}-Series: ${e.carCount.toLocaleString()} cars (${e.pct.toFixed(1)}%)`"
      />
    </div>

    <!-- Series cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="e in entries"
        :key="e.series"
        class="rounded-xl bg-gray-800/50 p-4 ring-1 ring-white/5 transition-colors hover:bg-gray-800/80"
      >
        <div class="flex items-start gap-3 mb-3">
          <SeriesIcon :series="e.series" :color="e.color" size="md" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="font-semibold text-white text-sm">{{ e.series }}-Series</h3>
              <span class="font-mono text-xs" :style="{ color: e.color }">
                {{ e.pct.toFixed(1) }}%
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5 truncate">{{ e.builder }}</p>
          </div>
        </div>

        <!-- Mini bar -->
        <div class="h-1.5 w-full rounded-full bg-gray-700 mb-3 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{ width: `${e.pct}%`, backgroundColor: e.color }"
          />
        </div>

        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div>
            <p class="text-gray-600">Cars</p>
            <p class="font-mono font-semibold text-gray-200">{{ e.carCount.toLocaleString() }}</p>
          </div>
          <div>
            <p class="text-gray-600">Introduced</p>
            <p class="text-gray-200">
              {{ e.yearIntroduced }}
              <span v-if="e.yearRetired" class="text-gray-600"> – {{ e.yearRetired }}</span>
              <span v-else class="text-gray-600"> →</span>
            </p>
          </div>
        </div>

        <a
          v-if="e.wikiUrl"
          :href="e.wikiUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 flex items-center gap-1 text-[11px] transition-opacity hover:opacity-100 opacity-60"
          :style="{ color: e.color }"
          @click.stop
        >
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="7,1 11,1 11,5"/>
            <line x1="11" y1="1" x2="5" y2="7"/>
            <path d="M9,8v3H1V4h3"/>
          </svg>
          Wikipedia
        </a>
      </div>
    </div>

    <!-- Upgrade callout -->
    <div v-if="upgrading" class="mt-4 rounded-xl bg-emerald-950/40 px-4 py-3 ring-1 ring-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
      <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"/>
      <span>7000-Series delivery ongoing — {{ upgrading.carCount }} cars in service so far out of 846 contracted</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LineSummary } from '@/types';
import { SERIES_COLORS, SERIES_WIKI } from '@/constants/series';
import SeriesIcon from './SeriesIcon.vue';
import InfoTip from './InfoTip.vue';

const props = defineProps<{ lines: LineSummary[] }>();

interface Entry {
  series: number;
  carCount: number;
  pct: number;
  builder: string;
  yearIntroduced: number;
  yearRetired: number | null;
  color: string;
  wikiUrl: string | null;
}

const entries = computed<Entry[]>(() => {
  const map = new Map<number, { carCount: number; builder: string; yearIntroduced: number; yearRetired: number | null }>();

  for (const line of props.lines) {
    for (const s of line.fleet.series) {
      const existing = map.get(s.series);
      if (existing) {
        existing.carCount += s.carCount;
      } else {
        map.set(s.series, {
          carCount: s.carCount,
          builder: s.builder,
          yearIntroduced: s.yearIntroduced,
          yearRetired: null,
        });
      }
    }
  }

  const total = [...map.values()].reduce((s, e) => s + e.carCount, 0) || 1;

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([series, data]) => ({
      series,
      carCount: data.carCount,
      pct: (data.carCount / total) * 100,
      builder: data.builder,
      yearIntroduced: data.yearIntroduced,
      yearRetired: data.yearRetired,
      color: SERIES_COLORS[series] ?? '#6b7280',
      wikiUrl: SERIES_WIKI[series] ?? null,
    }));
});

const totalCars = computed(() => entries.value.reduce((s, e) => s + e.carCount, 0));

const upgrading = computed(() => entries.value.find(e => e.series === 7000));
</script>
