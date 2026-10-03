<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span class="items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs text-ink">
    <span class="inline-block size-2 rounded-full bg-signal shadow-[0_0_0_3px_rgb(227_163_43/0.25)]" aria-hidden="true" />
    {{ t('badge.open') }}
  </span>
</template>
