<script setup lang="ts">
import { profile } from '~~/content/profile'
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <footer class="bg-night">
    <div class="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 px-5 py-6 font-mono text-xs text-mist md:px-8">
      <span>© 2026 {{ profile.name }} — {{ l(profile.location) }}</span>
      <span>{{ t('footer.builtWith') }} · <a :href="profile.repoUrl" class="text-sky hover:text-white" target="_blank" rel="noopener">{{ t('footer.source') }} ↗</a></span>
    </div>
  </footer>
</template>
