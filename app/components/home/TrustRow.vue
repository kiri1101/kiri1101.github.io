<script setup lang="ts">
import type { Localized } from '~~/content/types'
defineProps<{ items: Localized[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section :aria-label="t('trust.label')" class="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-9 md:px-8">
    <span class="font-mono text-xs uppercase tracking-[1.5px] text-muted">{{ t('trust.label') }}</span>
    <ul class="m-0 flex list-none flex-wrap items-center gap-x-7 gap-y-3 p-0 text-[15px] font-bold text-body md:text-base">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-7">
        <span v-if="i > 0" class="hidden size-[5px] bg-accent sm:inline-block" aria-hidden="true" />{{ l(item) }}
      </li>
    </ul>
  </section>
</template>
