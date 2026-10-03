<script setup lang="ts">
import type { ExperienceItem, Localized } from '~~/content/types'
defineProps<{ items: ExperienceItem[]; distinction: Localized }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <div id="career" class="min-w-0">
    <SectionHeading number="03" :title="t('career.title')" />
    <ol class="m-0 mt-9 list-none p-0">
      <li v-for="(item, i) in items" :key="i" class="flex gap-5" :class="i < items.length - 1 ? 'pb-7' : ''">
        <div class="flex w-3.5 shrink-0 flex-col items-center" aria-hidden="true">
          <span class="mt-1 block size-3.5 rounded-full" :class="item.current ? 'bg-accent shadow-[0_0_0_4px_var(--color-accent-soft)]' : 'border-2 border-accent bg-surface'" />
          <span v-if="i < items.length - 1" class="mt-2 w-0.5 flex-1 bg-line" />
        </div>
        <div>
          <p class="mb-1.5 font-mono text-xs uppercase tracking-[1px] text-accent">{{ l(item.period) }}</p>
          <h3 class="text-[19px] font-bold">{{ l(item.role) }} · {{ item.company }}</h3>
          <p class="mt-1.5 text-[15px] leading-relaxed text-body">{{ l(item.text) }}</p>
        </div>
      </li>
    </ol>
    <div class="mt-9 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-6 py-5">
      <span class="rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] uppercase tracking-[1.2px] text-white">{{ t('career.distinction') }}</span>
      <span class="min-w-[260px] flex-1 text-[15px] font-semibold">{{ l(distinction) }}</span>
    </div>
  </div>
</template>
