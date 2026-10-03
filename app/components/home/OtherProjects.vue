<script setup lang="ts">
import type { OtherProject } from '~~/content/types'
defineProps<{ items: OtherProject[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <div class="min-w-0">
    <SectionHeading number="05" :title="t('other.title')" />
    <ul class="m-0 mt-7 grid list-none gap-4 p-0 sm:grid-cols-2">
      <li v-for="(item, i) in items" :key="i" class="rounded-xl border border-line bg-paper p-5">
        <h3 class="mb-1.5 text-base font-bold">{{ l(item.title) }}</h3>
        <p class="m-0 text-sm leading-relaxed text-body">{{ l(item.description) }}</p>
        <a v-if="item.link" :href="item.link.url" target="_blank" rel="noopener" class="mt-2.5 inline-block text-sm font-bold no-underline">{{ t('other.code') }} ↗</a>
      </li>
    </ul>
  </div>
</template>
