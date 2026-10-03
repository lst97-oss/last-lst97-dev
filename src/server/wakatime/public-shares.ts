import { z } from 'zod'
import type { Logger } from '../observability/logger'
import { formatHours } from './format'
import type {
  CodingActivityStats,
  CodingBreakdownStats,
  CodingCategoryStats,
  CodingStatsCategory,
  CodingStatsCategoryItem,
  CodingStatsItem,
  CodingStatsPeriod,
  CodingStatsRange,
  CodingStatsRequest,
  CodingStatsResult,
  WakaTimeStatsClient,
} from './stats'
import { parseCodingStatsArguments } from './stats'

export interface WakaTimeShareClientConfig {
  fetcher?: (input: string, init?: RequestInit) => Promise<Response>
  timeoutMs?: number
  cacheTtlMs?: number
  failureCacheTtlMs?: number
  now?: () => Date
  logger: Pick<Logger, 'warn'>
}

interface CachedWakaTimeShare {
  at: number
  result: CodingStatsResult | null
}

interface WakaTimeActivitySnapshot {
  period: CodingStatsPeriod
  totalSeconds: number
  breakdownSeconds: number
  daysInPeriod: number
  humanReadableTotal: string
  bestDay?: { date: string; totalSeconds: number; humanReadableTotal: string }
}

const SHARE_IDS: Record<CodingStatsCategory, Record<CodingStatsRange, string>> = {
  activity: {
    all_time: 'd885f548-937f-4e1c-9822-0e0058e3213f',
    last_7_days: 'd13fb0aa-e015-4a49-9884-0b638679e657',
    last_30_days: '6b0864f8-c3fd-431e-82d0-c2cd3bc73edd',
    last_year: 'd9c946be-3f11-4c43-81f7-424e1c77dfca',
  },
  languages: {
    all_time: 'f921552c-8587-46a8-b813-da1a6d1cbf73',
    last_7_days: '198cec9a-3a04-423b-adc7-c1a1a6161aa8',
    last_30_days: 'b5ab534d-a9ff-4a65-99e1-fca6422afd47',
    last_year: '84c681d0-0da1-464f-95d2-1290a1582a20',
  },
  editors: {
    all_time: '76bd890c-a0ec-4d98-a6b4-b4c0d77ab44a',
    last_7_days: 'd4417f05-3761-4264-b0fe-e783abfce703',
    last_30_days: 'f9274414-c9d9-433b-8665-713070a9e0e7',
    last_year: '82d301f9-64ba-4346-a0d8-18b2c15b11b5',
  },
  operating_systems: {
    all_time: '1f8ae601-2530-4fe7-b869-b911c476d77f',
    last_7_days: '1f8ae601-2530-4fe7-b869-b911c476d77f',
    last_30_days: '1f8ae601-2530-4fe7-b869-b911c476d77f',
    last_year: '1f8ae601-2530-4fe7-b869-b911c476d77f',
  },
  categories: {
    all_time: 'e153fd80-1406-4d6c-a67b-54f259c2bf11',
    last_7_days: '364f7e2b-adfa-4ffa-a6da-d086c4bbb7e8',
    last_30_days: '814717be-3c2f-4450-a994-f16c6846505a',
    last_year: '1ffe713e-e963-4338-b20a-480285b34643',
  },
}

const PERIOD_LABELS: Record<CodingStatsRange, string> = {
  all_time: 'all time',
  last_7_days: 'last 7 days',
  last_30_days: 'last 30 days',
  last_year: 'last year',
}

const MAX_RESPONSE_CHARACTERS = 1_000_000
const MAX_RESULT_ITEMS = 10

const shareItemSchema = z
  .object({
    name: z.string().min(1),
    percent: z.number().finite().min(0).max(100),
  })
  .passthrough()

const shareItemResponseSchema = z.object({ data: z.array(shareItemSchema).max(200) }).passthrough()

const activityDaySchema = z
  .object({
    range: z
      .object({
        start: z.string().min(1),
        end: z.string().min(1),
      })
      .passthrough(),
    grand_total: z
      .object({
        total_seconds: z.number().finite().min(0),
      })
      .passthrough(),
  })
  .passthrough()

