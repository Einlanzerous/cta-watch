<template>
  <div>
    <!-- Search -->
    <div class="relative mb-3">
      <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        v-model="query"
        placeholder="Filter stations…"
        class="w-full rounded-lg bg-gray-800/60 py-2 pl-8 pr-3 text-sm text-gray-200 placeholder-gray-600 ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
      />
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl ring-1 ring-white/10">
      <table class="min-w-full divide-y divide-white/5 text-sm">
        <thead>
          <tr class="bg-gray-800/40">
            <th class="section-label py-2.5 pl-4 pr-3 text-left">Station</th>
            <th class="section-label py-2.5 px-3 text-right">Yesterday</th>
            <th class="section-label py-2.5 px-3 text-right">7-day avg</th>
            <th class="section-label py-2.5 pl-3 pr-4 text-right">
              <span class="inline-flex items-center gap-1">
                7-day trend
                <InfoTip direction="down" align="right">Last 7 available days of portal ridership data (oldest → newest, left to right). Portal data lags ~2 months.</InfoTip>
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 bg-gray-900/50">
          <tr
            v-for="station in filtered"
            :key="station.stationId"
            class="group transition-colors hover:bg-gray-800/40"
          >
            <td class="py-3 pl-4 pr-3 font-medium text-gray-200">
              {{ station.stationName }}
              <span
                v-if="station.ada"
                class="ml-1.5 text-xs text-blue-400"
                title="ADA Accessible"
              >♿</span>
            </td>
            <td class="py-3 px-3 text-right font-mono text-gray-300">
              {{ station.ridesToday > 0 ? station.ridesToday.toLocaleString() : '—' }}
            </td>
            <td class="py-3 px-3 text-right font-mono text-gray-500">
              {{ station.ridesWeeklyAvg > 0 ? station.ridesWeeklyAvg.toLocaleString() : '—' }}
            </td>
            <td class="py-3 pl-3 pr-4 w-20">
              <div class="flex justify-end">
                <MiniSparkline
                  v-if="station.ridership7d.length"
                  :data="station.ridership7d.slice().reverse().map(d => d.rides)"
                  :color="color"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="4" class="py-8 text-center text-sm text-gray-600">
              No stations found
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-2 text-right text-[11px] text-gray-600">
      {{ filtered.length }} station{{ filtered.length !== 1 ? 's' : '' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from 'lucide-vue-next';
import type { StationDetail } from '@/types';
import MiniSparkline from './MiniSparkline.vue';
import InfoTip from './InfoTip.vue';

const props = defineProps<{
  stations: StationDetail[];
  color: string;
}>();

const query = ref('');

const filtered = computed(() => {
  if (!query.value.trim()) return props.stations;
  const q = query.value.toLowerCase();
  return props.stations.filter(s => s.stationName.toLowerCase().includes(q));
});
</script>
