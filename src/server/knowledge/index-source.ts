import type { Logger } from '../observability/logger'
import type { EmbeddingPort } from './types'
import type { KnowledgeIndexRepository } from './repository'
import type { KnowledgeDocument, KnowledgeSource } from './source-types'
import { chunkKnowledgeDocument } from './chunking'

export interface IndexKnowledgeSourceDependencies {
  source: KnowledgeSource
  embedding: EmbeddingPort
  repository: KnowledgeIndexRepository
  logger: Logger
  now?: () => number
}

export interface IndexKnowledgeSourceResult {
  status: 'indexed' | 'removed'
  chunkCount: number
}

export interface IndexKnowledgeSource {
  execute(sourceId: string): Promise<IndexKnowledgeSourceResult>
  executeDocument(document: KnowledgeDocument): Promise<IndexKnowledgeSourceResult>
}

export function createIndexKnowledgeSource(dependencies: IndexKnowledgeSourceDependencies): IndexKnowledgeSource {
  const now = dependencies.now ?? (() => performance.now())

  const indexDocument = async (document: KnowledgeDocument, startedAt: number, allowPrivate: boolean): Promise<IndexKnowledgeSourceResult> => {
    const { source } = document
    const loggedSourceId = document.isPublic ? source.sourceId : '[private]'
    if (source.type !== dependencies.source.type) throw new Error('Knowledge source type does not match indexer')
    if (!document.isPublic && !allowPrivate) {
      await dependencies.repository.removeSource(source.type, source.sourceId)
      dependencies.logger.info('knowledge.index.deleted', { sourceType: source.type, sourceId: loggedSourceId, reason: 'not_public' })
      return { status: 'removed', chunkCount: 0 }
    }

    const chunks = chunkKnowledgeDocument(document)
    if (chunks.length === 0) {
      await dependencies.repository.removeSource(source.type, source.sourceId)
      dependencies.logger.info('knowledge.index.deleted', { sourceType: source.type, sourceId: loggedSourceId, reason: 'empty_content' })
      return { status: 'removed', chunkCount: 0 }
    }

    dependencies.logger.info('knowledge.index.started', { sourceType: source.type, sourceId: loggedSourceId, chunkCount: chunks.length })
    let stage: 'embedding' | 'repository' = 'embedding'
    try {
      const embeddedChunks = []
      for (const chunk of chunks) {
        const embedding = await dependencies.embedding.embed({ text: chunk.text, kind: 'document' })
        if (embedding.length !== 1024 || embedding.some((value) => !Number.isFinite(value))) {
          throw new Error('Invalid embedding vector')
        }
        embeddedChunks.push({ ...chunk, embedding })
      }

      stage = 'repository'
      await dependencies.repository.upsertSourceChunks(source, embeddedChunks, document.projectCatalog)
      dependencies.logger.info('knowledge.index.completed', {
        sourceType: source.type,
        sourceId: loggedSourceId,
        chunkCount: embeddedChunks.length,
        durationMs: Math.max(0, Math.round(now() - startedAt)),
      })
      return { status: 'indexed', chunkCount: embeddedChunks.length }
    } catch {
      dependencies.logger.error('knowledge.index.failed', { sourceType: source.type, sourceId: loggedSourceId, stage })
      if (stage === 'embedding') throw new Error('Knowledge source embedding failed')
      throw new Error('Knowledge source persistence failed')
    }
  }

  return {
    async execute(sourceId) {
      if (!sourceId.trim()) throw new Error('Knowledge source ID is required')
      const startedAt = now()
      let document: KnowledgeDocument | null
      try {
        document = await dependencies.source.fetch(sourceId)
      } catch {
        dependencies.logger.error('knowledge.index.failed', { sourceType: dependencies.source.type, sourceId, stage: 'fetch' })
        throw new Error('Knowledge source fetch failed')
      }
      if (!document) {
        await dependencies.repository.removeSource(dependencies.source.type, sourceId)
        dependencies.logger.info('knowledge.index.deleted', { sourceType: dependencies.source.type, sourceId, reason: 'not_found' })
        return { status: 'removed', chunkCount: 0 }
      }
      if (document.source.sourceId !== sourceId) throw new Error('Knowledge source returned mismatched identity')
      return indexDocument(document, startedAt, false)
    },
    async executeDocument(document) {
      return indexDocument(document, now(), true)
    },
  }
}
