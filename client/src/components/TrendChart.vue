<template>
  <div class="w-full">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full overflow-visible"
      :height="height"
      aria-label="On-time percentage trend"
    >
      <!-- Grid lines -->
      <g>
        <line
          v-for="y in Y_TICKS"
          :key="`grid-${y}`"
          :x1="PAD.l"
          :y1="toY(y)"
          :x2="W - PAD.r"
          :y2="toY(y)"
          stroke="currentColor"
          stroke-width="1"
          class="text-gray-800"
        />
      </g>

      <!-- Area fill -->
      <defs>
        <linearGradient :id="`grad-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <path v-if="areaPath" :d="areaPath" :fill="`url(#grad-${uid})`" />

      <!-- Line -->
      <path
        v-if="linePath"
        :d="linePath"
        fill="none"
        :stroke="color"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Hover dot (last point) -->
      <circle
        v-if="pts.length"
        :cx="pts[pts.length - 1].x"
        :cy="pts[pts.length - 1].y"
        r="3"
        :fill="color"
        :stroke="color"
        stroke-width="2"
        class="opacity-80"
      />

      <!-- Y-axis labels -->
      <text
        v-for="y in Y_TICKS"
        :key="`yl-${y}`"
        :x="PAD.l - 6"
        :y="toY(y) + 4"
        text-anchor="end"
        class="fill-gray-600 text-[10px]"
        style="font-size: 10px;"
      >{{ y }}%</text>

      <!-- X-axis date labels (every 7th) -->
      <text
        v-for="p in xLabels"
        :key="`xl-${p.i}`"
        :x="p.x"
        :y="H.valueOf() - 2"
        text-anchor="middle"
        class="fill-gray-600"
        style="font-size: 10px;"
      >{{ p.label }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TrendPoint } from '@/types';

const props = withDefaults(defineProps<{
  data: TrendPoint[];
  color: string;
  height?: number;
}>(), { height: 140 });

const uid = ref(Math.random().toString(36).slice(2, 8));

const W = 600;
const PAD = { t: 16, r: 16, b: 28, l: 36 } as const;
const Y_MIN = 60;
const Y_MAX = 100;
const Y_TICKS = [70, 80, 90, 100] as const;

// Reactive derived dimensions — H depends on the `height` prop
const H = computed(() => props.height);
const CW = computed(() => W - PAD.l - PAD.r);
const CH = computed(() => H.value - PAD.t - PAD.b);

function toY(val: number) {
  return PAD.t + (1 - (val - Y_MIN) / (Y_MAX - Y_MIN)) * CH.value;
}

const pts = computed(() => {
  const n = props.data.length;
  if (n === 0) return [];
  return props.data.map((d, i) => ({
    x: PAD.l + (n === 1 ? CW.value / 2 : (i / (n - 1)) * CW.value),
    y: toY(Math.min(Y_MAX, Math.max(Y_MIN, d.onTimePct))),
  }));
});

const linePath = computed(() => {
  const p = pts.value;
  if (!p.length) return '';
  return p.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
});

const areaPath = computed(() => {
  const p = pts.value;
  if (!p.length) return '';
  const bottom = toY(Y_MIN);
  return `${linePath.value} L ${p[p.length - 1].x.toFixed(1)} ${bottom} L ${p[0].x.toFixed(1)} ${bottom} Z`;
});

const xLabels = computed(() => {
  const p = pts.value;
  const data = props.data;
  if (!p.length) return [];
  const step = Math.max(1, Math.floor(data.length / 6));
  return data
    .map((d, i) => ({ i, x: p[i].x, date: d.bucket }))
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map(item => ({
      i: item.i,
      x: item.x,
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
});
</script>
