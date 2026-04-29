<template>
  <div class="flex items-center gap-3">
    <span class="section-label hidden sm:block">Window</span>
    <div class="flex rounded-lg bg-gray-900 p-1 ring-1 ring-white/10">
      <button
        v-for="p in PERIODS"
        :key="p.value"
        class="rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150"
        :class="modelValue === p.value
          ? 'bg-gray-700 text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-300'"
        @click="$emit('update:modelValue', p.value)"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimePeriod } from '@/types';

defineProps<{ modelValue: TimePeriod }>();
defineEmits<{ (e: 'update:modelValue', v: TimePeriod): void }>();

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '6h',  label: '6H'  },
  { value: '24h', label: '24H' },
  { value: '7d',  label: '7D'  },
  { value: '30d', label: '30D' },
];
</script>
