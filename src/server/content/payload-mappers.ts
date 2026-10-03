import { projectPublicLexicalContent } from './public-lexical'
import type {
  Changelog,
  ChangelogChangeType,
  ChangelogSummary,
  CoverImage,
  Post,
  PostSummary,
  Project,
  ProjectLifecycle,
  ProjectSummary,
  SEOOverrides,
  TagSummary,
  TopicSummary,
} from './types'

export type PayloadDocument = Record<string, unknown> & {
  changeTypes?: unknown
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
  topics?: unknown
  title?: unknown
  content?: unknown
  gallery?: unknown
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
  const sizes: NonNullable<CoverImage['sizes']> = {}
  if (typeof image.sizes === 'object' && image.sizes !== null) {
    const sourceSizes = image.sizes as Record<string, unknown>
    for (const name of ['thumbnail', 'card', 'hero'] as const) {
      const rawSize = sourceSizes[name]
      if (typeof rawSize !== 'object' || rawSize === null) continue
      const size = rawSize as Record<string, unknown>
      sizes[name] = {
        url: nullableString(size.url),
        width: typeof size.width === 'number' ? size.width : null,
        height: typeof size.height === 'number' ? size.height : null,
      }
    }
  }

  return {
    url: nullableString(image.url),
    alt: nullableString(image.alt),
    width: typeof image.width === 'number' ? image.width : null,
    height: typeof image.height === 'number' ? image.height : null,
    sizes,
  }
}

function topicSummaries(value: unknown): TopicSummary[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const topic = item as Record<string, unknown>
    if ((typeof topic.id !== 'string' && typeof topic.id !== 'number') || typeof topic.slug !== 'string') return []
    return [
      {
        id: topic.id,
        title: stringValue(topic.title, topic.slug),
        slug: topic.slug,
        description: stringValue(topic.description),
      },
    ]
  })
}

/**
 * A `hasMany` relationship read at `depth: 0` hands back bare ids, so this
 * accepts either a populated document or an id and always returns the same
 * shape. An unpopulated entry still carries its id, so the row renders with the
 * id as its label rather than disappearing.
 */
function labelSummaries(value: unknown): TagSummary[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const id = typeof item === 'string' || typeof item === 'number' ? item : null
    const label = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null
    const recordId = label && (typeof label.id === 'string' || typeof label.id === 'number') ? label.id : id
    if (recordId === null || !label || typeof label.slug !== 'string') {
      return typeof recordId === 'string' || typeof recordId === 'number'
        ? [{ id: recordId, title: String(recordId), slug: String(recordId) }]
        : []
    }
    return [
      {
        id: recordId,
        title: stringValue(label.title, label.slug),
        slug: label.slug,
      },
    ]
  })
}

const CHANGE_TYPES = new Set<ChangelogChangeType>([
  'feature',
  'improvement',
  'bug_fix',
  'security',
  'breaking_change',
  'maintenance',
  'documentation',
])

function changeTypes(value: unknown): ChangelogChangeType[] {
  return stringArray(value).filter((item): item is ChangelogChangeType => CHANGE_TYPES.has(item as ChangelogChangeType))
}

/**
 * The gallery is a `hasMany` upload, so Payload hands back a flat array of
 * populated media documents rather than rows pairing an image with a caption.
 * Each document's own `alt` is the caption the gallery and viewer show.
 */
function projectGallery(value: unknown): CoverImage[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const image = coverImage(entry)
    return image.url ? [image] : []
  })
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
    updatedAt: stringValue(document.updatedAt),
    createdAt: stringValue(document.createdAt),
    tags: stringArray(document.tags),
    topics: topicSummaries(document.topics),
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
    topics: topicSummaries(document.topics),
    tags: labelSummaries(document.tags),
    gallery: projectGallery(document.gallery),
    featured: document.featured === true,
    coverImage: coverImage(document.coverImage),
    role: nullableString(document.role),
    projectStatus: projectLifecycle(document.projectStatus),
    startDate: nullableString(document.startDate),
    endDate: nullableString(document.endDate),
    updatedAt: stringValue(document.updatedAt),
  }
}

export function mapProject(document: PayloadDocument): Project {
  return {
    ...mapProjectSummary(document),
    content: projectPublicLexicalContent(document.content),
    repositoryUrl: nullableString(document.repositoryUrl),
    liveUrl: nullableString(document.liveUrl),
    seo: seoOverrides(document.seo),
    createdAt: stringValue(document.createdAt),
  }
}

export function mapChangelogSummary(document: PayloadDocument): ChangelogSummary {
  return {
    slug: stringValue(document.slug),
    title: stringValue(document.title, 'Untitled changelog'),
    version: nullableString(document.version),
    excerpt: stringValue(document.excerpt),
    publishedAt: stringValue(document.publishedAt),
    updatedAt: stringValue(document.updatedAt),
    createdAt: stringValue(document.createdAt),
    tags: stringArray(document.tags),
    changeTypes: changeTypes(document.changeTypes),
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
