<template>
  <span class="relative inline-flex items-center group">
    <span
      class="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-700 text-[9px] font-bold text-gray-400 cursor-default select-none leading-none ring-1 ring-white/10 hover:bg-gray-600 hover:text-gray-200 transition-colors"
      aria-label="More information"
    >i</span>
    <span
      v-if="direction === 'down'"
      class="pointer-events-none absolute top-full z-50 mt-2 w-64 rounded-lg bg-gray-800 px-3 py-2.5 text-xs text-gray-300 shadow-xl ring-1 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      :class="align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'"
    >
      <slot />
      <span
        class="absolute bottom-full border-4 border-transparent border-b-gray-800"
        :class="align === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2'"
      />
    </span>
    <span
      v-else
      class="pointer-events-none absolute bottom-full z-50 mb-2 w-64 rounded-lg bg-gray-800 px-3 py-2.5 text-xs text-gray-300 shadow-xl ring-1 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      :class="align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'"
    >
      <slot />
      <span
        class="absolute top-full border-4 border-transparent border-t-gray-800"
        :class="align === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2'"
      />
    </span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ direction?: 'up' | 'down'; align?: 'center' | 'right' }>(), {
  direction: 'up',
  align: 'center',
});
</script>
