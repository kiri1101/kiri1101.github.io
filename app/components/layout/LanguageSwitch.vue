<script setup lang="ts">
import type { Locale } from '~~/content/types'

const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const items = computed(() =>
  locales.value.map((l) => {
    const code = (typeof l === 'string' ? l : l.code) as Locale
    const name = typeof l === 'string' ? l : (l.name ?? code)
    return { code, name, to: switchLocalePath(code), active: code === locale.value }
  }))
</script>

<template>
  <div role="group" :aria-label="t('nav.language')" class="inline-flex rounded-lg bg-tint p-[3px] font-mono text-[13px] font-bold">
    <NuxtLink
      v-for="item in items" :key="item.code" :to="item.to" :hreflang="item.code" :aria-label="item.name"
      :aria-current="item.active ? 'true' : undefined"
      class="grid min-h-11 min-w-11 place-items-center rounded-md px-3 no-underline"
      :class="item.active ? 'bg-ink text-white hover:text-white' : 'text-ink hover:bg-white hover:text-ink'"
    >
      {{ item.code.toUpperCase() }}
    </NuxtLink>
  </div>
</template>
