import { describe, expect, it } from 'bun:test'
import { sql } from '@payloadcms/db-postgres'
import { PgDialect } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { migrateKnowledgeDatabase } from '../../src/server/knowledge/database-migration'
import { createKnowledgeIndexRepository } from '../../src/server/knowledge/repository'
import type { KnowledgeChunk } from '../../src/server/knowledge/repository'
import { projectCatalogFiltersSchema } from '../../src/server/knowledge/project-catalog'

const dialect = new PgDialect()

function createDatabase(rows: unknown[] = []) {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  let transactionCount = 0
  const execute = async (query: ReturnType<typeof sql>) => {
    queries.push(dialect.sqlToQuery(query))
    return { rows }
  }
  return {
    queries,
    get transactionCount() { return transactionCount },
    transaction: async <T>(callback: (tx: { execute: typeof execute }) => Promise<T>) => {
      transactionCount += 1
      return callback({ execute })
    },
    execute,
  }
}

const chunks: KnowledgeChunk[] = [
  {
    source: { type: 'post', sourceId: 'post-1', title: 'Typed APIs', url: 'https://example.test/blog/typed-apis' },
    chunkIndex: 0,
    text: 'I wrote about safe APIs.',
    contentHash: 'a'.repeat(64),
    embedding: Array.from({ length: 1024 }, (_, index) => index === 0 ? 1 : 0),
    isPublic: true,
    sourceUpdatedAt: new Date('2026-09-22T00:00:00Z'),
  },
  {
    source: { type: 'post', sourceId: 'post-1', title: 'Typed APIs', url: 'https://example.test/blog/typed-apis' },
    chunkIndex: 1,
    text: 'The second passage.',
    contentHash: 'b'.repeat(64),
    embedding: Array(1024).fill(0),
    isPublic: true,
    sourceUpdatedAt: new Date('2026-09-22T00:00:00Z'),
  },
]

