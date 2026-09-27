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
}

export type ProjectLifecycle = 'planned' | 'in_progress' | 'completed' | 'archived'

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
    case 'link':
    case 'autolink': {
      if (!hasValidChildren(value) || !isRecord(value.fields)) return false
      const { fields } = value
      return (fields.linkType === 'custom' || fields.linkType === 'internal') &&
        (fields.newTab === undefined || typeof fields.newTab === 'boolean') &&
        (fields.url === undefined || typeof fields.url === 'string')
    }
    case 'relationship':
      return typeof value.relationTo === 'string' &&
        (typeof value.value === 'string' || typeof value.value === 'number' || isRecord(value.value))
    case 'upload':
      return typeof value.relationTo === 'string' && isRecord(value.fields) &&
        (typeof value.value === 'string' || typeof value.value === 'number' || isRecord(value.value))
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
  tags: string[]
  coverImage: CoverImage
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
  featured: boolean
  coverImage: CoverImage
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
}

export interface ChangelogSummary {
  slug: string
  title: string
  version: string | null
  excerpt: string
  publishedAt: string
  tags: string[]
  coverImage: CoverImage
}

export interface Changelog extends ChangelogSummary {
  content: LexicalContent | null
  seo: SEOOverrides
}

export interface ListPostsInput {
  page: number
  limit: number
}

export interface BlogReader {
  listPublished(input: ListPostsInput): Promise<Page<PostSummary>>
  getPublishedBySlug(slug: string): Promise<Post | null>
}

export interface ProjectReader {
  listPublished(): Promise<ProjectSummary[]>
  getPublishedBySlug(slug: string): Promise<Project | null>
}

export interface ChangelogReader {
  listPublished(input: ListPostsInput): Promise<Page<ChangelogSummary>>
  getPublishedBySlug(slug: string): Promise<Changelog | null>
}
