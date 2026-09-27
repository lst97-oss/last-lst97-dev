import type { Logger } from '../observability/logger'
import type { KnowledgeIndexRepository } from './repository'
import type { KnowledgeDocument, KnowledgeSource } from './source-types'
import type { KnowledgeSourceType } from './types'

export const KNOWLEDGE_SYNC_CRON = '0 0 * * *'

export interface KnowledgeIndexJobInput {
  sourceType: KnowledgeSourceType
  sourceId: string
}

export interface KnowledgeJobQueue {
  queue(input: {
    task: 'indexKnowledgeSource'
    queue: 'knowledge'
    input: KnowledgeIndexJobInput
    req?: unknown
    overrideAccess?: boolean
  }): Promise<unknown>
}

export async function enqueueKnowledgeSourceIndex(
  queue: KnowledgeJobQueue,
  sourceType: KnowledgeSourceType,
  sourceId: string | number,
  req?: unknown,
): Promise<void> {
  await queue.queue({
    task: 'indexKnowledgeSource',
    queue: 'knowledge',
    input: { sourceType, sourceId: String(sourceId) },
    ...(req ? { req } : {}),
    overrideAccess: true,
  })
}

export interface KnowledgeListSource extends Pick<KnowledgeSource, 'type'> {
  listDocuments(): Promise<KnowledgeDocument[]>
}

export interface KnowledgeDocumentIndexer {
  executeDocument(document: KnowledgeDocument): Promise<{ status: 'indexed' | 'removed'; chunkCount: number }>
}

export interface KnowledgeSourceSynchronizerDependencies {
  sources: KnowledgeListSource[]
  repository: Pick<KnowledgeIndexRepository, 'listSourceIds' | 'removeSource'>
  indexer: KnowledgeDocumentIndexer
  logger: Logger
}

export interface KnowledgeSourceSyncResult {
  indexedCount: number
  removedCount: number
}

export function createKnowledgeSourceSynchronizer(dependencies: KnowledgeSourceSynchronizerDependencies) {
  return {
    async execute(): Promise<KnowledgeSourceSyncResult> {
      let indexedCount = 0
      let removedCount = 0
      for (const source of dependencies.sources) {
        let documents: KnowledgeDocument[]
        try {
          documents = await source.listDocuments()
        } catch {
          dependencies.logger.error('knowledge.sync.failed', { sourceType: source.type, stage: 'fetch' })
          throw new Error('Knowledge source synchronization failed')
        }

        const currentIds = new Set(
          documents.filter(({ isPublic }) => isPublic).map(({ source: item }) => item.sourceId),
        )
        try {
          for (const document of documents) {
            const result = await dependencies.indexer.executeDocument(document)
            if (result.status === 'indexed') indexedCount += 1
            else removedCount += 1
          }

          const storedIds = await dependencies.repository.listSourceIds(source.type)
          for (const sourceId of storedIds) {
            if (currentIds.has(sourceId)) continue
            await dependencies.repository.removeSource(source.type, sourceId)
            removedCount += 1
          }
        } catch {
          dependencies.logger.error('knowledge.sync.failed', { sourceType: source.type, stage: 'index' })
          throw new Error('Knowledge source synchronization failed')
        }
      }

      dependencies.logger.info('knowledge.sync.completed', { indexedCount, removedCount })
      return { indexedCount, removedCount }
    },
  }
}
