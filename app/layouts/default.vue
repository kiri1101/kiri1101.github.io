<template>
  <div class="flex min-h-screen flex-col bg-paper pb-24 text-ink lg:pb-0">
    <TopBar />
    <main id="content" class="flex-1" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
    <MobileActionBar />
  </div>
</template>
