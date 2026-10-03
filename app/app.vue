<script setup lang="ts">
const { t } = useI18n()
const head = useLocaleHead({ seo: true })
useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  link: [...(head.value.link ?? [])],
  meta: [...(head.value.meta ?? [])],
}))
</script>

<template>
  <a href="#content" class="skip-link">{{ t('a11y.skip') }}</a>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
