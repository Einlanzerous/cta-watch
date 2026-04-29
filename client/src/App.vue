<template>
  <div class="min-h-full bg-gray-950">
    <AppHeader :updated-at="response.updatedAt" :mock-mode="response.mockMode" />

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

      <!-- Summary strip + period selector -->
      <div v-if="!loading && response.lines.length" class="mb-6">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
          <!-- Stat cards -->
          <div class="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
            <div class="rounded-xl bg-gray-900/70 px-4 py-3 ring-1 ring-white/8 min-w-[120px]">
              <p class="section-label">Avg On Time</p>
              <p
                class="mt-0.5 text-xl font-bold tabular-nums"
                :class="avgOnTime >= 90 ? 'text-emerald-400' : avgOnTime >= 80 ? 'text-amber-400' : 'text-red-400'"
              >
                {{ avgOnTime.toFixed(1) }}%
              </p>
              <p class="mt-0.5 text-[10px] text-gray-600">{{ periodLabel }}</p>
            </div>
            <div class="rounded-xl bg-gray-900/70 px-4 py-3 ring-1 ring-white/8 min-w-[120px]">
              <p class="section-label">Lines Running</p>
              <p class="mt-0.5 text-xl font-bold text-white tabular-nums">
                {{ response.lines.length }}<span class="text-sm font-normal text-gray-500"> / 8</span>
              </p>
              <p class="mt-0.5 text-[10px] text-gray-600">active routes</p>
            </div>
            <div class="rounded-xl bg-gray-900/70 px-4 py-3 ring-1 ring-white/8 min-w-[120px]">
              <p class="section-label">Daily Riders</p>
              <p class="mt-0.5 text-xl font-bold text-white tabular-nums">
                {{ totalRidership > 0 ? formatK(totalRidership) : '—' }}
              </p>
              <p class="mt-0.5 text-[10px] text-gray-600">{{ ridershipLabel }}</p>
            </div>
            <div class="rounded-xl bg-gray-900/70 px-4 py-3 ring-1 ring-white/8 min-w-[120px]">
              <p class="section-label">Total Fleet</p>
              <p class="mt-0.5 text-xl font-bold text-white tabular-nums">
                {{ totalFleet.toLocaleString() }}
                <span class="text-sm font-normal text-gray-500"> cars</span>
              </p>
              <p class="mt-0.5 text-[10px] text-gray-600">across all lines</p>
            </div>
          </div>

          <!-- Period selector -->
          <PeriodSelector v-model="period" />
        </div>
      </div>

      <!-- Line cards -->
      <LineGrid
        :lines="response.lines"
        :loading="loading"
        :error="error"
        :period="period"
        :ridership-date="response.ridershipDate"
        @open-line="openLine"
        @refresh="refresh"
      />

      <!-- Fleet composition -->
      <SystemFleet
        v-if="!loading && response.lines.length"
        :lines="response.lines"
        class="mt-8"
      />

    </main>

    <!-- Line detail modal -->
    <LineDetailModal
      :show="!!activeLine"
      :line-id="activeLine"
      :initial-period="period"
      @close="activeLine = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePolling } from '@/composables/usePolling';
import { apiFetch } from '@/api/client';
import { formatK, lastFullWeekLabel } from '@/utils/format';
import type { LinesResponse, LineId, TimePeriod } from '@/types';
import AppHeader from '@/components/AppHeader.vue';
import LineGrid from '@/components/LineGrid.vue';
import LineDetailModal from '@/components/LineDetailModal.vue';
import PeriodSelector from '@/components/PeriodSelector.vue';
import SystemFleet from '@/components/SystemFleet.vue';

const defaultResponse: LinesResponse = { lines: [], updatedAt: '', mockMode: false, ridershipDate: null };

const { data: response, loading, error, refresh } = usePolling<LinesResponse>(
  () => apiFetch<LinesResponse>('/api/lines'),
  30_000,
  defaultResponse
);

const activeLine = ref<LineId | null>(null);
const period = ref<TimePeriod>('24h');

function openLine(id: LineId) {
  activeLine.value = id;
}

const periodLabel = computed(() => ({
  '6h':  'last 6 hours',
  '24h': 'last 24 hours',
  '7d':  lastFullWeekLabel(),
  '30d': 'last 30 days',
}[period.value]));

const avgOnTime = computed(() => {
  const lines = response.value.lines;
  if (!lines.length) return 0;
  const key = ({
    '6h':  'onTimePct6h',
    '24h': 'onTimePct24h',
    '7d':  'onTimePct7d',
    '30d': 'onTimePct30d',
  } as const)[period.value];
  return lines.reduce((s, l) => s + l[key], 0) / lines.length;
});

const totalRidership = computed(() =>
  response.value.lines.reduce((s, l) => s + l.totalRidesToday, 0)
);

const totalFleet = computed(() =>
  response.value.lines.reduce((s, l) => s + l.fleet.total, 0)
);

const ridershipLabel = computed(() => {
  const d = response.value.ridershipDate;
  if (!d) return 'portal data unavailable';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
});

</script>
