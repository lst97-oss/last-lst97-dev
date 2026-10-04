import { describe, expect, it } from 'bun:test'

import { createIndexKnowledgeSource } from '../../src/server/knowledge/index-source'
import type { KnowledgeChunk } from '../../src/server/knowledge/repository'
import type { KnowledgeDocument, KnowledgeSource } from '../../src/server/knowledge/source-types'
import type { EmbeddingPort, KnowledgeSourceReference } from '../../src/server/knowledge/types'

const sourceRef: KnowledgeSourceReference = {
  type: 'post',
  sourceId: 'post-7',
  title: 'Reliable services',
  url: 'https://example.test/blog/reliable-services',
}
const publishedDocument: KnowledgeDocument = {
  source: sourceRef,
  text: 'A useful article about reliable service design. '.repeat(50),
  isPublic: true,
  sourceUpdatedAt: new Date('2026-09-22T00:00:00Z'),
}
const vector = Array.from({ length: 1024 }, (_, index) => (index === 0 ? 1 : 0))

function dependencies(
  overrides: Partial<{
    document: KnowledgeDocument | null
    sourceType: KnowledgeDocument['source']['type']
    embed: EmbeddingPort['embed']
    embedMany: EmbeddingPort['embedMany']
    storedChunks: Array<{ chunkIndex: number; contentHash: string; embedding: number[] }>
    listSourceChunkStateFails?: boolean
  }> = {},
) {
  const calls = {
    storedChunkQueries: 0,
    embedded: [] as string[],
    upserts: [] as KnowledgeChunk[][],
    catalogEntries: [] as unknown[],
    removed: [] as string[],
    logs: [] as string[],
    loggedSourceIds: [] as unknown[],
  }
  const source: KnowledgeSource = {
    type: overrides.sourceType ?? 'post',
    fetch: async () => (overrides.document === undefined ? publishedDocument : overrides.document),
  }
  const repository = {
    upsertSourceChunks: async (
      _source: KnowledgeSourceReference,
      chunks: KnowledgeChunk[],
      projectCatalog?: unknown,
    ) => {
      calls.upserts.push(chunks)
      calls.catalogEntries.push(projectCatalog)
    },
    removeSource: async (_type: string, sourceId: string) => {
      calls.removed.push(sourceId)
    },
    listSourceIds: async () => [],
    listSourceChunkState: async () => {
      calls.storedChunkQueries += 1
      if (overrides.listSourceChunkStateFails) throw new Error('chunk state unavailable')
      return overrides.storedChunks ?? []
    },
    listOwnedProjects: async () => ({ projects: [], hasMore: false, matchingTotal: 0, breakdown: [] }),
    upsertOwnedProjectCatalogEntries: async () => {},
    search: async () => [],
  }
  const embedding: EmbeddingPort = {
    embed: async ({ text }) => {
      calls.embedded.push(text)
      return overrides.embed ? overrides.embed({ text, kind: 'document' }) : vector
    },
    embedMany: async ({ texts }) => {
      calls.embedded.push(...texts)
      if (overrides.embedMany) return overrides.embedMany({ texts, kind: 'document' })
      return texts.map(() => vector)
    },
  }
  const recordLog = (event: string, fields?: Record<string, unknown>) => {
    calls.logs.push(event)
    calls.loggedSourceIds.push(fields?.sourceId)
  }
  const logger = { debug: recordLog, info: recordLog, warn: recordLog, error: recordLog }
  return { calls, source, repository, embedding, logger }
}

