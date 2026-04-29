<template>
  <button
    class="relative flex h-full w-full flex-col cursor-pointer rounded-2xl bg-gray-900 p-5 text-left ring-1 ring-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2"
    :style="{
      boxShadow: hovered
        ? `0 0 0 2px ${line.color}60, 0 8px 32px 0 ${line.color}20`
        : `inset 0 1px 0 0 ${line.color}10`,
    }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @click="$emit('open', line.id)"
  >
    <!-- Subtle color wash on hover -->
    <div
      class="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
      :style="{ background: `radial-gradient(ellipse at top left, ${line.color}0a 0%, transparent 65%)`, opacity: hovered ? 1 : 0 }"
    />

    <!-- Header -->
    <div class="relative flex items-start justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div
          class="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full shadow-sm"
          :style="{ backgroundColor: line.color, boxShadow: `0 0 7px 2px ${line.color}55` }"
        />
        <div>
          <h3 class="text-sm font-semibold text-white leading-tight">{{ line.name }}</h3>
          <p class="mt-0.5 text-[11px] text-gray-500 leading-tight">{{ line.description }}</p>
        </div>
      </div>
      <ChevronRight
        :size="14"
        class="mt-1 flex-shrink-0 text-gray-600 transition-transform"
        :class="hovered ? 'translate-x-0.5 text-gray-400' : ''"
      />
    </div>

    <!-- On-time % -->
    <div class="relative mt-4">
      <div class="flex items-baseline justify-between mb-1.5">
        <span class="section-label">On Time</span>
        <span
          class="text-2xl font-bold tabular-nums leading-none"
          :style="{ color: line.color }"
        >{{ displayPct.toFixed(1) }}<span class="text-base font-medium text-gray-500">%</span></span>
      </div>
      <HpBar :value="displayPct" :color="line.color" size="md" />
    </div>

    <!-- Sparkline -->
    <div v-if="displayTrend.length > 1" class="relative mt-2 opacity-50">
      <MiniSparkline
        :data="displayTrend.map(p => p.onTimePct)"
        :color="line.color"
        style="width: 100%; height: 22px;"
      />
    </div>
    <p v-if="period === '7d'" class="relative mt-1 text-[10px] text-gray-600">
      {{ weekLabel }}
    </p>

    <!-- Fleet -->
    <div class="relative mt-4 flex-1 border-t border-white/5 pt-4">
      <span class="section-label mb-2 block">Fleet</span>
      <FleetDisplay :fleet="line.fleet" :color="line.color" compact />
    </div>

    <!-- Ridership -->
    <div class="relative mt-4 border-t border-white/5 pt-3">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-1.5">
          <Users :size="11" class="text-gray-600 flex-shrink-0" />
          <span class="section-label">Ridership</span>
        </div>
        <span v-if="line.ridershipYoY !== null" class="flex items-center gap-0.5">
          <span
            class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            :class="line.ridershipYoY >= 0
              ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
              : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'"
          >
            {{ line.ridershipYoY >= 0 ? '↑' : '↓' }}{{ Math.abs(line.ridershipYoY).toFixed(1) }}% YoY
          </span>
          <InfoTip v-if="yoyMonths.latest && yoyMonths.prev">
            Avg daily riders in <strong class="text-white">{{ yoyMonths.latest }}</strong>
            vs <strong class="text-white">{{ yoyMonths.prev }}</strong>.<br><br>
            Daily averages are used rather than monthly totals to handle partial months
            at the edges of available data. Portal data lags by ~2 months.
          </InfoTip>
        </span>
      </div>
      <div v-if="line.ridershipWeekdayAvg > 0" class="flex gap-4 text-xs">
        <div>
          <span class="text-gray-600">Weekday </span>
          <span class="font-mono text-gray-200">{{ formatK(line.ridershipWeekdayAvg) }}</span>
        </div>
        <div>
          <span class="text-gray-600">Weekend </span>
          <span class="font-mono text-gray-200">{{ formatK(line.ridershipWeekendAvg) }}</span>
        </div>
      </div>
      <p v-else class="text-xs text-gray-600">No ridership data yet</p>
      <p class="mt-1 text-[10px] text-gray-700">
        Avg daily · portal data{{ ridershipDate ? ` through ${fmtDate(ridershipDate)}` : '' }}
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronRight, Users } from 'lucide-vue-next';
import { formatK, lastFullWeekLabel } from '@/utils/format';
import type { LineSummary, LineId, TimePeriod, TrendPoint } from '@/types';
import HpBar from './HpBar.vue';
import MiniSparkline from './MiniSparkline.vue';
import FleetDisplay from './FleetDisplay.vue';
import InfoTip from './InfoTip.vue';

const props = defineProps<{ line: LineSummary; period: TimePeriod; ridershipDate: string | null }>();
defineEmits<{ (e: 'open', id: LineId): void }>();

const hovered = ref(false);

const yoyMonths = computed(() => {
  const monthly = props.line.ridershipMonthly;
  if (!monthly.length) return { latest: null, prev: null };
  const last = monthly[monthly.length - 1].month;
  const fmt = (ym: string) =>
    new Date(ym + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const [yr, mo] = last.split('-');
  return { latest: fmt(last), prev: fmt(`${parseInt(yr) - 1}-${mo}`) };
});

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


const displayPct = computed((): number => {
  switch (props.period) {
    case '6h':  return props.line.onTimePct6h;
    case '7d':  return props.line.onTimePct7d;
    case '30d': return props.line.onTimePct30d;
    default:    return props.line.onTimePct24h;
  }
});

const weekLabel = computed(() => lastFullWeekLabel());

const displayTrend = computed((): TrendPoint[] => {
  const now = Date.now();
  switch (props.period) {
    case '6h':
      return props.line.onTimeTrend24h.filter(
        p => new Date(p.bucket).getTime() >= now - 21_600_000
      );
    case '7d':
      return props.line.onTimeTrend7d;
    case '30d':
      return props.line.onTimeTrend30d;
    default:
      return props.line.onTimeTrend24h;
  }
});
</script>