const activityRangeSchema = z
  .object({
    range: z
      .object({
        start: z.string().min(1),
        end: z.string().min(1),
        days_including_holidays: z.number().int().nonnegative(),
      })
      .passthrough(),
    grand_total: z
      .object({
        total_seconds: z.number().finite().min(0),
        human_readable_total: z.string().min(1),
        human_readable_total_including_other_language: z.string().min(1).optional(),
        total_seconds_including_other_language: z.number().finite().min(0).optional(),
      })
      .passthrough(),
    best_day: z
      .object({
        date: z.string().min(1),
        total_seconds: z.number().finite().min(0),
        text: z.string().min(1),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

const activityDailyResponseSchema = z.object({ data: z.array(activityDaySchema).min(1).max(400) }).passthrough()
const activitySummaryResponseSchema = z.object({ data: activityRangeSchema }).passthrough()

export function wakaTimeShareUrl(category: CodingStatsCategory, range: CodingStatsRange): string {
  return `https://wakatime.com/share/@lst97/${SHARE_IDS[category][range]}.json`
}

function normalizeItems(items: Array<{ name: string; percent: number }>): CodingStatsItem[] {
  return items.slice(0, MAX_RESULT_ITEMS).map((item) => ({
    name: item.name.slice(0, 120),
    percent: Number(item.percent.toFixed(2)),
  }))
}

function parseActivitySnapshot(body: unknown, range: CodingStatsRange): WakaTimeActivitySnapshot {
  const daily = activityDailyResponseSchema.safeParse(body)
  if (daily.success) {
    const days = daily.data.data
    const totalSeconds = days.reduce((sum, day) => sum + day.grand_total.total_seconds, 0)
    const best = days.reduce<(typeof days)[number] | null>(
      (current, day) => (!current || day.grand_total.total_seconds > current.grand_total.total_seconds ? day : current),
      null,
    )
    const firstDay = days.at(0)
    if (!firstDay) throw new Error('WakaTime activity share has no daily entries')
    let periodStart = firstDay.range.start
    let periodEnd = firstDay.range.end
    for (const day of days) {
      if (day.range.start < periodStart) periodStart = day.range.start
      if (day.range.end > periodEnd) periodEnd = day.range.end
    }
    return {
      period: { range, start: periodStart, end: periodEnd },
      totalSeconds,
      breakdownSeconds: totalSeconds,
      daysInPeriod: days.length,
      humanReadableTotal: formatHours(totalSeconds),
      ...(best
        ? {
            bestDay: {
              date: best.range.start.slice(0, 10),
              totalSeconds: best.grand_total.total_seconds,
              humanReadableTotal: formatHours(best.grand_total.total_seconds),
            },
          }
        : {}),
    }
  }

  const summary = activitySummaryResponseSchema.safeParse(body)
  if (!summary.success) throw new Error('WakaTime share response is invalid')
  const data = summary.data.data
  const totalSeconds = data.grand_total.total_seconds
  const breakdownSeconds = data.grand_total.total_seconds_including_other_language ?? totalSeconds
  return {
    period: { range, start: data.range.start, end: data.range.end },
    totalSeconds: breakdownSeconds,
    breakdownSeconds,
    daysInPeriod: data.range.days_including_holidays,
    humanReadableTotal:
      data.grand_total.human_readable_total_including_other_language ?? data.grand_total.human_readable_total,
    ...(data.best_day
      ? {
          bestDay: {
            date: data.best_day.date,
            totalSeconds: data.best_day.total_seconds,
            humanReadableTotal: data.best_day.text,
          },
        }
      : {}),
  }
}

function periodDescription(period: CodingStatsPeriod): string {
  const label = PERIOD_LABELS[period.range]
  return period.start && period.end ? `${label}, through ${period.end.slice(0, 10)}` : label
}

export function formatWakaTimeShareSummary(result: CodingStatsResult): string {
  if (result.category === 'activity') {
    const parts = [
      `WakaTime public share activity (${periodDescription(result.period)}, fetched ${result.retrievedAtUtc}): ${result.humanReadableTotal} total`,
      `days represented ${result.daysInPeriod}`,
    ]
    if (result.bestDay) parts.push(`best day ${result.bestDay.date}: ${result.bestDay.humanReadableTotal}`)
    return parts.join('; ').slice(0, 600)
  }
  if (result.category === 'categories') {
    const items = result.items
      .map(
        ({ name, percent, humanReadableEstimate }) =>
          `${name} ${percent.toFixed(2)}% (estimated ${humanReadableEstimate})`,
      )
      .join('; ')
    return `WakaTime public share categories (${periodDescription(result.period)}, fetched ${result.retrievedAtUtc}): ${items}`.slice(
      0,
      600,
    )
  }
  const label = result.category.replace('_', ' ')
  const items = result.items.map(({ name, percent }) => `${name} ${percent.toFixed(2)}%`).join('; ')
  return `WakaTime public share ${label} (${periodDescription(result.period)}, fetched ${result.retrievedAtUtc}): ${items}`.slice(
    0,
    600,
  )
}

export function createWakaTimeStatsClient(dependencies: WakaTimeShareClientConfig): WakaTimeStatsClient {
  const fetcher = dependencies.fetcher ?? fetch
  const timeoutMs = dependencies.timeoutMs ?? 5_000
  const cacheTtlMs = dependencies.cacheTtlMs ?? 30 * 60_000
  const failureCacheTtlMs = dependencies.failureCacheTtlMs ?? 60_000
  const now = dependencies.now ?? (() => new Date())
  // One in-flight request per URL, so a burst of concurrent misses for the same
  // share (the agent loop batches tool calls) collapses to a single upstream
  // call instead of one per caller. TTLs read the injected `now` rather than
  // `Date.now()`, so the windows are drivable in tests.
  const clockMs = (): number => now().getTime()
  const inFlight = new Map<string, Promise<CodingStatsResult | null>>()
  const cache = new Map<string, CachedWakaTimeShare>()

  async function loadPayload(url: string): Promise<unknown> {
    const response = await fetcher(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) throw new Error('WakaTime share request failed')
    const text = await response.text()
    if (!text || text.length > MAX_RESPONSE_CHARACTERS) throw new Error('WakaTime share response is invalid')
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new Error('WakaTime share response is invalid')
    }
  }

  function makeActivityResult(snapshot: WakaTimeActivitySnapshot, retrievedAtUtc: string): CodingActivityStats {
    return {
      category: 'activity',
      period: snapshot.period,
      retrievedAtUtc,
      totalSeconds: snapshot.totalSeconds,
      daysInPeriod: snapshot.daysInPeriod,
      humanReadableTotal: snapshot.humanReadableTotal,
      ...(snapshot.bestDay ? { bestDay: snapshot.bestDay } : {}),
    }
  }

  return {
    async fetchSummary(query: CodingStatsRequest) {
      const request = parseCodingStatsArguments(query)
      if (!request) return null
      const url = wakaTimeShareUrl(request.category, request.range)
      const cached = cache.get(url)
      if (cached && clockMs() - cached.at < (cached.result === null ? failureCacheTtlMs : cacheTtlMs))
        return cached.result

      const pending = inFlight.get(url)
      if (pending) return pending

      // Register the promise synchronously so concurrent callers for the same
      // share join this request instead of starting their own.
      const load = (async () => {
        let result: CodingStatsResult | null = null
        try {
          const payload = await loadPayload(url)
          const retrievedAtUtc = now().toISOString()
          if (request.category === 'activity') {
            result = makeActivityResult(parseActivitySnapshot(payload, request.range), retrievedAtUtc)
          } else if (request.category === 'categories') {
            const [categoryPayload, activityPayload] = await Promise.all([
              payload,
              loadPayload(wakaTimeShareUrl('activity', request.range)),
            ])
            const parsed = shareItemResponseSchema.safeParse(categoryPayload)
            if (!parsed.success) throw new Error('WakaTime share response is invalid')
            const activity = parseActivitySnapshot(activityPayload, request.range)
            const items: CodingStatsCategoryItem[] = normalizeItems(parsed.data.data).map((item) => {
              const estimatedSeconds = Math.round((activity.breakdownSeconds * item.percent) / 100)
              return { ...item, estimatedSeconds, humanReadableEstimate: formatHours(estimatedSeconds) }
            })
            const categoryResult: CodingCategoryStats = {
              category: 'categories',
              period: activity.period,
              retrievedAtUtc,
              items,
            }
            result = categoryResult
          } else {
            const parsed = shareItemResponseSchema.safeParse(payload)
            if (!parsed.success) throw new Error('WakaTime share response is invalid')
            const breakdownResult: CodingBreakdownStats = {
              category: request.category,
              period: { range: request.range, start: null, end: null },
              retrievedAtUtc,
              items: normalizeItems(parsed.data.data),
            }
            result = breakdownResult
          }
        } catch {
          dependencies.logger.warn('wakatime.public_share.failed', { category: request.category, range: request.range })
          result = null
        }

        cache.set(url, { at: clockMs(), result })
        inFlight.delete(url)
        return result
      })()

      inFlight.set(url, load)
      return load
    },
  }
}
