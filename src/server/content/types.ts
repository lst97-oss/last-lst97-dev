import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

export interface Page<T> {
  items: T[]
  page: number
  totalPages: number
  totalDocs: number
}

export interface CoverImage {
  url: string | null
  alt: string | null
  width?: number | null
  height?: number | null
  sizes?: Partial<Record<'thumbnail' | 'card' | 'hero', ImageSize>>
}

export interface ImageSize {
  url: string | null
  width: number | null
  height: number | null
}

export interface TopicSummary {
  id: string | number
  title: string
  slug: string
  description: string
}

/** Same shape as a topic, minus the editorial description. */
export interface TagSummary {
  id: string | number
  title: string
  slug: string
}

export type ProjectLifecycle = 'planned' | 'in_progress' | 'completed' | 'archived'
export type ChangelogChangeType =
  | 'feature'
  | 'improvement'
  | 'bug_fix'
  | 'security'
  | 'breaking_change'
  | 'maintenance'
  | 'documentation'

export interface SEOOverrides {
  title: string | null
  description: string | null
  image: CoverImage
}

export type LexicalContent = DefaultTypedEditorState

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSerializedNode(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== 'string') return false

  switch (value.type) {
    case 'text':
      return typeof value.text === 'string' && typeof value.format === 'number'
    case 'linebreak':
    case 'horizontalrule':
    case 'tab':
      return true
    case 'heading':
      return typeof value.tag === 'string' && /^h[1-6]$/.test(value.tag) && hasValidChildren(value)
    case 'list':
      return (value.tag === 'ol' || value.tag === 'ul') && typeof value.listType === 'string' && hasValidChildren(value)
    case 'listitem':
    case 'paragraph':
    case 'quote':
      return hasValidChildren(value)
    case 'table':
    case 'tablerow':
      return hasValidChildren(value)
    case 'tablecell':
      return hasValidChildren(value)
    case 'block':
      return isRecord(value.fields) && value.fields.blockType === 'Code' && typeof value.fields.code === 'string'
    case 'link':
    case 'autolink': {
      if (!hasValidChildren(value) || !isRecord(value.fields)) return false
      const { fields } = value
      return (
        (fields.linkType === 'custom' || fields.linkType === 'internal') &&
        (fields.newTab === undefined || typeof fields.newTab === 'boolean') &&
        (fields.url === undefined || typeof fields.url === 'string')
      )
    }
    case 'relationship':
      return (
        typeof value.relationTo === 'string' &&
        (typeof value.value === 'string' || typeof value.value === 'number' || isRecord(value.value))
      )
    case 'upload':
      return (
        typeof value.relationTo === 'string' &&
        isRecord(value.fields) &&
        (typeof value.value === 'string' || typeof value.value === 'number' || isRecord(value.value))
      )
    default:
      return false
  }
}

function hasValidChildren(value: Record<string, unknown>): boolean {
  return Array.isArray(value.children) && value.children.every(isSerializedNode)
}

export function parseLexicalContent(value: unknown): LexicalContent | null {
  if (!isRecord(value) || !isRecord(value.root) || value.root.type !== 'root' || !Array.isArray(value.root.children)) {
    return null
  }

  if (!value.root.children.every(isSerializedNode)) return null
  return value as unknown as LexicalContent
}

export interface PostSummary {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  updatedAt: string
  tags: string[]
  topics?: TopicSummary[]
  coverImage: CoverImage
  createdAt: string
}

export interface Post extends PostSummary {
  content: LexicalContent | null
  seo: SEOOverrides
}

export interface ProjectSummary {
  slug: string
  title: string
  summary: string
  technologies: string[]
  topics: TopicSummary[]
  tags: TagSummary[]
  gallery: CoverImage[]
  featured: boolean
  coverImage: CoverImage
  updatedAt: string
  role: string | null
  projectStatus: ProjectLifecycle | null
  startDate: string | null
  endDate: string | null
}

export interface Project extends ProjectSummary {
  content: LexicalContent | null
  repositoryUrl: string | null
  liveUrl: string | null
  seo: SEOOverrides
  createdAt: string
}

export interface ChangelogSummary {
  slug: string
  title: string
  version: string | null
  excerpt: string
  publishedAt: string
  updatedAt: string
  tags: string[]
  changeTypes: ChangelogChangeType[]
  coverImage: CoverImage
  createdAt: string
}

export interface Changelog extends ChangelogSummary {
  content: LexicalContent | null
  seo: SEOOverrides
}

export interface ListPostsInput {
  page: number
  limit: number
  filters?: ContentFilters
}

/** Narrows a listing. Optional, and the only filter the listings expose. */
export interface ContentFilters {
  /** Only documents carrying ANY of these topics. */
  topicIds?: (string | number)[]
}

export interface RelatedInput {
  /** The document being viewed; never returned among the results. */
  excludeSlug: string
  /** The current document's topic ids. Empty falls back to recency alone. */
  topicIds: (string | number)[]
  limit: number
}

export interface BlogReader {
  listPublished(input: ListPostsInput): Promise<Page<PostSummary>>
  listPublishedByTopic(topicId: string | number, input: ListPostsInput): Promise<Page<PostSummary>>
  /**
   * Every published post, unpaged and sorted by most recently updated. The home
   * note window paginates its expanded view over this, so it must not be the
   * `-publishedAt` ordering that `listPublished` uses.
   */
  listAllByUpdated(): Promise<PostSummary[]>
  /** Same-type entries for a detail page: shared topics first, then most recent. */
  listRelated(input: RelatedInput): Promise<PostSummary[]>
  getPublishedBySlug(slug: string): Promise<Post | null>
}

export interface TopicReader {
  listPublished(): Promise<TopicSummary[]>
  getPublishedBySlug(slug: string): Promise<TopicSummary | null>
}

export interface ProjectReader {
  listPublished(input: ListPostsInput): Promise<Page<ProjectSummary>>
  /** Same-type entries for a detail page: shared topics first, then most recent. */
  listRelated(input: RelatedInput): Promise<ProjectSummary[]>
  /** Every published project, unpaged — for the sitemap and chat tools. */
  listAll(): Promise<ProjectSummary[]>
  getPublishedBySlug(slug: string): Promise<Project | null>
}

export interface ChangelogReader {
  listPublished(input: ListPostsInput): Promise<Page<ChangelogSummary>>
  /**
   * The releases either side of one, against the `-publishedAt` order the
   * listing uses. `previous` is the older release, `next` the newer; either is
   * null at the ends of the archive.
   */
  getNeighbours(input: { slug: string }): Promise<{
    previous: ChangelogSummary | null
    next: ChangelogSummary | null
  }>
  getPublishedBySlug(slug: string): Promise<Changelog | null>
}
