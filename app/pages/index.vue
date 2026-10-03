<script setup lang="ts">
import { profile } from '~~/content/profile'
import { projects } from '~~/content/projects'
import { otherProjects } from '~~/content/other-projects'
import { method } from '~~/content/method'
import { distinction, experience } from '~~/content/experience'
import { skillTiers } from '~~/content/skills'
import { education } from '~~/content/education'

const { t } = useI18n()
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
})
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
