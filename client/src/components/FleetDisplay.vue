<template>
  <div class="space-y-3">
    <div
      v-for="entry in fleet.series"
      :key="entry.series"
      class="flex items-start gap-3"
    >
      <SeriesIcon :series="entry.series" :color="color" :size="compact ? 'sm' : 'md'" />

      <div class="min-w-0 flex-1">
        <div class="mb-1 flex items-baseline justify-between gap-2">
          <span class="text-xs font-medium text-gray-300">{{ entry.series }}-series</span>
          <span class="flex-shrink-0 font-mono text-xs text-gray-400">
            {{ entry.carCount.toLocaleString() }} cars
          </span>
        </div>

        <HpBar
          :value="compact ? entry.barPct : entry.carCount"
          :max="compact ? 100 : maxCars"
          :color="color"
          size="sm"
        />

        <div class="mt-1 flex items-center gap-2">
          <span class="text-[11px] text-gray-600">{{ entry.builder }}</span>
          <span class="text-[11px] text-gray-700">·</span>
          <span class="text-[11px] text-gray-600">{{ entry.yearIntroduced }}</span>
          <span
            v-if="entry.isUpgrading && entry.upgradePct > 0"
            class="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1"
            :style="{ color: color, backgroundColor: `${color}15`, ringColor: `${color}30` }"
            style="outline: none;"
          >
            ▲{{ Math.round(entry.upgradePct) }}%
          </span>
          <span
            v-else-if="entry.isUpgrading"
            class="ml-auto text-[10px] text-gray-500"
          >
            retiring
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FleetSummary } from '@/types';
import SeriesIcon from './SeriesIcon.vue';
import HpBar from './HpBar.vue';

const props = withDefaults(defineProps<{
  fleet: FleetSummary;
  color: string;
  compact?: boolean;
}>(), { compact: false });

const maxCars = computed(() =>
  props.fleet.series.reduce((m, s) => Math.max(m, s.carCount), 1)
);
</script>
