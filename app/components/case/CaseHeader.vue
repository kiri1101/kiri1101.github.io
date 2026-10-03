<script setup lang="ts">
import type { Project } from '~~/content/types'
defineProps<{ project: Project }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section class="blueprint bg-paper">
    <div class="mx-auto flex max-w-[1240px] flex-wrap items-start gap-14 px-5 pb-12 pt-12 md:px-8 md:pb-14 md:pt-[72px]">
      <div class="min-w-0 flex-[7_1_520px]">
        <p class="mb-6 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[1.5px] text-accent md:text-[13px]">
          <span class="inline-block h-0.5 w-7 bg-accent" aria-hidden="true" />{{ t('case.eyebrow', { number: project.number }) }} · {{ l(project.sector) }}
        </p>
        <h1 class="mb-6 text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.035em] md:text-[4.75rem]">{{ l(project.title) }}</h1>
        <p class="mb-7 max-w-[640px] text-lg leading-relaxed text-body md:text-[21px]">{{ l(project.summary) }}</p>
        <div class="flex flex-wrap gap-2">
          <Badge v-for="(badge, i) in project.badges" :key="i" :tone="badge.tone" :label="l(badge.label)" />
        </div>
      </div>
      <aside :aria-label="t('case.factsTitle')" class="min-w-0 flex-[5_1_340px] overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgb(19_32_58/0.06),0_16px_40px_rgb(19_32_58/0.08)]">
        <p class="m-0 bg-ink px-6 py-3.5 font-mono text-xs uppercase tracking-[1.5px] text-white">{{ t('case.factsTitle') }}</p>
        <dl class="m-0 px-6 py-1.5">
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.role') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ l(project.role) }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.period') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ l(project.period) }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.organisation') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ l(project.organisation) }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 py-3.5" :class="project.links.length ? 'border-b border-grid' : ''">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.stack') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ project.stack.join(' · ') }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.links') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-bold">
              <template v-if="project.links.length">
                <a v-for="link in project.links" :key="link.url" :href="link.url" target="_blank" rel="noopener" class="block break-all no-underline">{{ link.label }} ↗</a>
              </template>
              <span v-else class="font-semibold text-muted">{{ t('projects.privateCode') }}</span>
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
</template>
