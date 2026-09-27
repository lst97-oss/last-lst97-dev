import { z } from 'zod'
import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'

import type { KnowledgeCandidate, KnowledgeSourceReference, KnowledgeSourceType } from './types'
import type { KnowledgeProjectCatalogMetadata } from './source-types'
import { PROJECT_SOFTWARE_KINDS, projectCatalogQuerySchema, type ProjectCatalogQuery, type ProjectCatalogRecord } from './project-catalog'

const DIMENSIONS = 1024
const MAX_SEARCH_RESULTS = 10
const sourceTypeSchema = z.enum(['post', 'project', 'profile', 'github', 'github-private', 'github-profile', 'github-contrib', 'github-contrib-private', 'wakatime'])
const searchRowSchema = z.object({
  source_type: sourceTypeSchema,
  source_id: z.string(),
  chunk_index: z.number().int().nonnegative(),
  title: z.string(),
  url: z.string().url(),
  content: z.string(),
  is_public: z.boolean(),
})
const projectCatalogRowSchema = z.object({
  source_type: z.enum(['github', 'github-private']),
  source_id: z.string().min(1),
  title: z.string(),
  url: z.string().url(),
  is_public: z.boolean(),
  summary: z.string(),
  created_at: z.union([z.string(), z.date()]).nullable().transform((value) => value === null ? null : value instanceof Date ? value.toISOString() : value),
  updated_at: z.union([z.string(), z.date()]).nullable().transform((value) => value === null ? null : value instanceof Date ? value.toISOString() : value),
  stars: z.coerce.number().int().nonnegative().nullable(),
  forks: z.coerce.number().int().nonnegative().nullable(),
  primary_language: z.string().nullable(),
  languages: z.array(z.string()),
  software_kinds: z.array(z.enum(PROJECT_SOFTWARE_KINDS)),
  github_topics: z.array(z.string()),
  curated_topics: z.array(z.string()),
  time_spent_seconds: z.coerce.number().nonnegative().nullable(),
  most_starred: z.boolean(),
})

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

interface QueryResult {
  rows?: unknown[]
}

interface KnowledgeExecutor {
  execute(query: SQL): Promise<QueryResult>
}

export interface KnowledgeDatabase extends KnowledgeExecutor {
  transaction<T>(callback: (transaction: KnowledgeExecutor) => Promise<T>): Promise<T>
}

export interface KnowledgeIndexRepository {
  upsertSourceChunks(source: KnowledgeSourceReference, chunks: KnowledgeChunk[], projectCatalog?: KnowledgeProjectCatalogMetadata): Promise<void>
  removeSource(sourceType: KnowledgeSourceType, sourceId: string): Promise<void>
  listSourceIds(sourceType: KnowledgeSourceType): Promise<string[]>
  listOwnedProjects(query: ProjectCatalogQuery): Promise<{ projects: KnowledgeProjectRecord[]; hasMore: boolean }>
  upsertOwnedProjectCatalogEntries(entries: Array<{
    sourceType: 'github' | 'github-private'
    sourceId: string
    title: string
    url: string
    isPublic: boolean
    metadata: KnowledgeProjectCatalogMetadata
  }>): Promise<void>
  search(vector: number[], limit: number): Promise<KnowledgeCandidate[]>
  searchExactProjectName?(name: string, limit: number): Promise<KnowledgeCandidate[]>
  searchByKeyword?(keyword: string, limit: number): Promise<KnowledgeCandidate[]>
}

const projectCatalogMetadataSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  stars: z.number().int().nonnegative().nullable(),
  forks: z.number().int().nonnegative().nullable(),
  primaryLanguage: z.string().trim().min(1).max(100).nullable(),
  languages: z.array(z.string().trim().min(1).max(100)).max(100),
  kinds: z.array(z.enum(PROJECT_SOFTWARE_KINDS)).max(PROJECT_SOFTWARE_KINDS.length),
  githubTopics: z.array(z.string().trim().min(1).max(100)).max(100),
  curatedTopics: z.array(z.string().trim().min(1).max(100)).max(100),
}).strict()
const projectCatalogEntrySchema = z.object({
  sourceType: z.enum(['github', 'github-private']),
  sourceId: z.string().regex(/^lst97\/[A-Za-z0-9_.-]{1,100}$/),
  title: z.string().trim().min(1).max(500),
  url: z.string().url().refine((url) => url.startsWith('https://github.com/lst97/')),
  isPublic: z.boolean(),
  metadata: projectCatalogMetadataSchema,
}).strict().refine((entry) => entry.isPublic === (entry.sourceType === 'github'), 'Project visibility must match its source type')

