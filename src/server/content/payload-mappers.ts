import { projectPublicLexicalContent } from './public-lexical'
import type {
  Changelog,
  ChangelogSummary,
  CoverImage,
  Post,
  PostSummary,
  Project,
  ProjectLifecycle,
  ProjectSummary,
  SEOOverrides,
} from './types'

export type PayloadDocument = Record<string, unknown> & {
  coverImage?: unknown
  endDate?: unknown
  excerpt?: unknown
  featured?: unknown
  liveUrl?: unknown
  publishedAt?: unknown
  repositoryUrl?: unknown
  role?: unknown
  seo?: unknown
  slug?: unknown
  startDate?: unknown
  summary?: unknown
  tags?: unknown
  technologies?: unknown
  title?: unknown
  content?: unknown
  projectStatus?: unknown
  version?: unknown
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (typeof item === 'string') return [item]
    if (typeof item !== 'object' || item === null) return []
    if ('tag' in item && typeof item.tag === 'string') return [item.tag]
    if ('technology' in item && typeof item.technology === 'string') return [item.technology]
    return []
  })
}

function coverImage(value: unknown): CoverImage {
  if (typeof value !== 'object' || value === null) return { url: null, alt: null }

  const image = value as Record<string, unknown>
  return { url: nullableString(image.url), alt: nullableString(image.alt) }
}

function seoOverrides(value: unknown): SEOOverrides {
  if (typeof value !== 'object' || value === null) {
    return { title: null, description: null, image: { url: null, alt: null } }
  }

  const seo = value as Record<string, unknown>
  return {
    title: nullableString(seo.title),
    description: nullableString(seo.description),
    image: coverImage(seo.image),
  }
}

function projectLifecycle(value: unknown): ProjectLifecycle | null {
  switch (value) {
    case 'planned':
    case 'in_progress':
    case 'completed':
    case 'archived':
      return value
    default:
      return null
  }
}

export function mapPostSummary(document: PayloadDocument): PostSummary {
  return {
    slug: stringValue(document.slug),
    title: stringValue(document.title, 'Untitled post'),
    excerpt: stringValue(document.excerpt),
    publishedAt: stringValue(document.publishedAt),
    tags: stringArray(document.tags),
    coverImage: coverImage(document.coverImage),
  }
}

export function mapPost(document: PayloadDocument): Post {
  return {
    ...mapPostSummary(document),
    content: projectPublicLexicalContent(document.content),
    seo: seoOverrides(document.seo),
  }
}

export function mapProjectSummary(document: PayloadDocument): ProjectSummary {
  return {
    slug: stringValue(document.slug),
    title: stringValue(document.title, 'Untitled project'),
    summary: stringValue(document.summary),
    technologies: stringArray(document.technologies),
    featured: document.featured === true,
    coverImage: coverImage(document.coverImage),
    role: nullableString(document.role),
    projectStatus: projectLifecycle(document.projectStatus),
    startDate: nullableString(document.startDate),
    endDate: nullableString(document.endDate),
  }
}

export function mapProject(document: PayloadDocument): Project {
  return {
    ...mapProjectSummary(document),
    content: projectPublicLexicalContent(document.content),
    repositoryUrl: nullableString(document.repositoryUrl),
    liveUrl: nullableString(document.liveUrl),
    seo: seoOverrides(document.seo),
  }
}

export function mapChangelogSummary(document: PayloadDocument): ChangelogSummary {
  return {
    slug: stringValue(document.slug),
    title: stringValue(document.title, 'Untitled changelog'),
    version: nullableString(document.version),
    excerpt: stringValue(document.excerpt),
    publishedAt: stringValue(document.publishedAt),
    tags: stringArray(document.tags),
    coverImage: coverImage(document.coverImage),
  }
}

export function mapChangelog(document: PayloadDocument): Changelog {
  return {
    ...mapChangelogSummary(document),
    content: projectPublicLexicalContent(document.content),
    seo: seoOverrides(document.seo),
  }
}
