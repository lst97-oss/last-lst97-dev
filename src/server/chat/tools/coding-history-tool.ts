import type { Logger } from '../../observability/logger'
import { formatHours } from '../../wakatime/format'
import type {
  HistoryCoverage,
  HistoryDayPoint,
  HistoryRange,
  HistoryStreaks,
  HistorySummary,
  HistoryTopEntry,
} from '../../wakatime/history/repository'
import { withTimeout } from '../timeout'

// Second tool behind the chat tool-runner seam: the imported WakaTime heartbeat
// warehouse (deep history: years, months, streaks, daily series, named-project
// filters). Public-share ranges remain with coding_stats. Only formatted
// aggregates reach the model.

export type HistoryOp = 'summary' | 'by_project' | 'by_language' | 'project_time' | 'daily' | 'streaks'
export type CodingHistoryRangePreset = 'all_time' | 'last_year' | 'last_30_days' | 'last_7_days'

export function resolveCodingHistoryRange(preset: CodingHistoryRangePreset, today: string): HistoryRange {
  if (preset === 'all_time') return { from: '2000-01-01', to: today }
  if (preset === 'last_year') {
    const year = Number(today.slice(0, 4)) - 1
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }
  const days = preset === 'last_30_days' ? 30 : 7
  const [year, month, date] = today.split('-').map(Number)
  const from = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1))
  from.setUTCDate(from.getUTCDate() - (days - 1))
  return { from: from.toISOString().slice(0, 10), to: today }
}

export interface HistoryQuery extends HistoryRange {
  op: HistoryOp
  project?: string
}