describe('KnowledgeIndexRepository', () => {
  it('upserts current chunks and deletes stale source chunks in one transaction', async () => {
    const db = createDatabase()
    const repository = createKnowledgeIndexRepository(db)

    await repository.upsertSourceChunks(chunks[0]!.source, chunks)

    expect(db.transactionCount).toBe(1)
    expect(db.queries).toHaveLength(3)
    expect(db.queries.map(({ sql: statement }) => statement)).toEqual([
      expect.stringContaining('INSERT INTO "knowledge_chunks"'),
      expect.stringContaining('INSERT INTO "knowledge_chunks"'),
      expect.stringContaining('DELETE FROM "knowledge_chunks"'),
    ])
    expect(db.queries[0]?.sql).toContain('ON CONFLICT')
    expect(db.queries[0]?.sql).not.toContain(chunks[0]!.text)
    expect(db.queries[0]?.params).toContain(chunks[0]!.text)
  })

  it('removes every chunk for a source transactionally', async () => {
    const db = createDatabase()
    const repository = createKnowledgeIndexRepository(db)

    await repository.removeSource('post', 'post-1')

    expect(db.transactionCount).toBe(1)
    expect(db.queries[0]?.sql).toContain('DELETE FROM "knowledge_chunks"')
    expect(db.queries[0]?.params).toEqual(['post', 'post-1'])
  })

  it('lists distinct source identities for bounded external source reconciliation', async () => {
    const db = createDatabase([{ source_id: 'lst97/tool' }, { source_id: 'lst97/another' }])
    const repository = createKnowledgeIndexRepository(db)

    const result = await repository.listSourceIds('github')

    expect(db.queries[0]?.sql).toContain('SELECT DISTINCT "source_id"')
    expect(db.queries[0]?.params).toEqual(['github'])
    expect(result).toEqual(['lst97/tool', 'lst97/another'])
  })

  // Every type the DB CHECK and `KnowledgeSourceType` allow must survive
  // `validateSourceType`. Dropping one turns a legitimate index or delete into a
  // thrown "invalid" at the persistence boundary, where nothing names the type
  // that was rejected.
  it('accepts every source type the knowledge chunk CHECK constraint allows', async () => {
    const db = createDatabase()
    const repository = createKnowledgeIndexRepository(db)

    for (const sourceType of ['post', 'project', 'profile', 'interview', 'github', 'github-private', 'github-profile', 'github-contrib', 'github-contrib-private', 'wakatime'] as const) {
      await repository.removeSource(sourceType, 'source-1')
    }

    expect(db.transactionCount).toBe(10)
    // `removeSource` also clears the catalogue row for owner-repository types,
    // so the chunk DELETE is not always the first statement. Filtering to the
    // chunk delete keeps this about which types are accepted, not query order.
    const chunkDeletes = db.queries.filter(({ sql: statement }) => statement.includes('DELETE FROM "knowledge_chunks"'))
    expect(chunkDeletes.map(({ params }) => params[0])).toEqual([
      'post', 'project', 'profile', 'interview', 'github',
      'github-private', 'github-profile', 'github-contrib', 'github-contrib-private', 'wakatime',
    ])
  })

  it('lists structured owned repositories and preserves private visibility', async () => {
    const db = createDatabase([
      {
        source_type: 'github', source_id: 'lst97/public-tool', title: 'public-tool', url: 'https://github.com/lst97/public-tool', is_public: true,
        summary: 'Public purpose.', created_at: null, updated_at: null, stars: null, forks: null,
        primary_language: null, languages: [], software_kinds: [], github_topics: [], curated_topics: [], time_spent_seconds: null, most_starred: false, matching_total: 2,
      },
      {
        source_type: 'github-private', source_id: 'lst97/private-tool', title: 'private-tool', url: 'https://github.com/lst97/private-tool', is_public: false,
        summary: 'Private purpose.', created_at: null, updated_at: null, stars: null, forks: null,
        primary_language: null, languages: [], software_kinds: [], github_topics: [], curated_topics: [], time_spent_seconds: null, most_starred: false, matching_total: 2,
      },
    ])
    const repository = createKnowledgeIndexRepository(db)

    const result = await repository.listOwnedProjects({
      ...projectCatalogFiltersSchema.parse({}), exclude_source_ids: [], first_batch: false,
    })

    expect(db.queries[0]?.sql).toContain('FROM "knowledge_projects"')
    expect(db.queries[0]?.sql).toContain('p."source_type" IN (\'github\', \'github-private\')')
    expect(db.queries[0]?.sql).not.toContain('github-contrib')
    expect(result.projects.map(({ sourceId, isPublic }) => [sourceId, isPublic])).toEqual([
      ['lst97/public-tool', true], ['lst97/private-tool', false],
    ])
    expect(result.hasMore).toBe(false)
  })

  it('filters the structured owned-project catalogue and joins exact WakaTime project totals', async () => {
    const db = createDatabase([{
      source_type: 'github', source_id: 'lst97/python-tool', title: 'python-tool',
      url: 'https://github.com/lst97/python-tool', is_public: true,
      summary: 'A Python command line app.', created_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2026-09-10T00:00:00.000Z', stars: 4, forks: 2,
      primary_language: 'Python', languages: ['Python', 'Rust'],
      software_kinds: ['cli_tool'], github_topics: ['cli'], curated_topics: ['developer-tool'],
      time_spent_seconds: 7_200, most_starred: true, matching_total: 1,
    }])
    const repository = createKnowledgeIndexRepository(db)
    const filters = projectCatalogFiltersSchema.parse({
      languages: ['Python'], kinds: ['cli_tool'], topics: ['developer-tool'],
      min_stars: 1, time_spent_from: '2024-01-01', sort_by: 'time_spent', limit: 5,
    })

    const results = await repository.listOwnedProjects({
      ...filters, exclude_source_ids: ['lst97/already-listed'], first_batch: false,
    })

    const statement = db.queries[0]?.sql ?? ''
    expect(statement).toContain('FROM "knowledge_projects"')
    expect(statement).toContain('wakatime_daily_projects')
    expect(statement).toContain('github_topics')
    expect(statement).toContain('software_kinds')
    expect(statement).toContain('<> ALL')
    expect(db.queries[0]?.params).toContain('lst97/already-listed')
    expect(db.queries[0]?.params).toContain('developer-tool')
    expect(db.queries[0]?.params).toContain('2024-01-01')
    expect(results.projects[0]).toMatchObject({
      sourceId: 'lst97/python-tool', languages: ['Python', 'Rust'], kinds: ['cli_tool'],
      timeSpentSeconds: 7_200, mostStarred: true,
    })
  })

  it('computes a filter-aware total and a deduped breakdown alongside the page', async () => {
    const db = createDatabase([{
      source_type: 'github', source_id: 'lst97/python-tool', title: 'python-tool',
      url: 'https://github.com/lst97/python-tool', is_public: true,
      summary: 'A Python command line app.', created_at: null, updated_at: null, stars: 4, forks: 2,
      primary_language: 'Python', languages: ['Python'],
      software_kinds: ['cli_tool'],
      // The same topic in both arrays must count once, not twice.
      github_topics: ['cli', 'cantonese'], curated_topics: ['cli'],
      time_spent_seconds: null, most_starred: true, matching_total: 111,
      breakdown: [
        { dimension: 'visibility', key: 'true', count: 89 },
        { dimension: 'visibility', key: 'false', count: 22 },
        { dimension: 'topic', key: 'cantonese', count: 7 },
        { dimension: 'kind', key: 'cli_tool', count: 18 },
      ],
    }])
    const repository = createKnowledgeIndexRepository(db)
    const filters = projectCatalogFiltersSchema.parse({ limit: 5 })

    const result = await repository.listOwnedProjects({
      ...filters, exclude_source_ids: [], first_batch: false,
    })

    const statement = db.queries[0]?.sql ?? ''
    // The total counts the whole filtered set before LIMIT, not the page.
    expect(statement).toContain('COUNT(*) OVER () AS "matching_total"')
    // Topics are deduped per project and counted by distinct project, not by unnest row.
    expect(statement).toContain('ARRAY(SELECT DISTINCT unnest(p."github_topics" || p."curated_topics"))')
    expect(statement).toContain("COUNT(DISTINCT p.\"source_id\")::int")
    expect(result.matchingTotal).toBe(111)
    expect(result.breakdown).toEqual([
      { dimension: 'visibility', key: 'true', count: 89 },
      { dimension: 'visibility', key: 'false', count: 22 },
      { dimension: 'topic', key: 'cantonese', count: 7 },
      { dimension: 'kind', key: 'cli_tool', count: 18 },
    ])
    // A list call still returns its page alongside the totals.
    expect(result.projects).toHaveLength(1)
  })

  it('returns totals and no projects for the count op', async () => {
    const db = createDatabase([{
      source_type: 'github', source_id: 'lst97/lst97', title: 'lst97',
      url: 'https://github.com/lst97/lst97', is_public: true, summary: 'Profile.',
      created_at: null, updated_at: null, stars: null, forks: null, primary_language: null,
      languages: [], software_kinds: [], github_topics: [], curated_topics: [],
      time_spent_seconds: null, most_starred: false, matching_total: 111,
      breakdown: [{ dimension: 'visibility', key: 'true', count: 89 }],
    }])
    const repository = createKnowledgeIndexRepository(db)
    const filters = projectCatalogFiltersSchema.parse({})

    const result = await repository.listOwnedProjects({
      ...filters, exclude_source_ids: [], first_batch: false, op: 'count',
    })

    expect(result).toEqual({
      projects: [],
      hasMore: false,
      matchingTotal: 111,
      breakdown: [{ dimension: 'visibility', key: 'true', count: 89 }],
    })
  })

  it('reports a zero total when the filters match nothing', async () => {
    const db = createDatabase([])
    const repository = createKnowledgeIndexRepository(db)
    const filters = projectCatalogFiltersSchema.parse({ query: 'no-such-project' })

    const result = await repository.listOwnedProjects({
      ...filters, exclude_source_ids: [], first_batch: true, op: 'count',
    })

    expect(result).toEqual({ projects: [], hasMore: false, matchingTotal: 0, breakdown: [] })
  })

  it('applies the named WakaTime windows to project time totals', async () => {
    for (const [range, sqlWindow] of [
      ['last_year', "date_trunc('year', CURRENT_DATE) - INTERVAL '1 year'"],
      ['last_30_days', "CURRENT_DATE - INTERVAL '29 days'"],
      ['last_7_days', "CURRENT_DATE - INTERVAL '6 days'"],
    ] as const) {
      const db = createDatabase([])
      const repository = createKnowledgeIndexRepository(db)
      await repository.listOwnedProjects({
        ...projectCatalogFiltersSchema.parse({ time_spent_range: range }),
        exclude_source_ids: [], first_batch: false,
      })
      expect(db.queries[0]?.sql).toContain(sqlWindow)
      expect(db.queries[0]?.sql).toContain('wakatime_daily_projects')
    }
  })

  it('refreshes catalogue metadata in one database transaction without re-embedding report chunks', async () => {
    const db = createDatabase()
    const repository = createKnowledgeIndexRepository(db)
    await repository.upsertOwnedProjectCatalogEntries([{
      sourceType: 'github', sourceId: 'lst97/python-tool', title: 'python-tool',
      url: 'https://github.com/lst97/python-tool', isPublic: true,
      metadata: {
        summary: 'A Python command line app.', createdAt: '2024-01-10T00:00:00.000Z', updatedAt: null,
        stars: 4, forks: 2, primaryLanguage: 'Python', languages: ['Python'], kinds: ['cli_tool'],
        githubTopics: [], curatedTopics: ['developer-tool'],
      },
    }])

    expect(db.transactionCount).toBe(1)
    expect(db.queries).toHaveLength(1)
    expect(db.queries[0]?.sql).toContain('INSERT INTO "knowledge_projects"')
    expect(db.queries[0]?.sql).toContain('ON CONFLICT')
    expect(db.queries[0]?.sql).not.toContain('knowledge_chunks')
    expect(db.queries[0]?.sql).toContain('ARRAY[]::text[]')
    expect(db.queries[0]?.params).toContain('developer-tool')
  })

  it('searches all chunks by cosine distance, carries visibility, and caps candidates at ten', async () => {
    const db = createDatabase([{
      source_type: 'post',
      source_id: 'post-1',
      chunk_index: 0,
      title: 'Typed APIs',
      url: 'https://example.test/blog/typed-apis',
      content: 'I wrote about safe APIs.',
      is_public: true,
      distance: 0.12,
    }])
    const repository = createKnowledgeIndexRepository(db)

    const result = await repository.search(chunks[0]!.embedding, 50)

    expect(db.queries[0]?.sql).not.toContain('"is_public" = true')
    expect(db.queries[0]?.sql).toContain('"embedding" <=>')
    expect(db.queries[0]?.sql).toContain('LIMIT $2')
    expect(db.queries[0]?.params.at(-1)).toBe(10)
    expect(result).toEqual([{
      id: 'post:post-1:0',
      text: 'I wrote about safe APIs.',
      isPublic: true,
      source: chunks[0]!.source,
    }])
  })

  it('returns private chunks with visibility preserved instead of filtering them out', async () => {
    const db = createDatabase([{
      source_type: 'github-private',
      source_id: 'lst97/secret-tool',
      chunk_index: 0,
      title: 'secret-tool',
      url: 'https://github.com/lst97/secret-tool',
      content: 'A sanitized private project summary.',
      is_public: false,
    }])
    const repository = createKnowledgeIndexRepository(db)

    const result = await repository.search(chunks[0]!.embedding, 10)

    expect(db.queries[0]?.sql).not.toContain('WHERE "is_public" = true')
    expect(result).toEqual([{
      id: 'github-private:lst97/secret-tool:0',
      text: 'A sanitized private project summary.',
      isPublic: false,
      source: { type: 'github-private', sourceId: 'lst97/secret-tool', title: 'secret-tool', url: 'https://github.com/lst97/secret-tool' },
    }])
  })

  it('rejects vectors with the wrong dimension or non-finite values before querying', async () => {
    const db = createDatabase()
    const repository = createKnowledgeIndexRepository(db)

    await expect(repository.search([1, 2], 10)).rejects.toThrow('1024 finite values')
    await expect(repository.search([...Array(1023).fill(0), Number.NaN], 10)).rejects.toThrow('1024 finite values')
    expect(db.queries).toHaveLength(0)
  })

  it('rejects invalid chunk vectors before opening a transaction', async () => {
    const db = createDatabase()
    const repository = createKnowledgeIndexRepository(db)

    await expect(repository.upsertSourceChunks(chunks[0]!.source, [{ ...chunks[0]!, embedding: [1, 2] }]))
      .rejects.toThrow('1024 finite values')
    expect(db.transactionCount).toBe(0)
  })
})

