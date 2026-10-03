<script setup lang="ts">
import type { Locale } from '~~/content/types'
import { cvPath, profile } from '~~/content/profile'
const { t, locale } = useI18n()
</script>

<template>
  <section class="blueprint-dark bg-ink text-white">
    <div class="mx-auto flex max-w-[1240px] flex-wrap items-center gap-6 px-5 py-14 md:px-8 md:py-16">
      <h2 class="min-w-[280px] flex-1 text-[1.8rem] font-extrabold leading-tight md:text-[2.1rem]">
        {{ t('case.ctaTitle') }}<br><span class="text-sky">{{ t('contact.titleAccent') }}</span>
      </h2>
      <a :href="`mailto:${profile.email}`" class="btn-light">{{ t('case.ctaContact') }}</a>
      <a :href="cvPath(locale as Locale)" download class="btn-outline-light">{{ t('contact.cv') }}</a>
    </div>
  </section>
</template>