export interface CodingHistorySource {
  summary(range: HistoryRange): Promise<HistorySummary>
  byProject(range: HistoryRange, limit: number): Promise<HistoryTopEntry[]>
  byLanguage(range: HistoryRange, limit: number): Promise<HistoryTopEntry[]>
  projectTime(range: HistoryRange, project: string): Promise<HistorySummary>
  dailySeries(range: HistoryRange): Promise<HistoryDayPoint[]>
  streaks(today?: string): Promise<HistoryStreaks>
  coverage?(): Promise<HistoryCoverage>
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function shiftMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

function monthRange(year: number, month: number): HistoryRange {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` }
}

function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number)
  const rolled = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1))
  rolled.setUTCDate(rolled.getUTCDate() + delta)
  return rolled.toISOString().slice(0, 10)
}

function detectRange(text: string, today: string): HistoryRange | null {
  if (/\btoday\b/.test(text)) return { from: today, to: today }
  const monthName = Object.keys(MONTHS).find((name) => text.includes(name))
  if (monthName) {
    const withYear = text.match(new RegExp(`${monthName}\\s+(20\\d\\d)`))
    const year = withYear?.[1] ? Number(withYear[1]) : Number(today.slice(0, 4))
    return monthRange(year, MONTHS[monthName] as number)
  }
  const yearMatch = text.match(/\b(20\d\d)\b/)
  if (yearMatch?.[1]) {
    const year = yearMatch[1]
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }
  if (/\blast year\b/.test(text)) {
    const year = Number(today.slice(0, 4)) - 1
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }
  if (/\bthis year\b|\byear to date\b|\bytd\b/.test(text)) {
    return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
  if (/\blast month\b/.test(text)) {
    const [year, month] = today.split('-').map(Number)
    const shifted = shiftMonths(year ?? 1970, month ?? 1, -1)
    return monthRange(shifted.year, shifted.month)
  }
  if (/\bthis month\b/.test(text)) {
    return { from: `${today.slice(0, 7)}-01`, to: today }
  }
  const lastN = text.match(/\blast (\d+) (day|week|month)s?\b/)
  if (lastN?.[1] && lastN[2]) {
    const amount = Number(lastN[1])
    const span = lastN[2] === 'day' ? amount : lastN[2] === 'week' ? amount * 7 : amount * 30
    if (span >= 1) return { from: addDays(today, -(span - 1)), to: today }
    return null
  }
  if (/\ball[\s_-]?time|\btotal\b|\bever\b|\ball\b/.test(text)) {
    return { from: '2000-01-01', to: today }
  }
  return null
}

function detectProjectName(message: string): string | null {
  const quoted = message.match(/["“”'`「」『』]([^"“”'`「」『』]{2,120})["“”'`「」『』]/)
  if (quoted?.[1]) return quoted[1].trim()
  const onPattern = message.match(
    /\bon\s+([A-Za-z0-9][\w+.#-]{1,120})(?:\s+(?:in|during|last|this|for|over|per|project|repo))?\b/i,
  )
  if (
    onPattern?.[1] &&
    !/^(it|that|this|my|the|last|this|total|much|many|time|hours?|project|projects)$/i.test(onPattern[1])
  ) {
    return onPattern[1].trim()
  }
  return null
}

function detectOp(text: string): HistoryOp {
  if (/\bstreak\b/.test(text)) return 'streaks'
  if (/\bper day\b|\bdaily\b|\beach day\b|\bover time\b|\btrend\b|\bchart\b/.test(text)) return 'daily'
  if (/\bprojects?\b/.test(text)) return 'by_project'
  if (/\blanguages?\b/.test(text)) return 'by_language'
  if (/\btop\b|\bbest\b|\bmost\b/.test(text)) return 'by_project'
  return 'summary'
}

const CODING_SIGNAL = /cod(e|ing|er)|program(ming|mer)?|develop(er|ing|ment)?|wakatime|language|project|streak|hour/
const HISTORY_SIGNAL =
  /\bstreak\b|\bper day\b|\bdaily\b|\bover time\b|\btrend\b|\bchart\b|\btop\b|\b202\d\b|\blast (year|month|\d+ (day|week|month)s?)\b|\bthis (year|month)\b|all[\s_-]?time/

export function matchCodingHistoryRequest(message: string, today: string): HistoryQuery | null {
  const text = message.toLowerCase()
  const project = detectProjectName(message)
  // A named project plus a time question is a per-project spend lookup, not
  // a top-N ranking — even without an explicit range it belongs to the DB
  // warehouse, which can filter by a named project.
  if (project && /time|hour|long|much|many|spend|spent|stat|activit/.test(text)) {
    const range = detectRange(text, today) ?? { from: addDays(today, -29), to: today }
    return { ...range, op: 'project_time', project }
  }
  const op = detectOp(text)
  const range = detectRange(text, today)
  if (range) {
    if (!CODING_SIGNAL.test(text) && op === 'summary') return null
    return { ...range, op }
  }
  // Op keywords with a coding signal but no explicit range default to the
  // trailing 30 days (recent depth the bounded public shares do not provide).
  if (op !== 'summary' && (CODING_SIGNAL.test(text) || HISTORY_SIGNAL.test(text))) {
    return { from: addDays(today, -29), to: today, op }
  }
  return null
}

function topLines(entries: HistoryTopEntry[]): string {
  return entries
    .slice(0, 10)
    .map((entry, index) => `${index + 1}. ${entry.name} — ${formatHours(entry.seconds)}`)
    .join('; ')
}

async function coverageText(
  source: CodingHistorySource,
  timeoutMs: number,
  logger: Pick<Logger, 'warn'>,
): Promise<string> {
  if (!source.coverage) return ''
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const coverage = await Promise.race([
      source.coverage(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), Math.max(1, Math.min(2_000, timeoutMs - 1)))
      }),
    ])
    if (!coverage) return ''
    return coverage.through
      ? `Imported warehouse coverage through ${coverage.through}; not live after that date.`
      : 'Imported warehouse coverage is unavailable.'
  } catch (error) {
    logger.warn('chat.coding_history.coverage_unavailable', { error })
    return ''
  } finally {
    clearTimeout(timer)
  }
}

