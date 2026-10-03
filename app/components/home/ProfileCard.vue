<script setup lang="ts">
import type { Profile } from '~~/content/types'
defineProps<{ profile: Profile }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <aside :aria-label="t('hero.profileTitle')" class="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgb(19_32_58/0.06),0_16px_40px_rgb(19_32_58/0.08)]">
    <div class="flex items-center justify-between bg-ink px-6 py-4 font-mono text-xs uppercase tracking-[1.5px] text-white">
      <span>{{ t('hero.profileTitle') }}</span><span class="text-sky">{{ t('hero.figure') }}</span>
    </div>
    <dl class="m-0 px-6 py-2">
      <div v-for="(fact, i) in profile.facts" :key="i" class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-4 last:border-0">
        <dt class="w-[140px] shrink-0 pt-0.5 font-mono text-xs uppercase text-muted">{{ l(fact.label) }}</dt>
        <dd class="m-0 min-w-[180px] flex-1 text-[15px] font-semibold">{{ l(fact.value) }}</dd>
      </div>
    </dl>
    <div class="flex flex-wrap gap-6 border-t border-grid bg-paper px-6 py-4 text-sm font-bold">
      <a :href="profile.linkedinUrl" target="_blank" rel="noopener" class="no-underline">LinkedIn ↗</a>
      <a :href="profile.githubUrl" target="_blank" rel="noopener" class="no-underline">GitHub ↗</a>
    </div>
  </aside>
</template>
