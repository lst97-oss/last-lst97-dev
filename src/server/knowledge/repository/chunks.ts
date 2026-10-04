import { sql } from '@payloadcms/db-postgres'
import { updateOwnedProjectCatalogWithinTransaction } from './catalog'
import {
  assertChunkSource,
  boundedSearchLimit,
  chunkStateRowSchema,
  DIMENSIONS,
  mapSearchRows,
  normalizedProjectName,
  ownerRepositoryTypes,
  parseVectorLiteral,
  projectCatalogMetadataSchema,
  validateSourceType,
  vectorLiteral,
} from './shared'
import type { KnowledgeDatabase, KnowledgeIndexRepository } from './types'

export function createKnowledgeChunkOperations(
  database: KnowledgeDatabase,
): Pick<
  KnowledgeIndexRepository,
  | 'upsertSourceChunks'
  | 'removeSource'
  | 'listSourceIds'
  | 'listSourceChunkState'
  | 'search'
  | 'searchExactProjectName'
  | 'searchByKeyword'
> {
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

        const stalePredicate =
          indices.size === 0
            ? sql``
            : sql`AND "chunk_index" NOT IN (${sql.join(
                [...indices].map((index) => sql`${index}`),
                sql`, `,
              )})`
        await transaction.execute(sql`
          DELETE FROM "knowledge_chunks"
          WHERE "source_type" = ${sourceType} AND "source_id" = ${source.sourceId} ${stalePredicate}
        `)

        await updateOwnedProjectCatalogWithinTransaction(transaction, source, projectCatalog)
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

    async listSourceChunkState(sourceType, sourceId) {
      const type = validateSourceType(sourceType)
      if (!sourceId.trim()) throw new Error('Knowledge source ID is invalid')
      const result = await database.execute(sql`
        SELECT "chunk_index", "content_hash", "embedding"::text AS "embedding_text"
        FROM "knowledge_chunks"
        WHERE "source_type" = ${type} AND "source_id" = ${sourceId}
        ORDER BY "chunk_index" ASC
      `)
      return (result.rows ?? []).map((row) => {
        const parsed = chunkStateRowSchema.safeParse(row)
        if (!parsed.success) throw new Error('Knowledge repository returned an invalid chunk state')
        let embedding: number[]
        try {
          embedding = parseVectorLiteral(parsed.data.embedding_text)
        } catch {
          // The shared vector assertion message names the dimension problem, not
          // this query, so the row failure is reported with one attributable string.
          throw new Error('Knowledge repository returned an invalid chunk state')
        }
        return {
          chunkIndex: parsed.data.chunk_index,
          contentHash: parsed.data.content_hash,
          embedding,
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
