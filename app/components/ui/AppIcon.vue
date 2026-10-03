<script setup lang="ts">
import type { IconName } from '~~/content/types'

type Shape = { tag: 'path' | 'polyline' | 'line' | 'circle'; attrs: Record<string, string> }
const p = (d: string): Shape => ({ tag: 'path', attrs: { d } })
const pl = (points: string): Shape => ({ tag: 'polyline', attrs: { points } })
const ln = (x1: number, y1: number, x2: number, y2: number): Shape =>
  ({ tag: 'line', attrs: { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2) } })

const ICONS: Record<IconName, Shape[]> = {
  'check': [pl('9 11 12 14 22 4'), p('M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11')],
  'refresh': [pl('23 4 23 10 17 10'), pl('1 20 1 14 7 14'), p('M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15')],
  'file': [p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), pl('14 2 14 8 20 8'), ln(16, 13, 8, 13), ln(16, 17, 8, 17)],
  'users': [p('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), { tag: 'circle', attrs: { cx: '9', cy: '7', r: '4' } }, p('M23 21v-2a4 4 0 0 0-3-3.87'), p('M16 3.13a4 4 0 0 1 0 7.75')],
  'shield': [p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')],
  'download': [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), pl('7 10 12 15 17 10'), ln(12, 15, 12, 3)],
  'mail': [p('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'), pl('22,6 12,13 2,6')],
  'chat': [p('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z')],
  'menu': [ln(3, 6, 21, 6), ln(3, 12, 21, 12), ln(3, 18, 21, 18)],
  'close': [ln(18, 6, 6, 18), ln(6, 6, 18, 18)],
  'arrow-up-right': [ln(7, 17, 17, 7), pl('7 7 17 7 17 17')],
}

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
const shapes = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"
  >
    <component :is="shape.tag" v-for="(shape, i) in shapes" :key="i" v-bind="shape.attrs" />
  </svg>
</template>
