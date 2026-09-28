import type { SQL } from 'drizzle-orm'
import type { ProjectCatalogBreakdownEntry, ProjectCatalogQuery, ProjectCatalogRecord } from '../project-catalog'
import type { KnowledgeProjectCatalogMetadata } from '../source-types'
import type { KnowledgeCandidate, KnowledgeSourceReference, KnowledgeSourceType } from '../types'

export interface KnowledgeChunk {
  source: KnowledgeSourceReference
  chunkIndex: number
  text: string
  contentHash: string
  embedding: number[]
  isPublic: boolean
  sourceUpdatedAt: Date | null
}

export type KnowledgeProjectRecord = ProjectCatalogRecord & { mostStarred: boolean }

export interface QueryResult {
  rows?: unknown[]
}

export interface KnowledgeExecutor {
  execute(query: SQL): Promise<QueryResult>
}

export interface KnowledgeDatabase extends KnowledgeExecutor {
  transaction<T>(callback: (transaction: KnowledgeExecutor) => Promise<T>): Promise<T>
}

export interface KnowledgeIndexRepository {
  upsertSourceChunks(
    source: KnowledgeSourceReference,
    chunks: KnowledgeChunk[],
    projectCatalog?: KnowledgeProjectCatalogMetadata,
  ): Promise<void>
  removeSource(sourceType: KnowledgeSourceType, sourceId: string): Promise<void>
  listSourceIds(sourceType: KnowledgeSourceType): Promise<string[]>
  listOwnedProjects(query: ProjectCatalogQuery): Promise<{
    projects: KnowledgeProjectRecord[]
    hasMore: boolean
    /** Total rows matching the active filters, computed before LIMIT. */
    matchingTotal: number
    /** Visibility/kind/topic counts over the same filtered set. */
    breakdown: ProjectCatalogBreakdownEntry[]
  }>
  upsertOwnedProjectCatalogEntries(
    entries: Array<{
      sourceType: 'github' | 'github-private'
      sourceId: string
      title: string
      url: string
      isPublic: boolean
      metadata: KnowledgeProjectCatalogMetadata
    }>,
  ): Promise<void>
  search(vector: number[], limit: number): Promise<KnowledgeCandidate[]>
  searchExactProjectName?(name: string, limit: number): Promise<KnowledgeCandidate[]>
  searchByKeyword?(keyword: string, limit: number): Promise<KnowledgeCandidate[]>
}
