<script setup lang="ts">
import { getProject, neighbours } from '~~/content/projects'

const route = useRoute()
const { t, locale } = useI18n()
const l = useLocalized()
const site = useRuntimeConfig().public.siteUrl

const project = getProject(String(route.params.slug))
if (!project) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
const around = neighbours(project.slug)
const prev = getProject(around.prev)!
const next = getProject(around.next)!

const sections = computed(() => [
  { id: 'context', label: t('case.context') },
  { id: 'contribution', label: t('case.contribution') },
  { id: 'architecture', label: t('case.architecture') },
  { id: 'quality', label: t('case.quality') },
  { id: 'result', label: t('case.result') },
])

useSeoMeta({
  title: () => t('seo.caseTitle', { project: l(project.title) }),
  description: () => l(project.summary),
  ogTitle: () => t('seo.caseTitle', { project: l(project.title) }),
  ogDescription: () => l(project.summary),
  ogType: 'article',
  ogImage: () => `${site}/og-${locale.value}.png`,
  ogImageAlt: () => t('seo.ogAlt'),
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <CaseHeader :project="project" />
    <section v-if="project.image.kind !== 'none'" class="mx-auto max-w-[1240px] px-5 pb-16 pt-2 md:px-8">
      <BrowserFrame
        v-if="project.image.kind === 'screenshot'" :src="project.image.src" :alt="l(project.image.alt)"
        :url-label="project.image.url" :caption="`FIG. 01 — ${l(project.image.alt)}`" eager
      />
      <div v-else class="overflow-hidden rounded-[14px]"><KioskSchematic /></div>
    </section>
    <section class="mx-auto flex max-w-[1240px] flex-col gap-10 px-5 pb-20 md:px-8 lg:flex-row lg:items-start lg:gap-[72px]">
      <CaseToc :sections="sections" />
      <div class="min-w-0 max-w-[780px] flex-1">
        <p class="mb-2 font-mono text-xs font-bold text-accent">01</p>
        <h2 id="context" class="mb-4 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.context') }}</h2>
        <p class="mb-14 text-[17px] leading-[1.8] text-body">{{ l(project.context) }}</p>

        <p class="mb-2 font-mono text-xs font-bold text-accent">02</p>
        <h2 id="contribution" class="mb-4 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.contribution') }}</h2>
        <ul class="mb-14 list-disc space-y-2 pl-6 text-[17px] leading-[1.8] text-body marker:text-accent">
          <li v-for="(item, i) in project.contribution" :key="i">{{ l(item) }}</li>
        </ul>

        <p class="mb-2 font-mono text-xs font-bold text-accent">03</p>
        <h2 id="architecture" class="mb-5 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.architecture') }}</h2>
        <ArchitectureLayers :layers="project.architecture" />
        <div v-if="project.keyDecision" class="mt-5 rounded-[14px] border border-line bg-surface px-7 py-6">
          <span class="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[1.2px] text-accent">{{ t('case.keyDecision') }}</span>
          <p class="mt-3.5 text-[17px] leading-relaxed text-ink">{{ l(project.keyDecision) }}</p>
        </div>

        <p class="mb-2 mt-14 font-mono text-xs font-bold text-accent">04</p>
        <h2 id="quality" class="mb-5 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.quality') }}</h2>
        <QualityStats :items="project.quality" />

        <p class="mb-2 mt-14 font-mono text-xs font-bold text-accent">05</p>
        <h2 id="result" class="mb-4 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.result') }}</h2>
        <p class="text-[17px] leading-[1.8] text-body">{{ l(project.result) }}</p>
      </div>
    </section>
    <PrevNextNav :prev="prev" :next="next" />
    <CtaBand />
  </div>
</template>
