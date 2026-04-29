<template>
  <header class="sticky top-0 z-40 border-b border-white/5 bg-gray-950/90 backdrop-blur-md">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-14 items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-2.5">
          <div class="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
            <Train :size="14" class="text-white" />
          </div>
          <AnimatedTitle class="text-base" />
        </div>

        <!-- Status indicators -->
        <div class="flex items-center gap-4 text-sm text-gray-400">
          <span
            v-if="mockMode"
            class="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-400/20"
          >
            Mock Mode
          </span>
          <span class="hidden text-xs sm:block">
            Updated {{ formattedTime }}
          </span>
          <div
            class="h-2 w-2 rounded-full transition-colors"
            :class="isStale ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_6px_1px_#10b98150]'"
            :title="isStale ? 'Data may be stale' : 'Live'"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Train } from 'lucide-vue-next';
import AnimatedTitle from './AnimatedTitle.vue';

const props = defineProps<{
  updatedAt: string;
  mockMode: boolean;
}>();

const formattedTime = computed(() => {
  if (!props.updatedAt) return '—';
  return new Date(props.updatedAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
});

const isStale = computed(() => {
  if (!props.updatedAt) return false;
  return Date.now() - new Date(props.updatedAt).getTime() > 90_000; // > 90s
});
</script>
