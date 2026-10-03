<script setup lang="ts">
import type { EducationItem } from '~~/content/types'
defineProps<{ items: EducationItem[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <div class="min-w-0">
    <SectionHeading number="06" :title="t('education.title')" />
    <ul class="m-0 mt-7 list-none p-0">
      <li v-for="(item, i) in items" :key="i" class="border-b border-grid pb-5 pt-5 first:pt-0 last:border-0">
        <div class="flex flex-wrap justify-between gap-3">
          <h3 class="text-[17px] font-bold">{{ l(item.title) }}</h3>
          <span class="font-mono text-[13px] text-accent">{{ item.year }}</span>
        </div>
        <p class="mt-1.5 text-sm leading-relaxed text-body">{{ l(item.school) }}</p>
        <div v-if="item.badges.length" class="mt-2.5 flex flex-wrap gap-2">
          <Badge v-for="(badge, j) in item.badges" :key="j" :tone="badge.tone" :label="l(badge.label)" />
        </div>
      </li>
    </ul>
  </div>
</template>
