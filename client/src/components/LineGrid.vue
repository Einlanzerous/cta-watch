<template>
  <!-- Skeleton loading -->
  <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <div
      v-for="n in 8"
      :key="n"
      class="h-72 animate-pulse rounded-2xl bg-gray-900 ring-1 ring-white/5"
    />
  </div>

  <!-- Error -->
  <div v-else-if="error" class="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
    <AlertCircle :size="28" class="text-red-400" />
    <p class="text-sm">{{ error }}</p>
    <button
      class="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
      @click="$emit('refresh')"
    >Retry</button>
  </div>

  <!-- Grid -->
  <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <LineCard
      v-for="line in lines"
      :key="line.id"
      :line="line"
      :period="period"
      :ridership-date="ridershipDate"
      @open="$emit('openLine', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';
import type { LineSummary, LineId, TimePeriod } from '@/types';
import LineCard from './LineCard.vue';

defineProps<{
  lines: LineSummary[];
  loading: boolean;
  error: string | null;
  period: TimePeriod;
  ridershipDate: string | null;
}>();

defineEmits<{
  (e: 'openLine', id: LineId): void;
  (e: 'refresh'): void;
}>();
</script>
