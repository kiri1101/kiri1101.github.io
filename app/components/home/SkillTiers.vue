<script setup lang="ts">
import type { SkillTier } from '~~/content/types'
defineProps<{ tiers: SkillTier[] }>()
const { t } = useI18n()
const l = useLocalized()
const chip = {
  core: 'rounded-lg bg-ink px-3.5 py-2 text-sm font-bold text-white',
  also: 'rounded-lg border-[1.5px] border-ink bg-surface px-3 py-[7px] text-sm font-semibold',
} as const
</script>

<template>
  <div id="skills" class="min-w-0">
    <SectionHeading number="04" :title="t('skills.title')" />
    <div v-for="tier in tiers" :key="tier.id" class="mt-8 first-of-type:mt-9">
      <h3 class="mb-3.5 font-mono text-xs font-bold uppercase tracking-[1.2px] text-accent">{{ l(tier.title) }}</h3>
      <p v-if="tier.id === 'notions'" class="text-[15px] text-muted">{{ tier.items.map(i => l(i)).join(' · ') }}</p>
      <ul v-else class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-for="(item, i) in tier.items" :key="i" :class="chip[tier.id]">{{ l(item) }}</li>
      </ul>
    </div>
  </div>
</template>
