<template>
  <div class="rounded-lg bg-gray-800/60 p-3 ring-1 ring-white/5">
    <div class="mb-2 flex items-center justify-between text-xs">
      <span class="font-medium text-gray-300">
        Upgrading
        <span class="font-mono" :style="{ color }">{{ upgradingFrom }}</span>
        →
        <span class="font-mono" :style="{ color }">{{ upgradingTo }}</span>
        Series
      </span>
      <span class="font-semibold" :style="{ color }">{{ Math.round(upgradePct) }}%</span>
    </div>
    <div class="relative h-2 overflow-hidden rounded-full bg-gray-700">
      <div
        class="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        :style="{
          width: `${upgradePct}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: `0 0 8px 1px ${color}50`,
        }"
      />
    </div>
    <p class="mt-1.5 text-[11px] text-gray-500">
      {{ Math.round(upgradePct) }}% of {{ upgradingFrom }}-series cars replaced
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  upgradingFrom: number;
  upgradingTo: number;
  upgradePct: number;
  color: string;
}>();
</script>