function withCoverage(summary: string, coverage: string, maxLength = 600): string {
  if (!coverage) return summary
  const baseSummary = summary.replace(/[.\s]+$/, '')
  const summaryLimit = Math.max(0, maxLength - coverage.length - 2)
  const boundedSummary = baseSummary.slice(0, summaryLimit).replace(/[.\s]+$/, '')
  return `${boundedSummary}; ${coverage}`.slice(0, maxLength)
}

export async function runCodingHistoryTool(
  query: HistoryQuery,
  source: CodingHistorySource,
  dependencies: { timeoutMs: number; today: string; logger: Pick<Logger, 'warn'> },
): Promise<string | null> {
  const run = (async (): Promise<string> => {
    const label = `${query.from} → ${query.to}`
    switch (query.op) {
      case 'streaks': {
        const streaks: HistoryStreaks = await source.streaks(dependencies.today)
        return `Coding streaks: longest ${streaks.longestDays} days; current streak ${streaks.currentDays} days.`
      }
      case 'daily': {
        const [summary, series] = await Promise.all([source.summary(query), source.dailySeries(query)])
        const peak = series.reduce<HistoryDayPoint | null>(
          (best, point) => (!best || point.seconds > best.seconds ? point : best),
          null,
        )
        const recent = series
          .slice(-7)
          .map((point) => `${point.date.slice(5)} ${formatHours(point.seconds)}`)
          .join(', ')
        const parts = [
          `Coding history (${label}): ${formatHours(summary.totalSeconds)} total across ${summary.activeDays} active days`,
        ]
        if (peak) parts.push(`peak ${peak.date} (${formatHours(peak.seconds)})`)
        if (recent) parts.push(`recent: ${recent}`)
        return parts.join('; ').slice(0, 600)
      }
      case 'by_project':
      case 'by_language': {
        const entries =
          query.op === 'by_project' ? await source.byProject(query, 10) : await source.byLanguage(query, 5)
        if (entries.length === 0) return `Coding history (${label}): no activity recorded.`
        const kind = query.op === 'by_project' ? 'Top projects' : 'Top languages'
        return `Coding history (${label}). ${kind}: ${topLines(entries)}.`.slice(
          0,
          query.op === 'by_project' ? 1_100 : 600,
        )
      }
      case 'project_time': {
        if (!query.project) return `Coding history (${label}): no project named.`
        const spent = await source.projectTime(query, query.project)
        if (spent.heartbeatCount === 0)
          return `Coding history (${label}): no activity recorded for project ${query.project}.`
        return `Coding history (${label}): ${formatHours(spent.totalSeconds)} on project ${query.project} across ${spent.activeDays} active days (${spent.heartbeatCount} heartbeats).`.slice(
          0,
          600,
        )
      }
      case 'summary': {
        const [summary, projects, languages] = await Promise.all([
          source.summary(query),
          source.byProject(query, 1),
          source.byLanguage(query, 1),
        ])
        if (summary.heartbeatCount === 0) return `Coding history (${label}): no activity recorded.`
        const parts = [
          `Coding history (${label}): ${formatHours(summary.totalSeconds)} total across ${summary.activeDays} active days`,
        ]
        if (projects[0]) parts.push(`top project ${projects[0].name} (${formatHours(projects[0].seconds)})`)
        if (languages[0]) parts.push(`top language ${languages[0].name} (${formatHours(languages[0].seconds)})`)
        return parts.join('; ').slice(0, 600)
      }
    }
  })()
  try {
    const summary = await withTimeout(run, dependencies.timeoutMs, 'Coding history request timed out')
    return withCoverage(
      summary,
      await coverageText(source, dependencies.timeoutMs, dependencies.logger),
      query.op === 'by_project' ? 1_200 : 600,
    )
  } catch (error) {
    dependencies.logger.warn('chat.coding_history.unavailable', { error })
    return null
  }
}
