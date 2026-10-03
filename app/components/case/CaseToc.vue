<script setup lang="ts">
const props = defineProps<{ sections: Array<{ id: string; label: string }> }>()
const { t } = useI18n()
const active = ref(props.sections[0]?.id ?? '')
let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (visible) active.value = visible.target.id
  }, { rootMargin: '-20% 0px -70% 0px' })
  for (const s of props.sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav :aria-label="t('case.toc')" class="min-w-0 lg:sticky lg:top-24 lg:w-[220px] lg:shrink-0">
    <p class="mb-4 font-mono text-xs uppercase tracking-[1.5px] text-muted">{{ t('case.toc') }}</p>
    <ol class="m-0 flex list-none flex-wrap gap-1 p-0 text-[15px] font-semibold lg:flex-col">
      <li v-for="s in sections" :key="s.id">
        <a
          :href="`#${s.id}`" :aria-current="active === s.id ? 'location' : undefined"
          class="block rounded-lg px-3 py-2 no-underline" :class="active === s.id ? 'bg-accent-soft text-accent' : 'text-body hover:text-accent'"
        >{{ s.label }}</a>
      </li>
    </ol>
  </nav>
</template>
