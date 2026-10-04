import { lexicalToPlainText } from './chunking'
import type { KnowledgeDocument, KnowledgeSource } from './source-types'

const MAX_PREFIX_DESCRIPTION_CHARS = 300

/**
 * The document title and its excerpt/summary are the context a chunk loses once
 * it is split out of the document body, so they are repeated on every chunk.
 * `KnowledgeSourceReference.type` is stored on the row but is not part of the
 * chunk text, so a project chunk otherwise reaches the responder with nothing
 * marking it as describing a shipped build rather than an article.
 */
function buildChunkContextPrefix(type: 'post' | 'project', title: string, description: string): string | undefined {
  if (!title) return undefined
  const heading = type === 'post' ? `## ${title}` : `## Project\n\n### ${title}`
  const truncated =
    description.length > MAX_PREFIX_DESCRIPTION_CHARS
      ? description.slice(0, MAX_PREFIX_DESCRIPTION_CHARS).replace(/\s+\S*$/, '')
      : description
  return truncated ? `${heading}\n\n${truncated}` : heading
}
export interface PayloadKnowledgeRecord {
  id: string | number
  title?: unknown
  slug?: unknown
  status?: unknown
  publishedAt?: unknown
  updatedAt?: unknown
  excerpt?: unknown
  summary?: unknown
  content?: unknown
}

export interface PayloadKnowledgeSourceConfig {
  type: 'post' | 'project'
  publicSiteUrl: string
  findById(sourceId: string): Promise<PayloadKnowledgeRecord | null>
  findAll?(): Promise<PayloadKnowledgeRecord[]>
  now?: () => Date
}

export function createPayloadKnowledgeSource(
  config: PayloadKnowledgeSourceConfig,
): KnowledgeSource & { listDocuments(): Promise<KnowledgeDocument[]> } {
  const collectionPath = config.type === 'post' ? 'blog' : 'projects'
  const publicBaseUrl = config.publicSiteUrl.replace(/\/+$/, '')
  const now = config.now ?? (() => new Date())

  const source: KnowledgeSource = {
    type: config.type,
    async fetch(sourceId): Promise<KnowledgeDocument | null> {
      const record = await config.findById(sourceId)
      if (!record || String(record.id) !== sourceId) return null

      const title = typeof record.title === 'string' ? record.title.trim() : ''
      const slug = typeof record.slug === 'string' ? record.slug.trim() : ''
      const publishedAt = typeof record.publishedAt === 'string' ? new Date(record.publishedAt) : null
      const currentTime = now()
      const isPublic =
        record.status === 'published' &&
        Boolean(title && slug) &&
        publishedAt !== null &&
        Number.isFinite(publishedAt.valueOf()) &&
        publishedAt <= currentTime

      const descriptionValue = config.type === 'post' ? record.excerpt : record.summary
      const description = typeof descriptionValue === 'string' ? descriptionValue.trim() : ''
      const text = [title, description, lexicalToPlainText(record.content)]
        .map((part) => part.trim())
        .filter(Boolean)
        .join('\n\n')
        .replace(/[\t ]+\n/g, '\n')
      const updatedAt = typeof record.updatedAt === 'string' ? new Date(record.updatedAt) : null

      return {
        source: {
          type: config.type,
          sourceId,
          title: title || 'Untitled content',
          url: `${publicBaseUrl}/${collectionPath}/${encodeURIComponent(slug)}`,
        },
        text,
        headingDelimited: true,
        chunkContextPrefix: buildChunkContextPrefix(config.type, title, description),
        isPublic,
        sourceUpdatedAt: updatedAt && Number.isFinite(updatedAt.valueOf()) ? updatedAt : publishedAt,
      }
    },
  }
  return Object.assign(source, {
    listDocuments: async () => {
      if (!config.findAll) throw new Error('Payload knowledge source list is not configured')
      const records = await config.findAll()
      const documents = await Promise.all(records.map((record) => source.fetch(String(record.id))))
      return documents.filter((document): document is KnowledgeDocument => document !== null)
    },
  })
}
