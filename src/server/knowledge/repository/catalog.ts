import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'
import { z } from 'zod'
import { projectCatalogQuerySchema } from '../project-catalog'
import type { KnowledgeProjectCatalogMetadata } from '../source-types'
import type { KnowledgeSourceReference } from '../types'
import {
  ownerRepositoryTypes,
  projectCatalogEntrySchema,
  projectCatalogMetadataSchema,
  projectCatalogRowSchema,
  textArray,
} from './shared'
import type { KnowledgeDatabase, KnowledgeExecutor, KnowledgeIndexRepository } from './types'

type ProjectCatalogEntry = z.infer<typeof projectCatalogEntrySchema>

async function upsertProjectCatalogEntry(transaction: KnowledgeExecutor, entry: ProjectCatalogEntry): Promise<void> {
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

export function createKnowledgeCatalogOperations(
  database: KnowledgeDatabase,
): Pick<KnowledgeIndexRepository, 'listOwnedProjects' | 'upsertOwnedProjectCatalogEntries'> {
  return {
    async listOwnedProjects(input) {
      const parsedInput = projectCatalogQuerySchema.safeParse(input)
      if (!parsedInput.success) throw new Error('Knowledge project catalogue query is invalid')
      const filters = parsedInput.data
      const conditions: SQL[] = [sql`p."source_type" IN ('github', 'github-private')`]
      if (filters.exclude_source_ids.length > 0)
        conditions.push(sql`p."source_id" <> ALL(${textArray(filters.exclude_source_ids)})`)
      if (filters.query) {
        const search = sql`to_tsvector('simple', concat_ws(' ', p."source_id", p."title", p."summary", array_to_string(p."languages", ' '), array_to_string(p."software_kinds", ' '), array_to_string(p."github_topics", ' '), array_to_string(p."curated_topics", ' '))) @@ plainto_tsquery('simple', ${filters.query})`
        conditions.push(search)
      }
      if (filters.languages?.length) conditions.push(sql`p."languages" && ${textArray(filters.languages)}`)
      if (filters.kinds?.length) conditions.push(sql`p."software_kinds" && ${textArray(filters.kinds)}`)
      if (filters.topics?.length)
        conditions.push(
          sql`(p."github_topics" && ${textArray(filters.topics)} OR p."curated_topics" && ${textArray(filters.topics)})`,
        )
      if (filters.visibility?.length === 1) conditions.push(sql`p."is_public" = ${filters.visibility[0] === 'public'}`)
      if (filters.created_after) conditions.push(sql`p."created_at" >= ${filters.created_after}::date`)
      if (filters.created_before)
        conditions.push(sql`p."created_at" < (${filters.created_before}::date + INTERVAL '1 day')`)
      if (filters.updated_after) conditions.push(sql`p."updated_at" >= ${filters.updated_after}::date`)
      if (filters.updated_before)
        conditions.push(sql`p."updated_at" < (${filters.updated_before}::date + INTERVAL '1 day')`)
      if (filters.min_stars !== undefined) conditions.push(sql`p."stars" >= ${filters.min_stars}`)
      if (filters.max_stars !== undefined) conditions.push(sql`p."stars" <= ${filters.max_stars}`)
      if (filters.min_forks !== undefined) conditions.push(sql`p."forks" >= ${filters.min_forks}`)
      if (filters.max_forks !== undefined) conditions.push(sql`p."forks" <= ${filters.max_forks}`)
      if (filters.min_time_spent_seconds !== undefined)
        conditions.push(
          sql`w."time_spent_seconds" IS NOT NULL AND w."time_spent_seconds" >= ${filters.min_time_spent_seconds}`,
        )
      if (filters.max_time_spent_seconds !== undefined)
        conditions.push(
          sql`w."time_spent_seconds" IS NOT NULL AND w."time_spent_seconds" <= ${filters.max_time_spent_seconds}`,
        )
      const timeConditions: SQL[] = []
      if (filters.time_spent_from) timeConditions.push(sql`"day" >= ${filters.time_spent_from}::date`)
      if (filters.time_spent_to) timeConditions.push(sql`"day" <= ${filters.time_spent_to}::date`)
      if (filters.time_spent_range === 'last_year')
        timeConditions.push(
          sql`"day" >= (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')::date AND "day" < date_trunc('year', CURRENT_DATE)::date`,
        )
      if (filters.time_spent_range === 'last_30_days')
        timeConditions.push(sql`"day" >= (CURRENT_DATE - INTERVAL '29 days')::date`)
      if (filters.time_spent_range === 'last_7_days')
        timeConditions.push(sql`"day" >= (CURRENT_DATE - INTERVAL '6 days')::date`)
      const projectKey = (expression: SQL) =>
        sql`trim(both '-' from regexp_replace(lower(regexp_replace(${expression}, '^.*/', '')), '[^a-z0-9]+', '-', 'g'))`
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
      const sortColumn =
        filters.sort_by === 'stars'
          ? sql`f."stars"`
          : filters.sort_by === 'forks'
            ? sql`f."forks"`
            : filters.sort_by === 'created'
              ? sql`f."created_at"`
              : filters.sort_by === 'time_spent'
                ? sql`f."time_spent_seconds"`
                : sql`f."updated_at"`
      const orderedBy =
        filters.sort_by === 'relevance'
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
          await upsertProjectCatalogEntry(transaction, entry)
        }
      })
    },
  }
}

export async function updateOwnedProjectCatalogWithinTransaction(
  transaction: KnowledgeExecutor,
  source: KnowledgeSourceReference,
  projectCatalog?: KnowledgeProjectCatalogMetadata,
): Promise<void> {
  if (!ownerRepositoryTypes.has(source.type)) return

  if (!projectCatalog) {
    await transaction.execute(
      sql`DELETE FROM "knowledge_projects" WHERE "source_type" = ${source.type} AND "source_id" = ${source.sourceId}`,
    )
    return
  }

  if (source.type !== 'github' && source.type !== 'github-private') return
  await upsertProjectCatalogEntry(transaction, {
    sourceType: source.type,
    sourceId: source.sourceId,
    title: source.title,
    url: source.url,
    isPublic: source.type === 'github',
    metadata: projectCatalogMetadataSchema.parse(projectCatalog),
  })
}
