<script setup lang="ts">
import { profile } from '~~/content/profile'
import { projects } from '~~/content/projects'
import { otherProjects } from '~~/content/other-projects'
import { method } from '~~/content/method'
import { distinction, experience } from '~~/content/experience'
import { skillTiers } from '~~/content/skills'
import { education } from '~~/content/education'

const { t, locale } = useI18n()
const l = useLocalized()
const site = useRuntimeConfig().public.siteUrl
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
  ogTitle: () => t('seo.homeTitle'),
  ogDescription: () => t('seo.homeDescription'),
  ogType: 'profile',
  ogSiteName: 'Jordan Tukum Folem',
  ogImage: () => `${site}/og-${locale.value}.png`,
  ogImageAlt: () => t('seo.ogAlt'),
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      'name': profile.name,
      'jobTitle': l(profile.title),
      'url': locale.value === 'en' ? `${site}/en` : site,
      'email': `mailto:${profile.email}`,
      'telephone': '+237698377389',
      'address': { '@type': 'PostalAddress', 'addressLocality': 'Douala', 'addressCountry': 'CM' },
      'worksFor': { '@type': 'Organization', 'name': 'ADWA SARL' },
      'sameAs': [profile.linkedinUrl, profile.githubUrl],
      'alumniOf': [
        { '@type': 'EducationalOrganization', 'name': 'Institut Universitaire du Golfe de Guinée (IUG)' },
        { '@type': 'EducationalOrganization', 'name': 'Douala Institute of Technology (DIT)' },
        { '@type': 'EducationalOrganization', 'name': 'Institut Universitaire de la Côte (IUC)' },
      ],
      'knowsAbout': ['Laravel', 'PHP', 'Vue.js', 'Nuxt', 'React', 'Next.js', 'TypeScript', 'REST APIs', 'MySQL', 'PostgreSQL', 'Automated testing', 'Docker'],
    }),
  }],
}))
</script>

<template>
  <div>
    <HeroSection :profile="profile" />
    <ProofStrip :stats="profile.stats" />
    <TrustRow :items="profile.deliveredFor" />
    <ProjectGrid :projects="projects" />
    <MethodSection :items="method" />
    <section class="mx-auto grid max-w-[1240px] gap-16 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[6fr_5fr] lg:gap-[72px]">
      <CareerTimeline :items="experience" :distinction="distinction" />
      <SkillTiers :tiers="skillTiers" />
    </section>
    <section class="border-t border-line bg-surface">
      <div class="mx-auto grid max-w-[1240px] gap-16 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[6fr_5fr] lg:gap-[72px]">
        <OtherProjects :items="otherProjects" />
        <EducationList :items="education" />
      </div>
    </section>
    <ContactBand :profile="profile" />
  </div>
</template>
