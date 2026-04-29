<template>
  <!--
    "CTA Watch" animates into "WCTAh" on first load.

    Initial char positions (1ch each, monospace):
      C=0  T=1  A=2  ' '=3  W=4  a=5  t=6  c=7  h=8

    Final positions in "WCTAh":
      W=0  C=1  T=2  A=3  h=4
  -->
  <div
    class="relative inline-block font-mono font-bold text-white select-none"
    style="height: 1.2em;"
    :style="{
      width: started ? '5ch' : '9ch',
      transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1) 0.15s',
    }"
    aria-label="CTA Watch"
  >
    <span
      v-for="char in chars"
      :key="char.id"
      class="absolute top-0"
      :style="{
        left: `${started ? char.fx : char.ix}ch`,
        opacity: started ? char.fo : 1,
        transition: [
          `left ${char.dur} cubic-bezier(0.4, 0, 0.2, 1) ${char.delay}`,
          `opacity ${char.odur} ease ${char.delay}`,
        ].join(', '),
      }"
    >{{ char.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const started = ref(false);

/**
 * Each entry describes one character's position and visibility in both states.
 *
 * ix / fx  — initial / final X position in `ch` units
 * fo       — final opacity (1 = visible, 0 = fades out)
 * dur      — position transition duration
 * odur     — opacity transition duration
 * delay    — animation start delay (staggered for CTA letters)
 */
const chars = [
  // W: from position 4ch → 0ch (slides left to front)
  { id: 'W',  ix: 4, fx: 0,   fo: 1, label: 'W', dur: '0.7s',  odur: '0.1s', delay: '0s'    },
  // C: from 0ch → 1ch (slides right into second slot)
  { id: 'C',  ix: 0, fx: 1,   fo: 1, label: 'C', dur: '0.65s', odur: '0.1s', delay: '0.05s' },
  // T: from 1ch → 2ch
  { id: 'T',  ix: 1, fx: 2,   fo: 1, label: 'T', dur: '0.65s', odur: '0.1s', delay: '0.1s'  },
  // A: from 2ch → 3ch
  { id: 'A',  ix: 2, fx: 3,   fo: 1, label: 'A', dur: '0.65s', odur: '0.1s', delay: '0.15s' },
  // space: fades out in place
  { id: 'sp', ix: 3, fx: 3,   fo: 0, label: ' ', dur: '0.1s',  odur: '0.2s', delay: '0s'    },
  // a, t, c: fade out (collapse toward center of where Watch was)
  { id: 'a',  ix: 5, fx: 4.5, fo: 0, label: 'a', dur: '0.4s',  odur: '0.3s', delay: '0s'    },
  { id: 't',  ix: 6, fx: 4.5, fo: 0, label: 't', dur: '0.4s',  odur: '0.3s', delay: '0.05s' },
  { id: 'c',  ix: 7, fx: 4.5, fo: 0, label: 'c', dur: '0.4s',  odur: '0.3s', delay: '0.1s'  },
  // h: from 8ch → 4ch (slides left to the final slot)
  { id: 'h',  ix: 8, fx: 4,   fo: 1, label: 'h', dur: '0.7s',  odur: '0.1s', delay: '0s'    },
] as const;

onMounted(() => {
  // Brief pause before the animation plays so the user reads "CTA Watch" first
  setTimeout(() => { started.value = true; }, 1400);
});
</script>
