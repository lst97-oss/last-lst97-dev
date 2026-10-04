import type { Logger } from '../observability/logger'
import { chunkHeadingDelimitedDocument, chunkKnowledgeDocument } from './chunking'
import type { KnowledgeIndexRepository } from './repository'
import type { KnowledgeDocument, KnowledgeSource } from './source-types'
import type { EmbeddingPort } from './types'

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

  const indexDocument = async (
    document: KnowledgeDocument,
    startedAt: number,
    allowPrivate: boolean,
  ): Promise<IndexKnowledgeSourceResult> => {
    const { source } = document
    const loggedSourceId = document.isPublic ? source.sourceId : '[private]'
    if (source.type !== dependencies.source.type) throw new Error('Knowledge source type does not match indexer')
    if (!document.isPublic && !allowPrivate) {
      await dependencies.repository.removeSource(source.type, source.sourceId)
      dependencies.logger.info('knowledge.index.deleted', {
        sourceType: source.type,
        sourceId: loggedSourceId,
        reason: 'not_public',
      })
      return { status: 'removed', chunkCount: 0 }
    }

    const chunks = document.headingDelimited
      ? chunkHeadingDelimitedDocument(document)
      : chunkKnowledgeDocument(document)
    if (chunks.length === 0) {
      await dependencies.repository.removeSource(source.type, source.sourceId)
      dependencies.logger.info('knowledge.index.deleted', {
        sourceType: source.type,
        sourceId: loggedSourceId,
        reason: 'empty_content',
      })
      return { status: 'removed', chunkCount: 0 }
    }

    // A chunk whose text is byte-identical to the stored one already has the
    // vector that text produced, so re-embedding it only spends provider calls.
    // The upsert below still runs for every chunk, because a title or URL can
    // change while the body text does not.
    const storedChunks = new Map<number, { contentHash: string; embedding: number[] }>()
    try {
      for (const row of await dependencies.repository.listSourceChunkState(source.type, source.sourceId)) {
        storedChunks.set(row.chunkIndex, { contentHash: row.contentHash, embedding: row.embedding })
      }
    } catch {
      // Degrades to a full re-embed, which is exactly what a cold cache does.
      dependencies.logger.warn('knowledge.index.hash_lookup_failed', {
        sourceType: source.type,
        sourceId: loggedSourceId,
      })
    }

    dependencies.logger.info('knowledge.index.started', {
      sourceType: source.type,
      sourceId: loggedSourceId,
      chunkCount: chunks.length,
    })
    let stage: 'embedding' | 'repository' = 'embedding'
    try {
      const toEmbed = chunks.filter((chunk) => storedChunks.get(chunk.chunkIndex)?.contentHash !== chunk.contentHash)
      const vectors =
        toEmbed.length === 0
          ? []
          : await dependencies.embedding.embedMany({
              texts: toEmbed.map((chunk) => chunk.text),
              kind: 'document',
            })
      const embeddedChunks = []
      let embeddedPosition = 0
      for (const chunk of chunks) {
        const stored = storedChunks.get(chunk.chunkIndex)
        const embedding = stored?.contentHash === chunk.contentHash ? stored.embedding : vectors[embeddedPosition++]
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
        dependencies.logger.error('knowledge.index.failed', {
          sourceType: dependencies.source.type,
          sourceId,
          stage: 'fetch',
        })
        throw new Error('Knowledge source fetch failed')
      }
      if (!document) {
        await dependencies.repository.removeSource(dependencies.source.type, sourceId)
        dependencies.logger.info('knowledge.index.deleted', {
          sourceType: dependencies.source.type,
          sourceId,
          reason: 'not_found',
        })
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
