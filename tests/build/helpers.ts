import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const OUT = join(process.cwd(), '.output', 'public')
export const SITE = 'https://jordan-tukum.pages.dev'

export function page(route: string): string {
  const relative = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`
  const file = join(OUT, relative)
  if (!existsSync(file)) throw new Error(`Missing prerendered page: ${relative}`)
  return readFileSync(file, 'utf8')
}

export const title = (html: string): string => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
export const htmlLang = (html: string): string => html.match(/<html[^>]*\blang="([^"]+)"/)?.[1] ?? ''

export function hasLink(html: string, rel: string, hrefs: string[], hreflang?: string): boolean {
  const tags = html.match(/<link\b[^>]*>/g) ?? []
  return tags.some(tag =>
    tag.includes(`rel="${rel}"`)
    && hrefs.some(href => tag.includes(`href="${href}"`))
    && (!hreflang || tag.includes(`hreflang="${hreflang}"`)))
}

export function meta(html: string, key: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/g) ?? []
  const tag = tags.find(t => t.includes(`property="${key}"`) || t.includes(`name="${key}"`))
  return tag?.match(/content="([^"]*)"/)?.[1]
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': '\'', '&#x27;': '\'', '&nbsp;': ' ' }

export const stripTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, m => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')

export const urlVariants = (path: string): string[] => {
  const base = `${SITE}${path === '/' ? '' : path}`
  return [base, `${base}/`]
}
