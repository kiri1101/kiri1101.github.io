<script setup lang="ts">
import type { Locale, Profile } from '~~/content/types'
import { cvPath } from '~~/content/profile'
const props = defineProps<{ profile: Profile }>()
const { t, locale } = useI18n()
const l = useLocalized()
const localePath = useLocalePath()
const [first, ...rest] = props.profile.name.split(' ')
</script>

<template>
  <section class="blueprint border-b border-line bg-paper">
    <div class="mx-auto flex max-w-[1240px] flex-wrap items-center gap-14 px-5 pb-16 pt-12 md:px-8 md:pb-20 md:pt-24">
      <div class="min-w-0 flex-[7_1_540px]">
        <p class="mb-7 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[1.5px] text-accent md:text-[13px]">
          <span class="inline-block h-0.5 w-7 bg-accent" aria-hidden="true" />{{ t('hero.eyebrow') }}
        </p>
        <h1 class="mb-8 text-[3rem] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-[4.5rem] lg:text-[6rem]">
          {{ first }}<br>{{ rest.join(' ') }}<span class="text-accent">.</span>
        </h1>
        <p class="mb-10 max-w-[640px] text-[17px] leading-relaxed text-body md:text-[21px]">{{ l(profile.valueProp) }}</p>
        <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <NuxtLink :to="`${localePath('/')}#projects`" class="btn-primary">{{ t('hero.ctaProjects') }} <span aria-hidden="true">→</span></NuxtLink>
          <a :href="cvPath(locale as Locale)" download class="btn-secondary"><AppIcon name="download" :size="18" />{{ t('hero.ctaCv') }}</a>
        </div>
        <div class="flex flex-wrap gap-x-7 gap-y-3 font-mono text-sm text-body">
          <a :href="`mailto:${profile.email}`" class="inline-flex items-center gap-2 text-body no-underline hover:text-accent">
            <AppIcon name="mail" :size="16" class="text-accent" />{{ profile.email }}
          </a>
          <a :href="profile.whatsappUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-body no-underline hover:text-accent">
            <AppIcon name="chat" :size="16" class="text-accent" />WhatsApp {{ profile.phone }}
          </a>
        </div>
      </div>
      <ProfileCard :profile="profile" class="min-w-0 flex-[5_1_340px]" />
    </div>
  </section>
</template>
