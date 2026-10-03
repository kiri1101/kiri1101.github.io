<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error.statusCode === 404)
useHead({ title: 'Page introuvable · Page not found — Jordan Tukum Folem', htmlAttrs: { lang: 'fr' } })
</script>

<template>
  <main class="blueprint grid min-h-screen place-items-center bg-paper px-5 py-16 text-ink">
    <div class="max-w-xl text-center">
      <p class="font-mono text-sm uppercase tracking-[1.5px] text-accent">Erreur {{ error.statusCode }} · Error {{ error.statusCode }}</p>
      <h1 class="mt-4 text-4xl font-extrabold md:text-5xl">{{ is404 ? 'Page introuvable' : 'Une erreur est survenue' }}</h1>
      <p class="mt-3 text-xl font-semibold text-body" lang="en">{{ is404 ? 'Page not found' : 'Something went wrong' }}</p>
      <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
        <a href="/" class="btn-primary">Retour à l’accueil</a>
        <a href="/en" class="btn-secondary" lang="en">Back to home</a>
      </div>
    </div>
  </main>
</template>
