import { z } from 'zod'

export type CodingStatsRange = 'last_7_days' | 'last_30_days' | 'last_year' | 'all_time'
export type CodingStatsCategory = 'activity' | 'languages' | 'editors' | 'operating_systems' | 'categories'

export interface CodingStatsRequest {
  category: CodingStatsCategory
  range: CodingStatsRange
}

export interface CodingStatsPeriod {
  range: CodingStatsRange
  start: string | null
  end: string | null
}

export interface CodingStatsItem {
  name: string
  percent: number
}

export interface CodingStatsCategoryItem extends CodingStatsItem {
  estimatedSeconds: number
  humanReadableEstimate: string
}

export interface CodingActivityStats {
  category: 'activity'
  period: CodingStatsPeriod
  retrievedAtUtc: string
  totalSeconds: number
  daysInPeriod: number
  humanReadableTotal: string
  bestDay?: { date: string; totalSeconds: number; humanReadableTotal: string }
}

export interface CodingBreakdownStats {
  category: 'languages' | 'editors' | 'operating_systems'
  period: CodingStatsPeriod
  retrievedAtUtc: string
  items: CodingStatsItem[]
}

export interface CodingCategoryStats {
  category: 'categories'
  period: CodingStatsPeriod
  retrievedAtUtc: string
  items: CodingStatsCategoryItem[]
}

export type CodingStatsResult = CodingActivityStats | CodingBreakdownStats | CodingCategoryStats

export interface WakaTimeStatsClient {
  fetchSummary(query: CodingStatsRequest): Promise<CodingStatsResult | null>
}

const codingStatsQuerySchema = z.object({
  category: z.enum(['activity', 'languages', 'editors', 'operating_systems', 'categories']),
  range: z.enum(['last_7_days', 'last_30_days', 'last_year', 'all_time']),
}).strict().superRefine((query, context) => {
  if (query.category === 'operating_systems' && query.range !== 'all_time') {
    context.addIssue({ code: 'custom', message: 'operating_systems supports all_time only', path: ['range'] })
  }
})

export function parseCodingStatsArguments(value: unknown): CodingStatsRequest | null {
  const parsed = codingStatsQuerySchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
