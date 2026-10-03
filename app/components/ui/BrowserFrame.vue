<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt: string
  urlLabel: string
  position?: string
  height?: string
  compact?: boolean
  caption?: string
  eager?: boolean
}>(), { position: 'top', height: undefined, compact: false, caption: undefined, eager: false })
</script>

<template>
  <figure class="m-0 overflow-hidden rounded-t-[10px] bg-surface shadow-[0_-1px_0_var(--color-line),0_8px_24px_rgb(19_32_58/0.10)]" :class="caption ? 'rounded-b-[14px] border border-line' : ''">
    <div class="flex items-center gap-1.5 border-b border-grid bg-paper px-3" :class="compact ? 'h-[22px]' : 'h-[30px]'">
      <span v-for="i in 3" :key="i" class="inline-block rounded-full bg-line" :class="compact ? 'size-[7px]' : 'size-[9px]'" aria-hidden="true" />
      <span v-if="!compact" class="ml-3 truncate font-mono text-[11px] text-muted">{{ urlLabel }}</span>
    </div>
    <img
      :src="src" :alt="alt" width="1440" height="900" :loading="eager ? 'eager' : 'lazy'" decoding="async"
      class="block w-full object-cover" :style="{ objectPosition: position, height: height ?? 'auto' }"
    >
    <figcaption v-if="caption" class="border-t border-grid px-5 py-3 font-mono text-xs text-muted">{{ caption }}</figcaption>
  </figure>
</template>
