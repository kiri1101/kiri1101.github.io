<script setup lang="ts">
import type { ArchitectureLayer } from '~~/content/types'
defineProps<{ layers: ArchitectureLayer[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <figure class="blueprint-dark m-0 flex flex-col gap-2.5 rounded-[14px] bg-ink p-5 md:p-7">
    <figcaption class="mb-1.5 font-mono text-[11px] uppercase tracking-[1.2px] text-sky">{{ t('case.architectureFigure') }}</figcaption>
    <template v-for="(layer, i) in layers" :key="i">
      <div v-if="i > 0" class="text-center text-sm leading-none text-sky" aria-hidden="true">↓</div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] border-[1.5px] border-sky bg-white/5 px-5 py-4">
        <span class="w-[120px] shrink-0 font-mono text-xs uppercase text-sky">{{ l(layer.label) }}</span>
        <span class="min-w-[220px] flex-1 text-[15px] font-semibold text-white">{{ l(layer.description) }}</span>
      </div>
    </template>
  </figure>
</template>