describe('IndexKnowledgeSource', () => {
  it('indexes an externally fetched public document without fetching it a second time', async () => {
    const deps = dependencies()
    const indexer = createIndexKnowledgeSource(deps)

    const result = await indexer.executeDocument(publishedDocument)

    expect(result.status).toBe('indexed')
    expect(deps.calls.upserts).toHaveLength(1)
    expect(deps.calls.embedded.length).toBeGreaterThan(1)
  })

  it('stores private direct documents as non-public chunks instead of deleting them', async () => {
    const deps = dependencies({ sourceType: 'github-private' })
    const indexer = createIndexKnowledgeSource(deps)
    const document: KnowledgeDocument = {
      source: {
        type: 'github-private',
        sourceId: 'lst97/internal-tool',
        title: 'Internal Tool',
        url: 'https://github.com/lst97/internal-tool',
      },
      text: 'Private project notes for owner-only retrieval.',
      isPublic: false,
      sourceUpdatedAt: null,
    }

    const result = await indexer.executeDocument(document)

    expect(result.status).toBe('indexed')
    expect(deps.calls.upserts).toHaveLength(1)
    expect(deps.calls.upserts[0]?.every((chunk) => !chunk.isPublic)).toBe(true)
    expect(deps.calls.removed).toHaveLength(0)
    expect(deps.calls.loggedSourceIds).not.toContain('lst97/internal-tool')
    expect(deps.calls.loggedSourceIds).toContain('[private]')
  })

  it('persists owned-project catalogue metadata with the indexed report chunks', async () => {
    const deps = dependencies({ sourceType: 'github' })
    const indexer = createIndexKnowledgeSource(deps)
    const document: KnowledgeDocument = {
      source: { type: 'github', sourceId: 'lst97/tool', title: 'Tool', url: 'https://github.com/lst97/tool' },
      text: '# Tool report',
      isPublic: true,
      sourceUpdatedAt: null,
      projectCatalog: {
        summary: 'A command line tool.',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: null,
        stars: 3,
        forks: 1,
        primaryLanguage: 'Rust',
        languages: ['Rust'],
        kinds: ['cli_tool'],
        githubTopics: ['cli'],
        curatedTopics: ['developer-tool'],
      },
    }

    await indexer.executeDocument(document)

    expect(deps.calls.catalogEntries).toEqual([document.projectCatalog])
  })

  it('embeds and atomically replaces chunks only for a public source', async () => {
    const deps = dependencies()
    const indexer = createIndexKnowledgeSource(deps)

    const result = await indexer.execute('post-7')

    expect(result.status).toBe('indexed')
    expect(deps.calls.embedded.length).toBeGreaterThan(1)
    expect(deps.calls.upserts).toHaveLength(1)
    expect(deps.calls.upserts[0]?.every(({ embedding }) => embedding.length === 1024)).toBe(true)
    expect(deps.calls.removed).toHaveLength(0)
    expect(deps.calls.logs).toContain('knowledge.index.completed')
  })

  it('removes chunks for missing or unpublished source records', async () => {
    const missing = dependencies({ document: null })
    await createIndexKnowledgeSource(missing).execute('post-7')
    expect(missing.calls.removed).toEqual(['post-7'])

    const unpublished = dependencies({ document: { ...publishedDocument, isPublic: false } })
    await createIndexKnowledgeSource(unpublished).execute('post-7')
    expect(unpublished.calls.removed).toEqual(['post-7'])
    expect(unpublished.calls.embedded).toHaveLength(0)
  })

  it('keeps last-known-good chunks when any embedding fails', async () => {
    const failing = dependencies({
      embedMany: async () => {
        throw new Error('provider secret details')
      },
    })
    const indexer = createIndexKnowledgeSource(failing)

    await expect(indexer.execute('post-7')).rejects.toThrow('Knowledge source embedding failed')
    expect(failing.calls.upserts).toHaveLength(0)
    expect(failing.calls.removed).toHaveLength(0)
    expect(failing.calls.logs).toContain('knowledge.index.failed')
  })

  it('removes public records that normalize to no indexable text', async () => {
    const empty = dependencies({ document: { ...publishedDocument, text: ' \n ' } })
    const result = await createIndexKnowledgeSource(empty).execute('post-7')
    expect(result.status).toBe('removed')
    expect(empty.calls.removed).toEqual(['post-7'])
    expect(empty.calls.embedded).toHaveLength(0)
  })

  it('reuses every stored vector when no chunk text changed, and still upserts', async () => {
    const probe = dependencies()
    const indexer = createIndexKnowledgeSource(probe)
    await indexer.execute('post-7')
    const storedVectors = probe.calls.upserts[0]?.map((chunk) => chunk.embedding) ?? []
    const storedHashes = probe.calls.upserts[0]?.map((chunk) => chunk.contentHash) ?? []
    expect(storedHashes.length).toBeGreaterThan(1)

    const unchanged = dependencies({
      storedChunks: storedHashes.map((contentHash, chunkIndex) => ({
        chunkIndex,
        contentHash,
        embedding: storedVectors[chunkIndex] ?? vector,
      })),
    })
    const result = await createIndexKnowledgeSource(unchanged).execute('post-7')

    expect(unchanged.calls.storedChunkQueries).toBe(1)
    expect(unchanged.calls.embedded).toHaveLength(0)
    expect(result).toEqual({ status: 'indexed', chunkCount: storedHashes.length })
    expect(unchanged.calls.upserts[0]?.map((chunk) => chunk.embedding)).toEqual(storedVectors)
  })

  it('embeds only the chunks whose stored hash differs', async () => {
    const probe = dependencies()
    await createIndexKnowledgeSource(probe).execute('post-7')
    const storedHashes = probe.calls.upserts[0]?.map((chunk) => chunk.contentHash) ?? []
    const texts = probe.calls.embedded
    expect(storedHashes.length).toBeGreaterThan(1)

    const staleAt = 1
    const partial = dependencies({
      storedChunks: storedHashes.map((contentHash, chunkIndex) => ({
        chunkIndex,
        contentHash: chunkIndex === staleAt ? '0'.repeat(64) : contentHash,
        embedding: vector,
      })),
    })
    await createIndexKnowledgeSource(partial).execute('post-7')

    expect(partial.calls.embedded).toEqual([texts[staleAt]])
  })

  it('falls back to a full re-embed when the stored chunk state cannot be read', async () => {
    const degraded = dependencies({ listSourceChunkStateFails: true })
    const result = await createIndexKnowledgeSource(degraded).execute('post-7')

    expect(degraded.calls.logs).toContain('knowledge.index.hash_lookup_failed')
    expect(degraded.calls.embedded.length).toBeGreaterThan(0)
    expect(result.status).toBe('indexed')
    expect(degraded.calls.upserts[0]?.length).toBe(degraded.calls.embedded.length)
  })
})
