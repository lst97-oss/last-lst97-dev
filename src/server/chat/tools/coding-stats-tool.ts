import type { Logger } from '../../observability/logger'
import { formatWakaTimeShareSummary } from '../../wakatime/public-shares'
import {
  type CodingStatsCategory,
  type CodingStatsRange,
  parseCodingStatsArguments,
  type WakaTimeStatsClient,
} from '../../wakatime/stats'
import { withTimeout } from '../timeout'

// WakaTime public-share tool. The configured JSON shares are fetched on demand
// and include their own period/fetch time; coding_history handles deep,
// conditional warehouse queries and has an import cutoff.

export interface CodingStatsQuery {
  category: CodingStatsCategory
  range: CodingStatsRange
}

const RANGE_PATTERNS: Record<CodingStatsRange, RegExp> = {
  all_time: /\ball[\s_-]?time\b|\btotal\b|\bever\b|\boverall\b|\bacross all\b/,
  last_year: /\blast year\b|\bpast year\b|\bthis year\b|\byear to date\b|\bytd\b/,
  last_30_days: /\blast 30 days?\b|\blast month\b|\bpast month\b|\bthis month\b/,
  last_7_days: /\blast 7 days?\b|\blast week\b|\bpast week\b|\bthis week\b|\blately\b|\brecently\b/,
}

function detectRange(text: string): CodingStatsRange {
  if (RANGE_PATTERNS.all_time.test(text)) return 'all_time'
  if (RANGE_PATTERNS.last_year.test(text)) return 'last_year'
  if (RANGE_PATTERNS.last_30_days.test(text)) return 'last_30_days'
  return 'last_7_days'
}

function detectCategory(text: string): CodingStatsCategory {
  if (/\b(?:programming languages?|languages?)\b/.test(text)) return 'languages'
  if (/\b(?:editors?|ides?)\b/.test(text)) return 'editors'
  if (/\b(?:operating systems?|os)\b/.test(text)) return 'operating_systems'
  if (
    /\b(?:categories|ai coding|human coding|writing docs|writing tests|debugging|code reviewing|building)\b/.test(text)
  )
    return 'categories'
  return 'activity'
}

export function matchCodingStatsRequest(message: string): CodingStatsQuery | null {
  const text = message.toLowerCase()
  const asksWakaTime = text.includes('wakatime')
  const category = detectCategory(text)
  const range = detectRange(text)
  const hasCodingSignal =
    asksWakaTime ||
    /\b(?:cod(e|ing|er)|program(ming|mer)?|develop(er|ing|ment)?|software|github|editor|ide|operating system|language|activity|hours?)\b/.test(
      text,
    )
  const hasTimeSignal =
    /\b(?:time|times|hour|hours|day|days|total|stat|stats|statistic|statistics|activity|activities|week|weeks|month|months|year|years|today|daily|average|recent|lately|all[\s_-]?time)\b/.test(
      text,
    )
  if (!hasCodingSignal || !hasTimeSignal) return null
  if (category === 'operating_systems' && range !== 'all_time') return null
  return { category, range }
}

export function codingStatsLabel(query: CodingStatsQuery): string {
  const category = query.category === 'operating_systems' ? 'OPERATING SYSTEMS' : query.category.toUpperCase()
  return `CHECKING WAKATIME ${category} · ${query.range.replaceAll('_', ' ').toUpperCase()}…`
}

export async function runCodingStatsTool(
  query: CodingStatsQuery,
  source: Pick<WakaTimeStatsClient, 'fetchSummary'>,
  dependencies: { timeoutMs: number; logger: Pick<Logger, 'warn'> },
): Promise<string | null> {
  try {
    const result = await withTimeout(
      source.fetchSummary(query),
      dependencies.timeoutMs,
      'Coding stats request timed out',
    )
    return result ? formatWakaTimeShareSummary(result) : null
  } catch (error) {
    dependencies.logger.warn('chat.coding_stats.unavailable', { category: query.category, range: query.range, error })
    return null
  }
}

export function parseCodingStatsToolArguments(value: unknown): CodingStatsQuery | null {
  return parseCodingStatsArguments(value)
}
