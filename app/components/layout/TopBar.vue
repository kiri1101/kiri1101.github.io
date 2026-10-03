<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const open = ref(false)
const sections = ['projects', 'method', 'career', 'skills', 'contact'] as const
const home = computed(() => localePath('/'))
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-5 md:h-[72px] md:gap-8 md:px-8">
      <NuxtLink :to="home" :aria-label="t('nav.home')" class="rounded bg-ink px-2.5 py-1.5 font-mono text-[15px] font-bold tracking-[1.5px] text-white no-underline hover:text-white">
        JTF
      </NuxtLink>
      <nav :aria-label="t('nav.label')" class="hidden flex-1 justify-center gap-8 text-sm font-semibold lg:flex">
        <NuxtLink v-for="s in sections" :key="s" :to="`${home}#${s}`" class="text-ink no-underline hover:text-accent">
          {{ t(`nav.${s}`) }}
        </NuxtLink>
      </nav>
      <span class="flex-1 lg:hidden" />
      <OpenBadge class="hidden md:inline-flex" />
      <LanguageSwitch />
      <button
        type="button" class="grid size-11 place-items-center rounded-lg border border-line bg-surface text-ink lg:hidden"
        :aria-expanded="open" aria-controls="mobile-menu" :aria-label="open ? t('nav.close') : t('nav.open')"
        @click="open = !open"
      >
        <AppIcon :name="open ? 'close' : 'menu'" />
      </button>
    </div>
    <nav v-show="open" id="mobile-menu" :aria-label="t('nav.label')" class="border-t border-line bg-white px-5 py-2 lg:hidden">
      <NuxtLink
        v-for="s in sections" :key="s" :to="`${home}#${s}`"
        class="block border-b border-grid py-3 font-semibold text-ink no-underline last:border-0" @click="open = false"
      >
        {{ t(`nav.${s}`) }}
      </NuxtLink>
    </nav>
  </header>
</template>
