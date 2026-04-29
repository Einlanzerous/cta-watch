<template>
  <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`">
    <path v-if="linePath" :d="linePath" fill="none" :stroke="color" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.7" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: number[];
  color: string;
}>();

const W = 56;
const H = 20;

const linePath = computed(() => {
  const d = props.data;
  if (d.length < 2) return '';
  const min = Math.min(...d);
  const max = Math.max(...d);
  const range = max - min || 1;
  const pad = 2;
  return d
    .map((v, i) => {
      const x = pad + (i / (d.length - 1)) * (W - 2 * pad);
      const y = H - pad - ((v - min) / range) * (H - 2 * pad);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
});
</script>