const testDatabaseUrl = Bun.env.KNOWLEDGE_TEST_DATABASE_URL

describe.skipIf(!testDatabaseUrl)('KnowledgeIndexRepository with pgvector Postgres', () => {
  it('persists 1024-dimensional vectors, ranks public and private chunks by cosine, and rolls back failed replacement', async () => {
    const schema = `knowledge_test_${Bun.randomUUIDv7().replaceAll('-', '')}`
    const pool = new Pool({
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema},public`,
    })
    const db = drizzle(pool)
    const repository = createKnowledgeIndexRepository(db)

    try {
      await pool.query(`CREATE SCHEMA "${schema}"`)
      await migrateKnowledgeDatabase(pool as never)

      const visible: KnowledgeChunk = {
        ...chunks[0]!,
        embedding: Array.from({ length: 1024 }, (_, index) => index === 0 ? 1 : 0),
      }
      const hidden: KnowledgeChunk = {
        ...chunks[1]!,
        embedding: Array.from({ length: 1024 }, (_, index) => index === 1 ? 1 : 0),
        isPublic: false,
      }
      await repository.upsertSourceChunks(visible.source, [visible, hidden])

      const nearest = await repository.search(visible.embedding, 10)
      expect(nearest.map(({ id, isPublic }) => [id, isPublic])).toEqual([
        ['post:post-1:0', true],
        ['post:post-1:1', false],
      ])

      await pool.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "test_no_force_rollback" CHECK (content <> 'force rollback')`)
      await expect(repository.upsertSourceChunks(visible.source, [
        { ...visible, text: 'replacement that must roll back' },
        { ...hidden, text: 'force rollback', isPublic: true },
      ])).rejects.toThrow()

      const afterRollback = await repository.search(visible.embedding, 10)
      expect(afterRollback.map(({ text }) => text).sort()).toEqual([visible.text, hidden.text].sort())
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await pool.end()
    }
  })
})
