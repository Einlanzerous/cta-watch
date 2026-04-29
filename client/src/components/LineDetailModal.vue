<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-gray-950/85 backdrop-blur-sm"
          @click="$emit('close')"
        />

        <!-- Modal panel -->
        <div class="relative mx-auto my-8 max-w-4xl px-4 pb-8">
          <div class="overflow-hidden rounded-2xl bg-gray-900 ring-1 ring-white/10 shadow-2xl">

            <!-- Loading state -->
            <div v-if="loading" class="flex h-64 items-center justify-center">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-white/60" />
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="flex h-48 flex-col items-center justify-center gap-3 text-gray-400">
              <AlertCircle :size="24" class="text-red-400" />
              <p class="text-sm">{{ error }}</p>
              <button
                class="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
                @click="retry"
              >Retry</button>
            </div>

            <template v-else-if="detail">
              <!-- Header -->
              <div
                class="flex items-center justify-between border-b border-white/10 px-6 py-4"
                :style="{ borderLeftColor: detail.color, borderLeftWidth: '4px' }"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="h-4 w-4 rounded-full shadow"
                    :style="{ backgroundColor: detail.color, boxShadow: `0 0 8px 2px ${detail.color}60` }"
                  />
                  <div>
                    <h2 class="text-lg font-semibold text-white">{{ detail.name }}</h2>
                    <p class="text-xs text-gray-500">{{ detail.description }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <PeriodSelector v-model="period" />
                  <div class="text-right">
                    <p class="section-label">On Time</p>
                    <p class="text-2xl font-bold tabular-nums" :style="{ color: detail.color }">
                      {{ displayPct.toFixed(1) }}%
                    </p>
                  </div>
                  <button
                    class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    @click="$emit('close')"
                    aria-label="Close"
                  >
                    <X :size="16" />
                  </button>
                </div>
              </div>

              <!-- Tab bar -->
              <div class="flex border-b border-white/5 px-6">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                  :class="activeTab === tab.id
                    ? 'border-current text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'"
                  :style="activeTab === tab.id ? { color: detail.color, borderColor: detail.color } : {}"
                  @click="activeTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>

              <!-- Content -->
              <div class="px-6 py-6">

                <!-- Overview tab -->
                <div v-if="activeTab === 'overview'" class="space-y-6">
                  <div>
                    <p class="section-label mb-3">{{ trendLabel }}</p>
                    <TrendChart
                      :data="displayTrend"
                      :color="detail.color"
                      :height="150"
                    />
                  </div>

                  <!-- Quick stats -->
                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div class="rounded-xl bg-gray-800/40 p-4 ring-1 ring-white/5">
                      <p class="section-label mb-1">Fleet Size</p>
                      <p class="text-xl font-semibold text-white tabular-nums">
                        {{ detail.fleet.reduce((s, f) => s + f.carCount, 0) }} cars
                      </p>
                    </div>
                    <div class="rounded-xl bg-gray-800/40 p-4 ring-1 ring-white/5">
                      <p class="section-label mb-1">Stations</p>
                      <p class="text-xl font-semibold text-white tabular-nums">
                        {{ detail.stations.length }}
                      </p>
                    </div>
                    <div v-if="detail.ridershipYoY !== null" class="rounded-xl bg-gray-800/40 p-4 ring-1 ring-white/5">
                      <p class="section-label mb-1">Ridership YoY</p>
                      <p
                        class="text-xl font-semibold tabular-nums"
                        :class="detail.ridershipYoY >= 0 ? 'text-emerald-400' : 'text-red-400'"
                      >
                        {{ detail.ridershipYoY >= 0 ? '+' : '' }}{{ detail.ridershipYoY.toFixed(1) }}%
                      </p>
                    </div>
                  </div>

                  <!-- Monthly ridership chart -->
                  <div v-if="detail.ridershipMonthly.length > 0">
                    <div class="flex items-baseline justify-between mb-3">
                      <p class="section-label">Monthly Ridership</p>
                      <span class="text-[10px] text-gray-600">Portal data — ~2 month lag</span>
                    </div>
                    <RidershipMonthly
                      :data="detail.ridershipMonthly"
                      :color="detail.color"
                      :yoy="detail.ridershipYoY"
                    />
                  </div>

                  <!-- Weekday / Weekend breakdown -->
                  <div v-if="detail.ridershipWeekdayAvg > 0">
                    <p class="section-label mb-3">Avg Daily Riders by Day Type</p>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="rounded-xl bg-gray-800/40 p-4 ring-1 ring-white/5">
                        <p class="section-label mb-1">Weekday</p>
                        <p class="text-xl font-semibold text-white tabular-nums">
                          {{ detail.ridershipWeekdayAvg.toLocaleString() }}
                        </p>
                        <p class="mt-0.5 text-[10px] text-gray-600">Mon – Fri</p>
                      </div>
                      <div class="rounded-xl bg-gray-800/40 p-4 ring-1 ring-white/5">
                        <p class="section-label mb-1">Weekend</p>
                        <p class="text-xl font-semibold text-white tabular-nums">
                          {{ detail.ridershipWeekendAvg.toLocaleString() }}
                        </p>
                        <p class="mt-0.5 text-[10px] text-gray-600">Sat – Sun</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Fleet tab -->
                <div v-else-if="activeTab === 'fleet'" class="space-y-5">
                  <!-- Upgrade notice -->
                  <UpgradeProgress
                    v-if="upgradeEntry"
                    :upgrading-from="upgradeEntry.upgradingFrom"
                    :upgrading-to="upgradeEntry.upgradingTo"
                    :upgrade-pct="upgradeEntry.upgradePct"
                    :color="detail.color"
                  />

                  <!-- Series cards -->
                  <div class="space-y-4">
                    <div
                      v-for="f in detail.fleet"
                      :key="f.series"
                      class="rounded-xl bg-gray-800/40 p-4 ring-1 ring-white/5"
                    >
                      <div class="flex items-start gap-4">
                        <SeriesIcon :series="f.series" :color="detail.color" class="mt-0.5" />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-baseline justify-between gap-3 mb-2">
                            <h4 class="font-semibold text-white">{{ f.series }}-Series</h4>
                            <span class="font-mono text-sm text-gray-400">{{ f.carCount.toLocaleString() }} cars</span>
                          </div>
                          <HpBar :value="f.barPct" :color="detail.color" size="sm" />
                          <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                            <div>
                              <span class="text-gray-600">Builder</span>
                              <p class="text-gray-300 mt-0.5">{{ f.seriesInfo.builder }}</p>
                            </div>
                            <div>
                              <span class="text-gray-600">Origin</span>
                              <p class="text-gray-300 mt-0.5">{{ f.seriesInfo.originCountry }}</p>
                            </div>
                            <div>
                              <span class="text-gray-600">Introduced</span>
                              <p class="text-gray-300 mt-0.5">
                                {{ f.seriesInfo.yearIntroduced }}
                                <span v-if="f.seriesInfo.yearRetired" class="text-gray-500">
                                  – {{ f.seriesInfo.yearRetired }}
                                </span>
                              </p>
                            </div>
                          </div>
                          <p v-if="f.seriesInfo.notes" class="mt-2 text-[11px] text-gray-600 leading-relaxed">
                            {{ f.seriesInfo.notes }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Stations tab -->
                <div v-else-if="activeTab === 'stations'">
                  <StationList :stations="detail.stations" :color="detail.color" />
                </div>

              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, AlertCircle } from 'lucide-vue-next';
import type { LineId, LineDetail, TimePeriod, TrendPoint } from '@/types';
import { lastFullWeekLabel } from '@/utils/format';
import { useLineDetail } from '@/composables/useLineDetail';
import TrendChart from './TrendChart.vue';
import HpBar from './HpBar.vue';
import SeriesIcon from './SeriesIcon.vue';
import UpgradeProgress from './UpgradeProgress.vue';
import StationList from './StationList.vue';
import RidershipMonthly from './RidershipMonthly.vue';
import PeriodSelector from './PeriodSelector.vue';

const props = defineProps<{
  show: boolean;
  lineId: LineId | null;
  initialPeriod?: TimePeriod;
}>();

defineEmits<{ (e: 'close'): void }>();

const { detail, loading, error, fetchDetail } = useLineDetail();
const activeTab = ref<'overview' | 'fleet' | 'stations'>('overview');
const period = ref<TimePeriod>(props.initialPeriod ?? '24h');

const tabs = [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'fleet' as const, label: 'Fleet' },
  { id: 'stations' as const, label: 'Stations' },
];

