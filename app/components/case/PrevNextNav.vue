<script setup lang="ts">
import type { Project } from '~~/content/types'
const props = defineProps<{ prev: Project; next: Project }>()
const { t } = useI18n()
const l = useLocalized()
const localePath = useLocalePath()
const to = (p: Project) => localePath({ name: 'projets-slug', params: { slug: p.slug } })
</script>

<template>
  <nav :aria-label="`${t('case.prev')} / ${t('case.next')}`" class="border-t border-line bg-surface">
    <div class="mx-auto grid max-w-[1240px] px-5 md:grid-cols-2 md:px-8">
      <NuxtLink :to="to(props.prev)" class="flex flex-col gap-2 py-7 pr-8 text-ink no-underline hover:text-accent">
        <span class="font-mono text-xs uppercase tracking-[1px] text-muted">← {{ t('case.prev') }} · № {{ prev.number }}</span>
        <span class="text-[22px] font-extrabold">{{ l(prev.title) }}</span>
      </NuxtLink>
      <NuxtLink :to="to(props.next)" class="flex flex-col gap-2 border-t border-grid py-7 text-ink no-underline hover:text-accent md:border-l md:border-t-0 md:pl-8 md:text-right">
        <span class="font-mono text-xs uppercase tracking-[1px] text-muted">{{ t('case.next') }} · № {{ next.number }} →</span>
        <span class="text-[22px] font-extrabold">{{ l(next.title) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
