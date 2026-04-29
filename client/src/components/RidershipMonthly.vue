<template>
  <div>
    <!-- Bar chart -->
    <svg viewBox="0 0 300 56" width="100%" height="56" preserveAspectRatio="none" aria-label="Monthly ridership">
      <rect
        v-for="(bar, i) in bars"
        :key="i"
        :x="bar.x"
        :y="bar.y"
        :width="barW - 1"
        :height="bar.h"
        :fill="i === bars.length - 1 ? color : `${color}55`"
        rx="1.5"
      />
      <!-- Zero line -->
      <line x1="0" :y1="chartH" x2="300" :y2="chartH" stroke="#374151" stroke-width="0.5"/>
    </svg>

    <!-- Month labels — show every other; always show first, last, and year boundaries -->
    <div class="flex justify-between mt-1 px-px">
      <span
        v-for="(bar, i) in bars"
        :key="i"
        class="text-[9px] leading-none"
        :class="i === bars.length - 1 ? 'font-semibold' : 'text-gray-600'"
        :style="i === bars.length - 1 ? { color } : {}"
      >{{ bar.visibleLabel }}</span>
    </div>

    <!-- YoY callout -->
    <div v-if="yoy !== null" class="mt-2 flex items-center gap-1.5 text-xs">
      <span
        class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold text-[11px]"
        :class="yoy >= 0
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
          : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'"
      >
        {{ yoy >= 0 ? '↑' : '↓' }}{{ Math.abs(yoy).toFixed(1) }}%
      </span>
      <span class="text-gray-500">vs. same month last year</span>
      <InfoTip v-if="latestMonth && prevYearMonth">
        Comparing avg daily riders in <strong class="text-white">{{ latestMonth }}</strong>
        vs <strong class="text-white">{{ prevYearMonth }}</strong> (same calendar month, one year prior).<br><br>
        Daily averages are used rather than monthly totals to account for partial months at the
        edges of the available data window.<br><br>
        Portal data has a ~2 month lag — the most recent month shown is not the current month.
      </InfoTip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MonthlyRidership } from '@/types';
import InfoTip from './InfoTip.vue';

const props = defineProps<{
  data: MonthlyRidership[];
  color: string;
  yoy: number | null;
}>();

const W      = 300;
const chartH = 44;
const PAD    = 2;

const barW = computed(() => props.data.length > 0 ? (W / props.data.length) : W)

function fmtMonth(ym: string) {
  return new Date(ym + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const latestMonth   = computed(() => props.data.length ? fmtMonth(props.data[props.data.length - 1].month) : null);
const prevYearMonth = computed(() => {
  if (!props.data.length) return null;
  const [yr, mo] = props.data[props.data.length - 1].month.split('-');
  return fmtMonth(`${parseInt(yr) - 1}-${mo}`);
});;

const bars = computed(() => {
  if (!props.data.length) return [];
  const max = Math.max(...props.data.map(d => d.total), 1);
  const n = props.data.length;
  return props.data.map((d, i) => {
    const h = Math.max(2, ((d.total / max) * (chartH - PAD)));
    const date = new Date(d.month + '-15');
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
    const yr = `'${d.month.slice(2, 4)}`; // "'25"
    const isFirst = i === 0;
    const isLast  = i === n - 1;
    const isJan   = d.month.endsWith('-01');
    const showYear = isFirst || isLast || isJan;
    const label = showYear ? `${monthShort} ${yr}` : monthShort;
    // Show every other label, but always show first, last, and year-boundary months
    const visible = isFirst || isLast || isJan || i % 2 === 0;
    return {
      x: i * barW.value,
      y: chartH - h,
      h,
      label,
      visibleLabel: visible ? label : '',
    };
  });
});
</script>
