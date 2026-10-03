<script setup lang="ts">
import type { QualityItem } from '~~/content/types'
defineProps<{ items: QualityItem[] }>()
const l = useLocalized()
</script>

<template>
  <dl class="m-0 grid gap-4 sm:grid-cols-3">
    <div v-for="(item, i) in items" :key="i" class="flex flex-col-reverse justify-end rounded-xl border border-line bg-surface p-5">
      <dt class="mt-1.5 font-mono text-[11px] uppercase tracking-[1px] text-accent">{{ l(item.label) }}</dt>
      <dd class="m-0 text-[2rem] font-extrabold tracking-[-0.03em]">{{ l(item.value) }}</dd>
    </div>
  </dl>
</template>
