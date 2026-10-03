<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span class="rounded-md border border-line px-2 py-1 font-mono text-xs text-body">{{ label }}</span>
</template>
