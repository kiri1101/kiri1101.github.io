<script setup lang="ts">
withDefaults(defineProps<{ number: string; title: string; aside?: string; dark?: boolean; level?: 'h2' | 'h3' }>(), {
  aside: undefined, dark: false, level: 'h2',
})
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-4">
      <span class="font-mono text-[13px] font-bold" :class="dark ? 'text-sky' : 'text-accent'">{{ number }}</span>
      <span class="h-px flex-1" :class="dark ? 'bg-white/15' : 'bg-line'" aria-hidden="true" />
      <span v-if="aside" class="font-mono text-[13px] uppercase" :class="dark ? 'text-mist' : 'text-muted'">{{ aside }}</span>
    </div>
    <component :is="level" class="text-[2rem] font-extrabold tracking-[-0.03em] md:text-[2.75rem]" :class="dark ? 'text-white' : 'text-ink'">
      {{ title }}
    </component>
  </div>
</template>
