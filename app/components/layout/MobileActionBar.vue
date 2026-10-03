<script setup lang="ts">
import type { Locale } from '~~/content/types'
import { cvPath, profile } from '~~/content/profile'
const { t, locale } = useI18n()
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgb(19_32_58/0.08)] backdrop-blur lg:hidden">
    <a :href="profile.whatsappUrl" target="_blank" rel="noopener" class="btn-primary min-h-[50px] flex-1 px-4 text-[15px]">
      <AppIcon name="chat" :size="17" />{{ t('contact.whatsapp') }}
    </a>
    <a :href="cvPath(locale as Locale)" download class="btn-secondary min-h-[50px] flex-1 px-4 text-[15px]">
      <AppIcon name="download" :size="17" />{{ t('contact.cvShort') }}
    </a>
  </div>
</template>
