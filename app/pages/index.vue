<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
})
</script>

<template>
  <section id="projects" class="mx-auto max-w-[1240px] px-5 py-16 md:px-8">
    <h1 class="text-5xl font-extrabold">{{ t('site.name') }}</h1>
  </section>
</template>
