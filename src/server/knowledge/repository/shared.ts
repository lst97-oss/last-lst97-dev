import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'
import { z } from 'zod'
import { PROJECT_SOFTWARE_KINDS } from '../project-catalog'
import type { KnowledgeCandidate, KnowledgeSourceReference, KnowledgeSourceType } from '../types'
import type { KnowledgeChunk } from './types'

export const DIMENSIONS = 1024
const MAX_SEARCH_RESULTS = 10
export const sourceTypeSchema = z.enum([
  'post',
  'project',
  'profile',
  'github',
  'github-private',
  'github-profile',
  'github-contrib',
  'github-contrib-private',
  'wakatime',
])
const searchRowSchema = z.object({
  source_type: sourceTypeSchema,
  source_id: z.string(),
  chunk_index: z.number().int().nonnegative(),
  title: z.string(),
  url: z.string().url(),
  content: z.string(),
  is_public: z.boolean(),
})
export const projectCatalogRowSchema = z.object({
  source_type: z.enum(['github', 'github-private']),
  source_id: z.string().min(1),
  title: z.string(),
  url: z.string().url(),
  is_public: z.boolean(),
  summary: z.string(),
  created_at: z
    .union([z.string(), z.date()])
    .nullable()
    .transform((value) => (value === null ? null : value instanceof Date ? value.toISOString() : value)),
  updated_at: z
    .union([z.string(), z.date()])
    .nullable()
    .transform((value) => (value === null ? null : value instanceof Date ? value.toISOString() : value)),
  stars: z.coerce.number().int().nonnegative().nullable(),
  forks: z.coerce.number().int().nonnegative().nullable(),
  primary_language: z.string().nullable(),
  languages: z.array(z.string()),
  software_kinds: z.array(z.enum(PROJECT_SOFTWARE_KINDS)),
  github_topics: z.array(z.string()),
  curated_topics: z.array(z.string()),
  time_spent_seconds: z.coerce.number().nonnegative().nullable(),
  most_starred: z.boolean(),
  // Required on purpose: a missing matching_total is a genuine query bug and
  // should fail loudly rather than silently report 0 matches.
  matching_total: z.coerce.number().int().nonnegative(),
  // Defaulted because a filtered-empty result still needs a usable shape, and
  // because repository row fixtures may omit the column entirely.
  breakdown: z
    .array(
      z.object({
        dimension: z.enum(['visibility', 'topic', 'kind']),
        key: z.string().min(1),
        count: z.coerce.number().int().nonnegative(),
      }),
    )
    .default([]),
})
export const projectCatalogMetadataSchema = z
  .object({
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
  })
  .strict()
export const projectCatalogEntrySchema = z
  .object({
    sourceType: z.enum(['github', 'github-private']),
    sourceId: z.string().regex(/^lst97\/[A-Za-z0-9_.-]{1,100}$/),
    title: z.string().trim().min(1).max(500),
    url: z
      .string()
      .url()
      .refine((url) => url.startsWith('https://github.com/lst97/')),
    isPublic: z.boolean(),
    metadata: projectCatalogMetadataSchema,
  })
  .strict()
  .refine(
    (entry) => entry.isPublic === (entry.sourceType === 'github'),
    'Project visibility must match its source type',
  )

export const ownerRepositoryTypes = new Set<KnowledgeSourceType>(['github', 'github-private'])

export function assertEmbedding(vector: number[]): void {
  if (vector.length !== DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('Knowledge embeddings must contain exactly 1024 finite values')
  }
}

export function vectorLiteral(vector: number[]): string {
  assertEmbedding(vector)
  return `[${vector.join(',')}]`
}

export function textArray(values: string[]): SQL {
  return sql`ARRAY[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`
}

export function validateSourceType(sourceType: string): KnowledgeSourceType {
  const parsed = sourceTypeSchema.safeParse(sourceType)
  if (!parsed.success) throw new Error('Knowledge source type is invalid')
  return parsed.data
}

export function assertChunkSource(source: KnowledgeSourceReference, chunk: KnowledgeChunk): void {
  if (
    chunk.source.type !== source.type ||
    chunk.source.sourceId !== source.sourceId ||
    !Number.isInteger(chunk.chunkIndex) ||
    chunk.chunkIndex < 0 ||
    !chunk.text.trim() ||
    !/^[\da-f]{64}$/i.test(chunk.contentHash) ||
    !(
      chunk.sourceUpdatedAt === null ||
      (chunk.sourceUpdatedAt instanceof Date && Number.isFinite(chunk.sourceUpdatedAt.valueOf()))
    )
  ) {
    throw new Error('Knowledge chunk metadata is invalid')
  }
  assertEmbedding(chunk.embedding)
}

export function mapSearchRows(rows: unknown[]): KnowledgeCandidate[] {
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

export function boundedSearchLimit(limit: number): number {
  return Math.max(1, Math.min(MAX_SEARCH_RESULTS, Math.floor(Number.isFinite(limit) ? limit : 1)))
}

export function normalizedProjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200)
}
