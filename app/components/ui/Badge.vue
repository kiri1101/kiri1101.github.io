<script setup lang="ts">
import type { BadgeTone } from '~~/content/types'
defineProps<{ tone: BadgeTone; label: string }>()
</script>

<template>
  <span
    v-if="tone === 'live'"
    class="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 font-mono text-xs text-white"
  >
    <span class="inline-block size-1.5 rounded-full bg-signal" aria-hidden="true" />{{ label }}
  </span>
  <span v-else-if="tone === 'proof'" class="inline-flex rounded-full bg-accent-soft px-2.5 py-1 font-mono text-xs font-bold text-accent">
    {{ label }}
  </span>
  <span v-else class="inline-flex rounded-full border border-line px-2.5 py-1 font-mono text-xs text-body">{{ label }}</span>
</template>
