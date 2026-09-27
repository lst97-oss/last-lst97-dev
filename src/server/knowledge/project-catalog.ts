import { z } from 'zod'

export const PROJECT_SOFTWARE_KINDS = [
  'web_app',
  'mobile_app',
  'desktop_app',
  'api_backend',
  'cli_tool',
  'library_package',
  'automation_devtool',
  'data_ml',
  'game',
  'infrastructure_devops',
  'plugin_extension',
  'other',
] as const

export const projectSoftwareKindSchema = z.enum(PROJECT_SOFTWARE_KINDS)
export type ProjectSoftwareKind = z.infer<typeof projectSoftwareKindSchema>

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
})

const textList = (maxItems: number, maxLength: number) => z.array(z.string().trim().min(1).max(maxLength)).max(maxItems)

export const projectCatalogFiltersSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  languages: textList(8, 60).optional(),
  kinds: z.array(projectSoftwareKindSchema).max(PROJECT_SOFTWARE_KINDS.length).optional(),
  topics: textList(12, 80).optional(),
  visibility: z.array(z.enum(['public', 'private'])).max(2).optional(),
  created_after: dateSchema.optional(),
  created_before: dateSchema.optional(),
  updated_after: dateSchema.optional(),
  updated_before: dateSchema.optional(),
  min_stars: z.number().int().min(0).max(10_000_000).optional(),
  max_stars: z.number().int().min(0).max(10_000_000).optional(),
  min_forks: z.number().int().min(0).max(10_000_000).optional(),
  max_forks: z.number().int().min(0).max(10_000_000).optional(),
  min_time_spent_seconds: z.number().int().min(0).max(10_000_000_000).optional(),
  max_time_spent_seconds: z.number().int().min(0).max(10_000_000_000).optional(),
  time_spent_from: dateSchema.optional(),
  time_spent_to: dateSchema.optional(),
  time_spent_range: z.enum(['all_time', 'last_year', 'last_30_days', 'last_7_days']).optional(),
  sort_by: z.enum(['relevance', 'stars', 'forks', 'created', 'updated', 'time_spent']).optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(10).default(10),
}).strict().superRefine((filters, context) => {
  const orderedRanges = [
    ['created_after', 'created_before'],
    ['updated_after', 'updated_before'],
    ['time_spent_from', 'time_spent_to'],
  ] as const
  for (const [start, end] of orderedRanges) {
    const from = filters[start]
    const to = filters[end]
    if (from && to && from > to) context.addIssue({ code: 'custom', path: [start], message: `${start} must not be after ${end}` })
  }
  const numericRanges = [
    ['min_stars', 'max_stars'],
    ['min_forks', 'max_forks'],
    ['min_time_spent_seconds', 'max_time_spent_seconds'],
  ] as const
  for (const [minimum, maximum] of numericRanges) {
    const min = filters[minimum]
    const max = filters[maximum]
    if (min !== undefined && max !== undefined && min > max) context.addIssue({ code: 'custom', path: [minimum], message: `${minimum} must not exceed ${maximum}` })
  }
  if ((filters.sort_by === 'relevance') && !filters.query) {
    context.addIssue({ code: 'custom', path: ['query'], message: 'query is required when sorting by relevance' })
  }
  if (filters.time_spent_range && (filters.time_spent_from || filters.time_spent_to)) {
    context.addIssue({ code: 'custom', path: ['time_spent_range'], message: 'Use a named time range or explicit time_spent_from/time_spent_to dates, not both' })
  }
})

export type ProjectCatalogFilters = z.infer<typeof projectCatalogFiltersSchema>

export const projectCatalogQuerySchema = projectCatalogFiltersSchema.extend({
  exclude_source_ids: z.array(z.string().regex(/^lst97\/[A-Za-z0-9_.-]{1,100}$/)).max(200).default([]),
  first_batch: z.boolean().default(false),
}).strict()

export type ProjectCatalogQuery = z.infer<typeof projectCatalogQuerySchema>

export interface ProjectCatalogRecord {
  sourceType: 'github' | 'github-private'
  sourceId: string
  title: string
  url: string
  isPublic: boolean
  summary: string
  createdAt: string | null
  updatedAt: string | null
  stars: number | null
  forks: number | null
  primaryLanguage: string | null
  languages: string[]
  kinds: ProjectSoftwareKind[]
  githubTopics: string[]
  curatedTopics: string[]
  timeSpentSeconds: number | null
}
