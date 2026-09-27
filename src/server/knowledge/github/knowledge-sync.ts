import type { Logger } from '../../observability/logger'
import type { ProjectSoftwareKind } from '../project-catalog'
import type { KnowledgeDocument } from '../source-types'
import { assertSafeGithubMarkdown } from './content-safety'
import type { GithubContributionRepository } from './contributions'
import type { GithubRepositoryAnalysis } from './repository-analysis'
import type { GithubRepositorySnapshot } from './repository-inspector'
import { GithubRepositoryInspectionError } from './repository-inspector'

export interface GithubSyncRepository {
  fullName: string
  name: string
  url: string
  isPrivate: boolean
  ownerProvidedPurpose?: string
  description?: string | null
  topics?: string[]
  languages?: Array<{ name: string; bytes: number }>
  defaultBranch?: string | null
  updatedAt?: string | null
  primaryLanguage?: string | null
  license?: string | null
  homepage?: string | null
  createdAt?: string | null
  stars?: number
  forks?: number
  softwareKinds?: ProjectSoftwareKind[]
  curatedTopics?: string[]
  sourceKind: 'owned' | 'contribution'
  contribution?: GithubContributionRepository
  contributionCoverage?: { complete: boolean; incompleteReasons: string[] }
}

export interface GithubKnowledgeSyncDependencies {
  rootDirectory: string
  repositories: GithubSyncRepository[]
  inventoryComplete: boolean
  allowStaleCleanup?: boolean
  inspect(repository: GithubSyncRepository): Promise<GithubRepositorySnapshot>
  analyze(snapshot: GithubRepositorySnapshot, repository: GithubSyncRepository): GithubRepositoryAnalysis
  render(input: {
    analysis: GithubRepositoryAnalysis
    contribution?: GithubContributionRepository
    sourceKind: 'owned' | 'contribution'
    contributionCoverage?: { complete: boolean; incompleteReasons: string[] }
  }): { document: KnowledgeDocument; markdown: string }
  writeAtomically(path: string, text: string): Promise<void>
  index(document: KnowledgeDocument): Promise<void>
  listSourceIds(type: KnowledgeDocument['source']['type']): Promise<string[]>
  removeSource(type: KnowledgeDocument['source']['type'], id: string): Promise<void>
  logger: Logger
}

export interface GithubKnowledgeSyncResult {
  writtenCount: number
  indexedCount: number
  failedCount: number
  staleRemovedCount: number
  complete: boolean
  failedByStage: Record<'inspection' | 'analysis' | 'render' | 'metadata' | 'write' | 'index', number>
  failedByCategory: Record<string, number>
}

function safeFilename(name: string): string {
  if (!/^[A-Za-z0-9_.-]{1,150}$/.test(name) || name === '.' || name === '..')
    throw new Error('Repository name is invalid')
  return `${name}.md`
}

function reportDirectory(repository: GithubSyncRepository): string {
  const group = repository.sourceKind === 'owned' ? '' : '/contributions'
  const visibility = repository.isPrivate ? 'private' : 'public'
  return `${group}/${visibility}`
}

function reportType(repository: GithubSyncRepository): KnowledgeDocument['source']['type'] {
  if (repository.sourceKind === 'owned') return repository.isPrivate ? 'github-private' : 'github'
  return repository.isPrivate ? 'github-contrib-private' : 'github-contrib'
}

export async function syncGithubRepositoryReports(
  dependencies: GithubKnowledgeSyncDependencies,
): Promise<GithubKnowledgeSyncResult> {
  const result: GithubKnowledgeSyncResult = {
    writtenCount: 0,
    indexedCount: 0,
    failedCount: 0,
    staleRemovedCount: 0,
    complete: dependencies.inventoryComplete,
    failedByStage: { inspection: 0, analysis: 0, render: 0, metadata: 0, write: 0, index: 0 },
    failedByCategory: {},
  }
  const presentIds = new Map<KnowledgeDocument['source']['type'], Set<string>>()
  for (const repository of dependencies.repositories) {
    const type = reportType(repository)
    const ids = presentIds.get(type) ?? new Set<string>()
    ids.add(repository.fullName)
    presentIds.set(type, ids)
  }

  let nextRepository = 0
  const workerCount = Math.min(3, dependencies.repositories.length)
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextRepository++
        const repository = dependencies.repositories[index]
        if (!repository) return
        let stage: keyof GithubKnowledgeSyncResult['failedByStage'] = 'inspection'
        try {
          const snapshot = await dependencies.inspect(repository)
          stage = 'analysis'
          const analysis = dependencies.analyze(snapshot, repository)
          stage = 'render'
          const rendered = dependencies.render({
            analysis,
            ...(repository.contribution ? { contribution: repository.contribution } : {}),
            ...(repository.contributionCoverage ? { contributionCoverage: repository.contributionCoverage } : {}),
            sourceKind: repository.sourceKind,
          })
          assertSafeGithubMarkdown(rendered.markdown)
          stage = 'metadata'
          const expectedType = reportType(repository)
          if (
            rendered.document.source.type !== expectedType ||
            rendered.document.source.sourceId !== repository.fullName ||
            rendered.document.isPublic === repository.isPrivate
          )
            throw new Error('Repository report metadata is invalid')
          const reportName =
            repository.sourceKind === 'contribution' ? repository.fullName.replace('/', '__') : repository.name
          const path = `${dependencies.rootDirectory}${reportDirectory(repository)}/${safeFilename(reportName)}`
          stage = 'index'
          await dependencies.index(rendered.document)
          result.indexedCount += 1
          stage = 'write'
          await dependencies.writeAtomically(path, rendered.markdown)
          result.writtenCount += 1
        } catch (error) {
          result.failedCount += 1
          result.failedByStage[stage] += 1
          result.complete = false
          const failureCategory = error instanceof GithubRepositoryInspectionError ? error.category : 'refresh_failed'
          result.failedByCategory[failureCategory] = (result.failedByCategory[failureCategory] ?? 0) + 1
          dependencies.logger.warn('knowledge.github.repository_refresh_failed', {
            sourceKind: repository.sourceKind,
            isPrivate: repository.isPrivate,
            stage,
            failureCategory,
          })
        }
      }
    }),
  )

  if (dependencies.inventoryComplete && dependencies.allowStaleCleanup !== false) {
    const sourceTypes: KnowledgeDocument['source']['type'][] = [
      'github',
      'github-private',
      'github-contrib',
      'github-contrib-private',
    ]
    for (const sourceType of sourceTypes) {
      try {
        const storedIds = await dependencies.listSourceIds(sourceType)
        const currentIds = presentIds.get(sourceType) ?? new Set()
        for (const sourceId of storedIds) {
          if (!currentIds.has(sourceId)) {
            await dependencies.removeSource(sourceType, sourceId)
            result.staleRemovedCount += 1
          }
        }
      } catch {
        result.complete = false
        dependencies.logger.warn('knowledge.github.stale_cleanup_failed', { sourceType })
      }
    }
  }

  dependencies.logger.info('knowledge.github.repositories.completed', {
    writtenCount: result.writtenCount,
    indexedCount: result.indexedCount,
    failedCount: result.failedCount,
    failedByStage: result.failedByStage,
    failedByCategory: result.failedByCategory,
    staleRemovedCount: result.staleRemovedCount,
    inventoryComplete: dependencies.inventoryComplete,
  })
  return result
}
