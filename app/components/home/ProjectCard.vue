<script setup lang="ts">
import type { Project } from '~~/content/types'
const props = withDefaults(defineProps<{ project: Project; featured?: boolean }>(), { featured: false })
const { t, locale } = useI18n()
const l = useLocalized()
const localePath = useLocalePath()
const caseLink = computed(() => localePath({ name: 'projets-slug', params: { slug: props.project.slug } }))
const externalLink = computed(() => props.project.links.find(link => link.kind !== 'code'))
const colon = computed(() => (locale.value === 'fr' ? ' :' : ':'))
</script>

<template>
  <article
    class="flex min-w-0 flex-col overflow-hidden border border-line bg-surface"
    :class="featured ? 'rounded-2xl shadow-[0_1px_2px_rgb(19_32_58/0.05),0_12px_32px_rgb(19_32_58/0.06)]' : 'rounded-[14px]'"
  >
    <template v-if="featured">
      <div v-if="project.image.kind === 'screenshot'" class="bg-tint px-4 pt-4 md:px-5 md:pt-5">
        <BrowserFrame
          :src="project.image.src" :alt="l(project.image.alt)" :url-label="project.links[0]?.label ?? ''"
          :position="project.image.position" height="250px" eager
        />
      </div>
      <KioskSchematic v-else-if="project.image.kind === 'kiosk'" />
    </template>
    <img
      v-else-if="project.image.kind === 'screenshot'" :src="project.image.src" :alt="l(project.image.alt)"
      width="1440" height="900" loading="lazy" decoding="async"
      class="block h-[150px] w-full border-b border-line object-cover" :style="{ objectPosition: project.image.position }"
    >
    <div class="flex flex-1 flex-col gap-3.5" :class="featured ? 'p-6 md:px-8 md:pb-8 md:pt-7' : 'p-6 md:p-7'">
      <div class="flex flex-wrap items-center gap-2">
        <span class="flex-1 font-mono text-[11px] uppercase tracking-[1.2px] text-accent md:text-xs">{{ l(project.sector) }}</span>
        <span v-if="!featured" class="font-mono text-[11px] text-muted">№ {{ project.number }}</span>
      </div>
      <div v-if="featured" class="flex flex-wrap gap-2">
        <Badge v-for="(badge, i) in project.badges" :key="i" :tone="badge.tone" :label="l(badge.label)" />
      </div>
      <h3 class="m-0 font-extrabold tracking-[-0.02em]" :class="featured ? 'text-[1.6rem] md:text-[1.9rem]' : 'text-[1.35rem]'">{{ l(project.title) }}</h3>
      <p class="m-0 leading-relaxed text-body" :class="featured ? 'text-base' : 'text-[15px]'">{{ l(project.summary) }}</p>
      <div v-if="!featured" class="flex flex-wrap gap-2">
        <Badge v-for="(badge, i) in project.badges" :key="i" :tone="badge.tone" :label="l(badge.label)" />
      </div>
      <template v-if="featured">
        <p class="m-0 text-sm text-body"><strong class="text-ink">{{ t('projects.role') }}{{ colon }}</strong> {{ l(project.role).toLowerCase() }}</p>
        <div class="flex flex-wrap gap-2">
          <StackPill v-for="tech in project.stack" :key="tech" :label="tech" />
        </div>
      </template>
      <p v-else class="m-0 font-mono text-xs text-muted">{{ l(project.role) }} · {{ project.stack.slice(0, 3).join(' · ') }}</p>
      <div class="mt-auto flex flex-wrap gap-x-7 gap-y-2 pt-2 text-[15px] font-bold">
        <NuxtLink :to="caseLink" class="no-underline">{{ featured ? t('projects.readCase') : t('projects.caseShort') }} →</NuxtLink>
        <a v-if="featured && externalLink" :href="externalLink.url" target="_blank" rel="noopener" class="text-body no-underline">{{ externalLink.label }} ↗</a>
      </div>
    </div>
  </article>
</template>
