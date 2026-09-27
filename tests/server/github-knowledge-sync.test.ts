import { describe, expect, it } from 'bun:test'

import { syncGithubRepositoryReports, type GithubKnowledgeSyncDependencies } from '../../src/server/knowledge/github/knowledge-sync'
import type { KnowledgeDocument } from '../../src/server/knowledge/source-types'
import type { GithubRepositoryAnalysis } from '../../src/server/knowledge/github/repository-analysis'

const analysis: GithubRepositoryAnalysis = {
  repository: { fullName: 'lst97/demo', url: 'https://github.com/lst97/demo', isPrivate: true },
  purpose: { value: 'A useful local tool.', evidence: ['README.md'], inferred: false },
  problem: { value: 'A manual task needs simplifying.', evidence: ['README.md'], inferred: true },
  features: [], files: { total: 1, source: 0, tests: 0, docs: 1, configuration: 0, assetsAndOther: 0 },
  technology: [], patterns: [],
  structure: { directories: [], representativeFiles: [] }, inspectedSourceFileCount: 0,
  implementationEvidence: [], limitations: [],
}

function setup(options: { inventoryComplete?: boolean; failures?: Set<string> } = {}) {
  const writes: Array<{ path: string; text: string }> = []
  const indexed: KnowledgeDocument[] = []
  const removed: Array<{ type: string; id: string }> = []
  const logs: unknown[] = []
  const dependencies: GithubKnowledgeSyncDependencies = {
    rootDirectory: '/data/github',
    inventoryComplete: options.inventoryComplete ?? true,
    repositories: [
      { fullName: 'lst97/public-app', url: 'https://github.com/lst97/public-app', name: 'public-app', isPrivate: false, sourceKind: 'owned' },
      { fullName: 'lst97/private-app', url: 'https://github.com/lst97/private-app', name: 'private-app', isPrivate: true, sourceKind: 'owned' },
      { fullName: 'community/tool', url: 'https://github.com/community/tool', name: 'tool', isPrivate: true, sourceKind: 'contribution' },
    ],
    async inspect(repository) {
      if (options.failures?.has(repository.fullName)) throw new Error(`private raw error ${repository.fullName}`)
      return { trackedPaths: [], files: [] }
    },
    analyze: (_snapshot, repository) => ({
      ...analysis,
      repository: { fullName: repository.fullName, url: repository.url, isPrivate: repository.isPrivate, description: repository.description },
    }),
    render: ({ analysis: input, sourceKind, contribution }) => ({
      document: {
        source: { type: sourceKind === 'owned' ? (input.repository.isPrivate ? 'github-private' : 'github') : input.repository.isPrivate ? 'github-contrib-private' : 'github-contrib', sourceId: input.repository.fullName, title: input.repository.fullName, url: input.repository.url },
        text: 'safe summary', isPublic: !input.repository.isPrivate, sourceUpdatedAt: null,
      },
      markdown: `safe ${contribution ? 'contribution' : 'owned'} summary`,
    }),
    async writeAtomically(path, text) { writes.push({ path, text }) },
    async index(document) { indexed.push(document) },
    async listSourceIds(type) {
      if (type === 'github') return ['lst97/deleted-public']
      return []
    },
    async removeSource(type, id) { removed.push({ type, id }) },
    logger: { debug: (...args) => logs.push(args), info: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  }
  return { dependencies, writes, indexed, removed, logs }
}

describe('GitHub repository report sync', () => {
  it('writes visibility-separated reports and indexes private documents as non-public', async () => {
    const state = setup()
    const result = await syncGithubRepositoryReports(state.dependencies)

    expect(result).toMatchObject({ writtenCount: 3, indexedCount: 3, failedCount: 0, staleRemovedCount: 1, complete: true })
    expect(state.writes.map(({ path }) => path)).toEqual([
      '/data/github/public/public-app.md',
      '/data/github/private/private-app.md',
      '/data/github/contributions/private/community__tool.md',
    ])
    expect(state.indexed.filter(({ isPublic }) => !isPublic)).toHaveLength(2)
    expect(state.removed).toEqual([{ type: 'github', id: 'lst97/deleted-public' }])
  })

  it('preserves failed repository outputs and skips stale cleanup for incomplete inventories', async () => {
    const state = setup({ inventoryComplete: false, failures: new Set(['lst97/private-app']) })
    const result = await syncGithubRepositoryReports(state.dependencies)

    expect(result).toMatchObject({ writtenCount: 2, indexedCount: 2, failedCount: 1, staleRemovedCount: 0, complete: false, failedByStage: { inspection: 1 } })
    expect(state.writes.map(({ path }) => path)).not.toContain('/data/github/private/private-app.md')
    expect(state.removed).toEqual([])
    expect(JSON.stringify(state.logs)).not.toContain('lst97/private-app')
    expect(JSON.stringify(state.logs)).not.toContain('private raw error')
  })

  it('does not overwrite or index a report when rendering the safety check fails', async () => {
    const state = setup()
    state.dependencies.render = () => { throw new Error('GitHub summary failed the content safety check') }
    const result = await syncGithubRepositoryReports(state.dependencies)

    expect(result.failedCount).toBe(3)
    expect(state.writes).toEqual([])
    expect(state.indexed).toEqual([])
  })

  it('keeps the prior report when that report cannot be indexed', async () => {
    const state = setup()
    state.dependencies.index = async (document) => {
      if (document.source.sourceId === 'lst97/public-app') throw new Error('database write failed')
      state.indexed.push(document)
    }

    const result = await syncGithubRepositoryReports(state.dependencies)

    expect(result).toMatchObject({ writtenCount: 2, indexedCount: 2, failedCount: 1, failedByStage: { index: 1 } })
    expect(state.writes.map(({ path }) => path)).not.toContain('/data/github/public/public-app.md')
    expect(state.indexed.map(({ source }) => source.sourceId)).not.toContain('lst97/public-app')
    expect(state.removed).not.toContainEqual({ type: 'github', id: 'lst97/public-app' })
  })

  it('applies the final secret scan before writing or indexing even if a renderer omits it', async () => {
    const state = setup()
    state.dependencies.render = () => ({
      document: {
        source: { type: 'github', sourceId: 'lst97/public-app', title: 'public-app', url: 'https://github.com/lst97/public-app' },
        text: 'OPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnopqrstuvwxyz123456', isPublic: true, sourceUpdatedAt: null,
      },
      markdown: '# Repo\nOPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnopqrstuvwxyz123456',
    })
    const result = await syncGithubRepositoryReports(state.dependencies)

    expect(result.failedCount).toBe(3)
    expect(state.writes).toEqual([])
    expect(state.indexed).toEqual([])
  })

  it('can retry missing reports without reconciling stale sources', async () => {
    const state = setup()
    state.dependencies.repositories = []
    state.dependencies.allowStaleCleanup = false
    const result = await syncGithubRepositoryReports(state.dependencies)

    expect(result.complete).toBe(true)
    expect(result.staleRemovedCount).toBe(0)
    expect(state.removed).toEqual([])
  })
})