const ownerRepositoryTypes = new Set<KnowledgeSourceType>(['github', 'github-private'])

function assertEmbedding(vector: number[]): void {
  if (vector.length !== DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('Knowledge embeddings must contain exactly 1024 finite values')
  }
}

function vectorLiteral(vector: number[]): string {
  assertEmbedding(vector)
  return `[${vector.join(',')}]`
}

function textArray(values: string[]): SQL {
  return sql`ARRAY[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::text[]`
}

function validateSourceType(sourceType: string): KnowledgeSourceType {
  const parsed = sourceTypeSchema.safeParse(sourceType)
  if (!parsed.success) throw new Error('Knowledge source type is invalid')
  return parsed.data
}

function assertChunkSource(source: KnowledgeSourceReference, chunk: KnowledgeChunk): void {
  if (
    chunk.source.type !== source.type
    || chunk.source.sourceId !== source.sourceId
    || !Number.isInteger(chunk.chunkIndex)
    || chunk.chunkIndex < 0
    || !chunk.text.trim()
    || !/^[\da-f]{64}$/i.test(chunk.contentHash)
    || !(chunk.sourceUpdatedAt === null || chunk.sourceUpdatedAt instanceof Date && Number.isFinite(chunk.sourceUpdatedAt.valueOf()))
  ) {
    throw new Error('Knowledge chunk metadata is invalid')
  }
  assertEmbedding(chunk.embedding)
}

function mapSearchRows(rows: unknown[]): KnowledgeCandidate[] {
  return rows.map((row) => {
    const parsed = searchRowSchema.safeParse(row)
    if (!parsed.success) throw new Error('Knowledge repository returned an invalid row')
    return {
      id: `${parsed.data.source_type}:${parsed.data.source_id}:${parsed.data.chunk_index}`,
      text: parsed.data.content,
      isPublic: parsed.data.is_public,
      source: {
        type: parsed.data.source_type,
        sourceId: parsed.data.source_id,
        title: parsed.data.title,
        url: parsed.data.url,
      },
    }
  })
}

function boundedSearchLimit(limit: number): number {
  return Math.max(1, Math.min(MAX_SEARCH_RESULTS, Math.floor(Number.isFinite(limit) ? limit : 1)))
}

function normalizedProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 200)
}