const displayPct = computed((): number => {
  if (!detail.value) return 0;
  const d = detail.value;
  switch (period.value) {
    case '6h':  return d.onTimePct6h;
    case '7d':  return d.onTimePct7d;
    case '30d': return d.onTimePct30d;
    default:    return d.onTimePct24h;
  }
});

const displayTrend = computed((): TrendPoint[] => {
  if (!detail.value) return [];
  const d = detail.value;
  const now = Date.now();
  switch (period.value) {
    case '6h':  return d.onTimeTrend24h.filter(p => new Date(p.bucket).getTime() >= now - 21_600_000);
    case '7d':  return d.onTimeTrend7d;
    case '30d': return d.onTimeTrend30d;
    default:    return d.onTimeTrend24h;
  }
});

const trendLabel = computed(() => ({
  '6h':  'Last 6 Hours — On-Time Trend',
  '24h': 'Last 24 Hours — On-Time Trend',
  '7d':  `${lastFullWeekLabel()} — On-Time Trend`,
  '30d': '30-Day On-Time Trend',
}[period.value]));


const upgradeEntry = computed(() => {
  const incoming = detail.value?.fleet.find(f => f.upgradingFrom !== null && f.upgradePct > 0);
  if (!incoming) return null;
  return {
    upgradingFrom: incoming.upgradingFrom!,
    upgradingTo:   incoming.series,
    upgradePct:    incoming.upgradePct,
  };
});

watch(
  () => props.lineId,
  id => {
    if (id) {
      activeTab.value = 'overview';
      period.value = props.initialPeriod ?? '24h';
      fetchDetail(id);
    }
  },
  { immediate: true }
);

function retry() {
  if (props.lineId) fetchDetail(props.lineId);
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
