<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const { t } = useI18n()
</script>

<template>
  <figure class="blueprint-dark relative m-0 overflow-hidden bg-ink" :class="compact ? 'h-[190px]' : 'h-[300px]'">
    <figcaption class="absolute left-5 top-4 font-mono uppercase tracking-[1.2px] text-sky" :class="compact ? 'text-[10px]' : 'text-[11px]'">
      {{ t('projects.kioskFigure') }}
    </figcaption>
    <div class="absolute left-1/2 top-[17%] h-[72%] w-[22%] max-w-[120px] -translate-x-1/2 rounded-[14px] border-2 border-sky" aria-hidden="true">
      <div class="mx-auto mt-[12%] h-[30%] w-[76%] rounded border-[1.5px] border-sky bg-sky/10" />
      <div class="mx-auto mt-[12%] h-[5%] w-[34%] rounded-sm border-[1.5px] border-sky" />
      <div class="mx-auto mt-[8%] aspect-square w-[22%] rounded-sm border-[1.5px] border-sky" />
      <div class="mx-auto mt-[10%] h-[6%] w-1/2 rounded-sm border-[1.5px] border-sky" />
    </div>
    <ul class="m-0 list-none p-0 font-mono uppercase text-white" :class="compact ? 'text-[9px]' : 'text-[11px]'">
      <li class="absolute left-5 right-[calc(50%+min(11%,60px))] top-[54%] flex items-center gap-2">
        <span>{{ t('kiosk.printer') }}</span><span class="h-px flex-1 bg-sky" aria-hidden="true" />
      </li>
      <li class="absolute left-5 right-[calc(50%+min(11%,60px))] top-[78%] flex items-center gap-2">
        <span>{{ t('kiosk.id') }}</span><span class="h-px flex-1 bg-sky" aria-hidden="true" />
      </li>
      <li class="absolute left-[calc(50%+min(11%,60px))] right-5 top-[32%] flex items-center gap-2">
        <span class="h-px flex-1 bg-sky" aria-hidden="true" /><span>{{ t('kiosk.screen') }}</span>
      </li>
      <li class="absolute left-[calc(50%+min(11%,60px))] right-5 top-[64%] flex items-center gap-2">
        <span class="h-px flex-1 bg-sky" aria-hidden="true" /><span>{{ t('kiosk.qr') }}</span>
      </li>
    </ul>
  </figure>
</template>