export function createKnowledgeIndexRepository(database: KnowledgeDatabase): KnowledgeIndexRepository {
  return {
    async upsertSourceChunks(source, chunks, projectCatalog) {
      const sourceType = validateSourceType(source.type)
      if (!source.sourceId.trim() || !source.title.trim() || !URL.canParse(source.url)) {
        throw new Error('Knowledge source metadata is invalid')
      }
      const indices = new Set<number>()
      for (const chunk of chunks) {
        assertChunkSource(source, chunk)
        if (indices.has(chunk.chunkIndex)) throw new Error('Knowledge chunk indices must be unique')
        indices.add(chunk.chunkIndex)
      }
      if (projectCatalog !== undefined) {
        if (!ownerRepositoryTypes.has(sourceType) || !projectCatalogMetadataSchema.safeParse(projectCatalog).success) {
          throw new Error('Knowledge project catalogue metadata is invalid')
        }
      }

      await database.transaction(async (transaction) => {
        for (const chunk of chunks) {
          await transaction.execute(sql`
            INSERT INTO "knowledge_chunks" (
              "source_type", "source_id", "chunk_index", "title", "url", "content",
              "content_hash", "embedding", "is_public", "source_updated_at", "indexed_at"
            ) VALUES (
              ${sourceType}, ${source.sourceId}, ${chunk.chunkIndex}, ${source.title}, ${source.url}, ${chunk.text},
              ${chunk.contentHash}, CAST(${vectorLiteral(chunk.embedding)} AS vector(1024)), ${chunk.isPublic}, ${chunk.sourceUpdatedAt}, now()
            )
            ON CONFLICT ("source_type", "source_id", "chunk_index") DO UPDATE SET
              "title" = EXCLUDED."title",
              "url" = EXCLUDED."url",
              "content" = EXCLUDED."content",
              "content_hash" = EXCLUDED."content_hash",
              "embedding" = EXCLUDED."embedding",
              "is_public" = EXCLUDED."is_public",
              "source_updated_at" = EXCLUDED."source_updated_at",
              "indexed_at" = now()
          `)
        }

        const stalePredicate = indices.size === 0
          ? sql``
          : sql`AND "chunk_index" NOT IN (${sql.join([...indices].map((index) => sql`${index}`), sql`, `)})`
        await transaction.execute(sql`
          DELETE FROM "knowledge_chunks"
          WHERE "source_type" = ${sourceType} AND "source_id" = ${source.sourceId} ${stalePredicate}
        `)

        if (ownerRepositoryTypes.has(sourceType)) {
          if (projectCatalog) {
            const metadata = projectCatalogMetadataSchema.parse(projectCatalog)
            await transaction.execute(sql`
              INSERT INTO "knowledge_projects" (
                "source_type", "source_id", "title", "url", "is_public", "summary", "created_at", "updated_at",
                "stars", "forks", "primary_language", "languages", "software_kinds", "github_topics", "curated_topics", "indexed_at"
              ) VALUES (
                ${sourceType}, ${source.sourceId}, ${source.title}, ${source.url}, ${sourceType === 'github'}, ${metadata.summary},
                ${metadata.createdAt}, ${metadata.updatedAt}, ${metadata.stars}, ${metadata.forks}, ${metadata.primaryLanguage},
                ${textArray(metadata.languages)}, ${textArray(metadata.kinds)}, ${textArray(metadata.githubTopics)}, ${textArray(metadata.curatedTopics)}, now()
              )
              ON CONFLICT ("source_type", "source_id") DO UPDATE SET
                "title" = EXCLUDED."title", "url" = EXCLUDED."url", "is_public" = EXCLUDED."is_public",
                "summary" = EXCLUDED."summary", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at",
                "stars" = EXCLUDED."stars", "forks" = EXCLUDED."forks", "primary_language" = EXCLUDED."primary_language",
                "languages" = EXCLUDED."languages", "software_kinds" = EXCLUDED."software_kinds",
                "github_topics" = EXCLUDED."github_topics", "curated_topics" = EXCLUDED."curated_topics", "indexed_at" = now()
            `)
          } else {
            await transaction.execute(sql`
              DELETE FROM "knowledge_projects" WHERE "source_type" = ${sourceType} AND "source_id" = ${source.sourceId}
            `)
          }
        }
      })
    },

    async removeSource(sourceType, sourceId) {
      const type = validateSourceType(sourceType)
      if (!sourceId.trim()) throw new Error('Knowledge source ID is invalid')
      await database.transaction(async (transaction) => {
        await transaction.execute(sql`
          DELETE FROM "knowledge_chunks"
          WHERE "source_type" = ${type} AND "source_id" = ${sourceId}
        `)
        if (ownerRepositoryTypes.has(type)) {
          await transaction.execute(sql`
            DELETE FROM "knowledge_projects" WHERE "source_type" = ${type} AND "source_id" = ${sourceId}
          `)
        }
      })
    },

    async listSourceIds(sourceType) {
      const type = validateSourceType(sourceType)
      const result = await database.execute(sql`
        SELECT DISTINCT "source_id"
        FROM "knowledge_chunks"
        WHERE "source_type" = ${type}
        ORDER BY "source_id"
      `)
      return (result.rows ?? []).flatMap((row) => {
        if (typeof row !== 'object' || row === null || !('source_id' in row)) return []
        const sourceId = (row as { source_id?: unknown }).source_id
        return typeof sourceId === 'string' ? [sourceId] : []
      })
    },

    async listOwnedProjects(input) {
      const parsedInput = projectCatalogQuerySchema.safeParse(input)
      if (!parsedInput.success) throw new Error('Knowledge project catalogue query is invalid')
      const filters = parsedInput.data
      const conditions: SQL[] = [sql`p."source_type" IN ('github', 'github-private')`]
      if (filters.exclude_source_ids.length > 0) conditions.push(sql`p."source_id" <> ALL(${textArray(filters.exclude_source_ids)})`)
      if (filters.query) {
        const search = sql`to_tsvector('simple', concat_ws(' ', p."source_id", p."title", p."summary", array_to_string(p."languages", ' '), array_to_string(p."software_kinds", ' '), array_to_string(p."github_topics", ' '), array_to_string(p."curated_topics", ' '))) @@ plainto_tsquery('simple', ${filters.query})`
        conditions.push(search)
      }
      if (filters.languages?.length) conditions.push(sql`p."languages" && ${textArray(filters.languages)}`)
      if (filters.kinds?.length) conditions.push(sql`p."software_kinds" && ${textArray(filters.kinds)}`)
      if (filters.topics?.length) conditions.push(sql`(p."github_topics" && ${textArray(filters.topics)} OR p."curated_topics" && ${textArray(filters.topics)})`)
      if (filters.visibility?.length === 1) conditions.push(sql`p."is_public" = ${filters.visibility[0] === 'public'}`)
      if (filters.created_after) conditions.push(sql`p."created_at" >= ${filters.created_after}::date`)
      if (filters.created_before) conditions.push(sql`p."created_at" < (${filters.created_before}::date + INTERVAL '1 day')`)
      if (filters.updated_after) conditions.push(sql`p."updated_at" >= ${filters.updated_after}::date`)
      if (filters.updated_before) conditions.push(sql`p."updated_at" < (${filters.updated_before}::date + INTERVAL '1 day')`)
      if (filters.min_stars !== undefined) conditions.push(sql`p."stars" >= ${filters.min_stars}`)
      if (filters.max_stars !== undefined) conditions.push(sql`p."stars" <= ${filters.max_stars}`)
      if (filters.min_forks !== undefined) conditions.push(sql`p."forks" >= ${filters.min_forks}`)
      if (filters.max_forks !== undefined) conditions.push(sql`p."forks" <= ${filters.max_forks}`)
      if (filters.min_time_spent_seconds !== undefined) conditions.push(sql`w."time_spent_seconds" IS NOT NULL AND w."time_spent_seconds" >= ${filters.min_time_spent_seconds}`)
      if (filters.max_time_spent_seconds !== undefined) conditions.push(sql`w."time_spent_seconds" IS NOT NULL AND w."time_spent_seconds" <= ${filters.max_time_spent_seconds}`)
      const timeConditions: SQL[] = []
      if (filters.time_spent_from) timeConditions.push(sql`"day" >= ${filters.time_spent_from}::date`)
      if (filters.time_spent_to) timeConditions.push(sql`"day" <= ${filters.time_spent_to}::date`)
      if (filters.time_spent_range === 'last_year') timeConditions.push(sql`"day" >= (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')::date AND "day" < date_trunc('year', CURRENT_DATE)::date`)
      if (filters.time_spent_range === 'last_30_days') timeConditions.push(sql`"day" >= (CURRENT_DATE - INTERVAL '29 days')::date`)
      if (filters.time_spent_range === 'last_7_days') timeConditions.push(sql`"day" >= (CURRENT_DATE - INTERVAL '6 days')::date`)
      const projectKey = (expression: SQL) => sql`trim(both '-' from regexp_replace(lower(regexp_replace(${expression}, '^.*/', '')), '[^a-z0-9]+', '-', 'g'))`
      const timeByProject = sql`
        SELECT ${projectKey(sql`"project"`)} AS "project_key", SUM("seconds") AS "time_spent_seconds"
        FROM "wakatime_daily_projects"
        ${timeConditions.length ? sql`WHERE ${sql.join(timeConditions, sql` AND `)}` : sql``}
        GROUP BY 1
      `
      const catalogProjectKey = projectKey(sql`p."source_id"`)
      const relevance = filters.query
        ? sql`ts_rank_cd(to_tsvector('simple', concat_ws(' ', p."source_id", p."title", p."summary", array_to_string(p."languages", ' '), array_to_string(p."software_kinds", ' '), array_to_string(p."github_topics", ' '), array_to_string(p."curated_topics", ' '))), plainto_tsquery('simple', ${filters.query}))`
        : sql`0::real`
      const orderDirection = filters.sort_direction === 'asc' ? 'ASC' : 'DESC'
      const sortColumn = filters.sort_by === 'stars' ? sql`f."stars"`
        : filters.sort_by === 'forks' ? sql`f."forks"`
          : filters.sort_by === 'created' ? sql`f."created_at"`
            : filters.sort_by === 'time_spent' ? sql`f."time_spent_seconds"`
              : sql`f."updated_at"`
      const orderedBy = filters.sort_by === 'relevance'
        ? sql`f."relevance" ${sql.raw(orderDirection)} NULLS LAST, f."updated_at" DESC NULLS LAST, f."source_id" ASC`
        : filters.sort_by
          ? sql`${sortColumn} ${sql.raw(orderDirection)} NULLS LAST, f."updated_at" DESC NULLS LAST, f."source_id" ASC`
          : filters.first_batch
            ? sql`CASE WHEN f."star_rank" = 1 AND f."stars" IS NOT NULL THEN 0 ELSE 1 END ASC, f."updated_at" DESC NULLS LAST, f."source_id" ASC`
            : sql`f."updated_at" DESC NULLS LAST, f."source_id" ASC`
      const limit = filters.limit
      const result = await database.execute(sql`
        WITH "time_by_project" AS (${timeByProject}),
        "filtered" AS (
          SELECT p."source_type", p."source_id", p."title", p."url", p."is_public", p."summary",
            p."created_at", p."updated_at", p."stars", p."forks", p."primary_language", p."languages",
            p."software_kinds", p."github_topics", p."curated_topics", w."time_spent_seconds",
            ${relevance} AS "relevance"
          FROM "knowledge_projects" p
          LEFT JOIN "time_by_project" w ON w."project_key" = ${catalogProjectKey}
          WHERE ${sql.join(conditions, sql` AND `)}
        ),
        "ranked" AS (
          SELECT f.*, ROW_NUMBER() OVER (ORDER BY f."stars" DESC NULLS LAST, f."source_id" ASC) AS "star_rank"
          FROM "filtered" f
        )
        SELECT f.*, (f."star_rank" = 1 AND f."stars" IS NOT NULL AND ${filters.first_batch} AND ${filters.sort_by === undefined}) AS "most_starred"
        FROM "ranked" f
        ORDER BY ${orderedBy}
        LIMIT ${limit + 1}
      `)
      const rows = (result.rows ?? []).map((row) => {
        const parsed = projectCatalogRowSchema.safeParse(row)
        if (!parsed.success) throw new Error('Knowledge repository returned an invalid project catalogue row')
        return {
          sourceType: parsed.data.source_type,
          sourceId: parsed.data.source_id,
          title: parsed.data.title,
          url: parsed.data.url,
          isPublic: parsed.data.is_public,
          summary: parsed.data.summary,
          createdAt: parsed.data.created_at,
          updatedAt: parsed.data.updated_at,
          stars: parsed.data.stars,
          forks: parsed.data.forks,
          primaryLanguage: parsed.data.primary_language,
          languages: parsed.data.languages,
          kinds: parsed.data.software_kinds,
          githubTopics: parsed.data.github_topics,
          curatedTopics: parsed.data.curated_topics,
          timeSpentSeconds: parsed.data.time_spent_seconds,
          mostStarred: parsed.data.most_starred,
        }
      })
      return { projects: rows.slice(0, limit), hasMore: rows.length > limit }
    },

    async upsertOwnedProjectCatalogEntries(entries) {
      const validated = z.array(projectCatalogEntrySchema).max(1_000).parse(entries)
      const identities = new Set<string>()
      for (const entry of validated) {
        const identity = `${entry.sourceType}:${entry.sourceId}`
        if (identities.has(identity)) throw new Error('Knowledge project catalogue identities must be unique')
        identities.add(identity)
      }
      await database.transaction(async (transaction) => {
        for (const entry of validated) {
          const metadata = entry.metadata
          await transaction.execute(sql`
            INSERT INTO "knowledge_projects" (
              "source_type", "source_id", "title", "url", "is_public", "summary", "created_at", "updated_at",
              "stars", "forks", "primary_language", "languages", "software_kinds", "github_topics", "curated_topics", "indexed_at"
            ) VALUES (
              ${entry.sourceType}, ${entry.sourceId}, ${entry.title}, ${entry.url}, ${entry.isPublic}, ${metadata.summary},
              ${metadata.createdAt}, ${metadata.updatedAt}, ${metadata.stars}, ${metadata.forks}, ${metadata.primaryLanguage},
              ${textArray(metadata.languages)}, ${textArray(metadata.kinds)}, ${textArray(metadata.githubTopics)}, ${textArray(metadata.curatedTopics)}, now()
            )
            ON CONFLICT ("source_type", "source_id") DO UPDATE SET
              "title" = EXCLUDED."title", "url" = EXCLUDED."url", "is_public" = EXCLUDED."is_public",
              "summary" = EXCLUDED."summary", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at",
              "stars" = EXCLUDED."stars", "forks" = EXCLUDED."forks", "primary_language" = EXCLUDED."primary_language",
              "languages" = EXCLUDED."languages", "software_kinds" = EXCLUDED."software_kinds",
              "github_topics" = EXCLUDED."github_topics", "curated_topics" = EXCLUDED."curated_topics", "indexed_at" = now()
          `)
        }
      })
    },

    async search(vector, limit) {
      if (vector.length !== DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
        throw new Error('Knowledge embeddings must contain exactly 1024 finite values')
      }
      const boundedLimit = boundedSearchLimit(limit)
      const result = await database.execute(sql`
        SELECT "source_type", "source_id", "chunk_index", "title", "url", "content", "is_public"
        FROM "knowledge_chunks"
        ORDER BY "embedding" <=> CAST(${vectorLiteral(vector)} AS vector(1024))
        LIMIT ${boundedLimit}
      `)

      return mapSearchRows(result.rows ?? [])
    },

    async searchExactProjectName(name, limit) {
      const normalized = normalizedProjectName(name)
      if (!normalized) return []
      const result = await database.execute(sql`
        SELECT "source_type", "source_id", "chunk_index", "title", "url", "content", "is_public"
        FROM "knowledge_chunks"
        WHERE regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g') = ${normalized}
          OR regexp_replace(lower(regexp_replace("source_id", '^.*/', '')), '[^a-z0-9]+', '-', 'g') = ${normalized}
        ORDER BY "chunk_index" ASC
        LIMIT ${boundedSearchLimit(limit)}
      `)
      return mapSearchRows(result.rows ?? [])
    },

    async searchByKeyword(keyword, limit) {
      const term = keyword.trim().slice(0, 80)
      if (!term) return []
      const result = await database.execute(sql`
        SELECT "source_type", "source_id", "chunk_index", "title", "url", "content", "is_public"
        FROM "knowledge_chunks"
        WHERE to_tsvector('simple', "title" || ' ' || "content") @@ plainto_tsquery('simple', ${term})
        ORDER BY CASE WHEN "content" ILIKE '%project demo:%' THEN 0 ELSE 1 END,
          ts_rank_cd(to_tsvector('simple', "title" || ' ' || "content"), plainto_tsquery('simple', ${term})) DESC,
          "chunk_index" ASC
        LIMIT ${boundedSearchLimit(limit)}
      `)
      return mapSearchRows(result.rows ?? [])
    },
  }
}
