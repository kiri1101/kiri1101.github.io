<script setup lang="ts">
import type { Locale, Profile } from '~~/content/types'
import { cvPath } from '~~/content/profile'
defineProps<{ profile: Profile }>()
const { t, locale } = useI18n()
</script>

<template>
  <section id="contact" class="blueprint-dark bg-ink text-white">
    <div class="mx-auto flex max-w-[1240px] flex-col items-start gap-7 px-5 py-16 md:px-8 md:py-[104px]">
      <p class="inline-flex items-center gap-3 font-mono text-[13px] uppercase tracking-[1.5px] text-sky">
        <span class="inline-block h-0.5 w-7 bg-sky" aria-hidden="true" />{{ t('contact.eyebrow') }}
      </p>
      <h2 class="max-w-[900px] text-[2.4rem] font-extrabold leading-none tracking-[-0.035em] md:text-[4.5rem]">
        {{ t('contact.title') }}<br><span class="text-sky">{{ t('contact.titleAccent') }}</span>
      </h2>
      <p class="text-lg text-[#C9D3E2]">{{ t('contact.text') }}</p>
      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
        <a :href="`mailto:${profile.email}`" class="btn-light"><AppIcon name="mail" :size="18" />{{ t('contact.email') }}</a>
        <a :href="profile.whatsappUrl" target="_blank" rel="noopener" class="btn-outline-light"><AppIcon name="chat" :size="18" />{{ t('contact.whatsapp') }}</a>
        <a :href="cvPath(locale as Locale)" download class="btn-outline-light"><AppIcon name="download" :size="18" />{{ t('contact.cv') }}</a>
      </div>
      <p class="mt-2 font-mono text-sm text-mist">
        {{ profile.phone }} · {{ profile.email }} ·
        <a :href="profile.linkedinUrl" target="_blank" rel="noopener" class="text-mist underline underline-offset-2 hover:text-white">LinkedIn ↗</a> ·
        <a :href="profile.githubUrl" target="_blank" rel="noopener" class="text-mist underline underline-offset-2 hover:text-white">GitHub ↗</a>
      </p>
    </div>
  </section>
</template>
