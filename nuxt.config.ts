import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://jordan-tukum.pages.dev'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxtjs/i18n', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: { public: { siteUrl: SITE_URL } },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      ],
      meta: [
        { name: 'google-site-verification', content: '-o3on4T7CLriyCJbh7NAqGm82V76NJrR7eSZ5Uz_WIM' },
        { name: 'theme-color', content: '#13203A' },
      ],
    },
  },
  i18n: {
    baseUrl: SITE_URL,
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'fr', language: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
    ],
  },
  fonts: {
    // global: Tailwind v4 references the families through CSS variables, which font detection can miss
    families: [
      { name: 'Montserrat', provider: 'google', weights: [400, 500, 600, 700, 800], subsets: ['latin', 'latin-ext'], global: true },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700], subsets: ['latin', 'latin-ext'], global: true },
    ],
  },
  nitro: { prerender: { crawlLinks: true, routes: ['/', '/en'] } },
})
