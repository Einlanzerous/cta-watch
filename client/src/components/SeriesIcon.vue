<template>
  <component
    :is="wikiUrl ? 'a' : 'span'"
    v-bind="wikiUrl ? { href: wikiUrl, target: '_blank', rel: 'noopener noreferrer' } : {}"
    class="block flex-shrink-0"
    :class="wikiUrl ? 'hover:opacity-75 transition-opacity cursor-pointer' : ''"
    :title="`${series}-Series${wikiUrl ? ' — Wikipedia ↗' : ''}`"
    @click.stop
  >
    <svg
      :viewBox="`0 0 ${d.w} ${d.h}`"
      :width="d.w"
      :height="d.h"
      aria-hidden="true"
    >
      <!-- Car body -->
      <rect x="1" y="1" :width="d.w - 2" :height="d.bodyH" :rx="4"
            :fill="`${color}18`" :stroke="color" stroke-width="1.5"/>
      <!-- Window band -->
      <rect :x="6" y="5" :width="d.w - 12" :height="d.winH" rx="2"
            :fill="`${color}28`"/>
      <!-- Series number -->
      <text
        :x="d.w / 2"
        :y="5 + d.winH / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        :fill="color"
        :font-size="d.fs"
        font-weight="700"
        font-family="ui-monospace, JetBrains Mono, monospace"
        letter-spacing="0.5"
      >{{ series }}</text>
      <!-- Undercarriage beam -->
      <rect :x="8" :y="d.bodyH" :width="d.w - 16" height="3" rx="1"
            :fill="`${color}20`"/>
      <!-- Left wheel -->
      <circle :cx="13" :cy="d.h - 4" :r="d.wr"
              fill="none" :stroke="`${color}80`" stroke-width="1.5"/>
      <!-- Right wheel -->
      <circle :cx="d.w - 13" :cy="d.h - 4" :r="d.wr"
              fill="none" :stroke="`${color}80`" stroke-width="1.5"/>
    </svg>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SERIES_WIKI } from '@/constants/series';

const props = withDefaults(defineProps<{
  series: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}>(), { size: 'md' });

const DIMS = {
  sm: { w: 58,  h: 32, bodyH: 22, winH: 10, fs: 9,  wr: 3 },
  md: { w: 74,  h: 40, bodyH: 28, winH: 12, fs: 11, wr: 4 },
  lg: { w: 90,  h: 48, bodyH: 34, winH: 14, fs: 13, wr: 4.5 },
} as const;

const d = computed(() => DIMS[props.size]);
const wikiUrl = computed(() => SERIES_WIKI[props.series] ?? null);
</script>
