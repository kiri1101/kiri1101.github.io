<script setup lang="ts">
import type { MethodItem } from '~~/content/types'
defineProps<{ items: MethodItem[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section id="method" class="mt-8 border-y border-line bg-tint">
    <div class="mx-auto max-w-[1240px] px-5 py-16 md:px-8 md:py-20">
      <SectionHeading number="02" :title="t('method.title')" />
      <p class="mb-11 mt-3 max-w-[720px] text-lg leading-relaxed text-body">{{ t('method.intro') }}</p>
      <ul class="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-5">
        <li v-for="(item, i) in items" :key="i" class="flex gap-4 rounded-[14px] border border-line bg-surface p-5 lg:flex-col lg:px-6 lg:py-7">
          <span class="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent lg:size-11"><AppIcon :name="item.icon" :size="21" /></span>
          <div>
            <h3 class="mb-2 text-[17px] font-bold">{{ l(item.title) }}</h3>
            <p class="m-0 text-sm leading-relaxed text-body">
              <span class="lg:hidden">{{ l(item.short) }}</span><span class="hidden lg:inline">{{ l(item.text) }}</span>
            </p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
