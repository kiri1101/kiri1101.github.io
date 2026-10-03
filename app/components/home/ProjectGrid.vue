<script setup lang="ts">
import type { Project } from '~~/content/types'
const props = defineProps<{ projects: Project[] }>()
const { t } = useI18n()
const featured = computed(() => props.projects.filter(p => p.featured))
const others = computed(() => props.projects.filter(p => !p.featured))
</script>

<template>
  <section id="projects" class="mx-auto max-w-[1240px] px-5 pb-12 pt-16 md:px-8">
    <SectionHeading number="01" :title="t('projects.title')" :aside="t('projects.count')" />
    <div class="mb-7 mt-10 grid gap-7 lg:grid-cols-2">
      <ProjectCard v-for="p in featured" :key="p.slug" :project="p" featured />
    </div>
    <div class="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
      <ProjectCard v-for="p in others" :key="p.slug" :project="p" />
    </div>
  </section>
</template>
