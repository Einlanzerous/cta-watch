<template>
  <div
    class="relative overflow-hidden rounded-full bg-gray-800/80"
    :class="heightClass"
  >
    <div
      class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
      :style="{
        width: `${clampedPct}%`,
        backgroundColor: color,
        boxShadow: `0 0 ${glowPx}px 1px ${color}45`,
      }"
    />
    <span
      v-if="showLabel"
      class="absolute inset-0 flex items-center justify-end pr-2 font-mono text-[11px] font-semibold text-white/90"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number;
  max?: number;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}>(), {
  max: 100,
  size: 'sm',
  showLabel: false,
});

const clampedPct = computed(() =>
  Math.min(100, Math.max(0, (props.value / props.max) * 100))
);

const heightClass = computed(() => ({
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-5',
}[props.size]));

const glowPx = computed(() => ({ xs: 4, sm: 6, md: 8, lg: 12 }[props.size]));

const label = computed(() =>
  props.max === 100 ? `${Math.round(props.value)}%` : String(props.value)
);
</script>
