export type Locale = 'fr' | 'en'
export interface Localized<T = string> { fr: T; en: T }

export type IconName =
  | 'check' | 'refresh' | 'file' | 'users' | 'shield' | 'download' | 'mail' | 'chat' | 'menu' | 'close' | 'arrow-up-right'

export interface Stat { value: Localized; label: Localized; caption: Localized }
export interface FactRow { label: Localized; value: Localized }

export interface Profile {
  name: string
  title: Localized
  location: Localized
  valueProp: Localized
  valuePropShort: Localized
  email: string
  phone: string
  whatsappUrl: string
  linkedinUrl: string
  githubUrl: string
  repoUrl: string
  facts: FactRow[]
  stats: Stat[]
  sectors: Localized[]
  deliveredFor: Localized[]
}

export type BadgeTone = 'live' | 'proof' | 'plain'
export interface ProjectBadge { tone: BadgeTone; label: Localized }

export type ProjectImage =
  | { kind: 'screenshot'; src: string; alt: Localized; url: string; position: string }
  | { kind: 'kiosk' }
  | { kind: 'none' }

export interface ProjectLink { kind: 'live' | 'demo' | 'code'; url: string; label: string }
export interface ArchitectureLayer { label: Localized; description: Localized }
export interface QualityItem { value: Localized; label: Localized }

export interface Project {
  slug: string
  number: string
  featured: boolean
  sector: Localized
  title: Localized
  summary: Localized
  role: Localized
  period: Localized
  organisation: Localized
  stack: string[]
  badges: ProjectBadge[]
  links: ProjectLink[]
  image: ProjectImage
  testCount?: number
  context: Localized
  contribution: Localized[]
  architecture: ArchitectureLayer[]
  keyDecision?: Localized
  quality: QualityItem[]
  result: Localized
}

export interface OtherProject { title: Localized; description: Localized; link?: { url: string } }
export interface MethodItem { icon: IconName; title: Localized; text: Localized; short: Localized }
export interface ExperienceItem { period: Localized; role: Localized; company: string; text: Localized; current: boolean }
export interface SkillTier { id: 'core' | 'also' | 'notions'; title: Localized; items: Localized[] }
export interface EducationBadge { tone: 'proof' | 'plain'; label: Localized }
export interface EducationItem { title: Localized; school: Localized; year: string; badges: EducationBadge[] }
