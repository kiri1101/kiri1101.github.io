<script setup lang="ts">
import type { Stat } from '~~/content/types'
defineProps<{ stats: Stat[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section :aria-label="t('proof.label')" class="border-b border-line bg-surface">
    <dl class="mx-auto m-0 grid max-w-[1240px] grid-cols-2 px-5 md:px-8 lg:grid-cols-4">
      <div
        v-for="(stat, i) in stats" :key="i"
        class="flex flex-col-reverse justify-end border-grid py-7 md:py-9"
        :class="[i % 2 === 1 ? 'border-l pl-5 md:pl-7' : 'pr-5 md:pr-7', i >= 2 ? 'border-t lg:border-t-0' : '', i === 2 ? 'lg:border-l lg:pl-7' : '']"
      >
        <dt class="mt-3 font-mono text-[10px] uppercase tracking-[1.2px] text-accent md:text-xs">
          {{ l(stat.label) }}<span class="mt-1 block font-sans text-sm normal-case tracking-normal text-muted">{{ l(stat.caption) }}</span>
        </dt>
        <dd class="m-0 text-[2.4rem] font-extrabold leading-none tracking-[-0.03em] text-ink md:text-[3.5rem]">{{ l(stat.value) }}</dd>
      </div>
    </dl>
  </section>
</template>
