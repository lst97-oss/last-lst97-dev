import { describe, expect, it } from 'bun:test'

import { createWakaTimeStatsClient, formatWakaTimeShareSummary, wakaTimeShareUrl } from '../../src/server/wakatime/public-shares'
import type { CodingStatsResult } from '../../src/server/wakatime/stats'
import type { Logger } from '../../src/server/observability/logger'

const logger: Logger = { debug() {}, info() {}, warn() {}, error() {} }
const now = () => new Date('2026-09-24T13:00:00.000Z')

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
}

const dailyActivity = {
  data: [
    {
      range: { start: '2026-09-23T14:00:00Z', end: '2026-09-24T13:59:59Z' },
      grand_total: { total_seconds: 3_600 },
    },
    {
      range: { start: '2026-09-22T14:00:00Z', end: '2026-09-23T13:59:59Z' },
      grand_total: { total_seconds: 1_800 },
    },
  ],
}

const allTimeActivity = {
  data: {
    range: { start: '2024-02-06T13:00:00Z', end: '2026-09-23T13:59:59Z', days_including_holidays: 960 },
    grand_total: {
      total_seconds: 11_127_679.169629,
      total_seconds_including_other_language: 11_744_496.007529,
      human_readable_total: '3,091 hrs 1 min',
      human_readable_total_including_other_language: '3,262 hrs 21 mins',
    },
    best_day: { date: '2026-08-20', total_seconds: 51_844.725816, text: '14 hrs 24 mins' },
  },
}

const items = {
  data: [
    { name: 'TypeScript', percent: 63.11, color: '#3178c6' },
    { name: 'Markdown', percent: 7.37, color: '#083fa1' },
  ],
}

function result(overrides: Partial<CodingStatsResult> = {}): CodingStatsResult {
  return {
    category: 'activity',
    period: { range: 'all_time', start: '2024-02-06T13:00:00Z', end: '2026-09-23T13:59:59Z' },
    retrievedAtUtc: now().toISOString(),
    totalSeconds: 11_744_496,
    daysInPeriod: 960,
    humanReadableTotal: '3,262 hrs 21 mins',
    bestDay: { date: '2026-08-20', totalSeconds: 51_844.7, humanReadableTotal: '14 hrs 24 mins' },
    ...overrides,
  } as CodingStatsResult
}

describe('WakaTime public-share service', () => {
  it('maps every supported category and range to the configured public JSON share', async () => {
    const seen: string[] = []
    const client = createWakaTimeStatsClient({
      now,
      logger,
      fetcher: async (url) => {
        seen.push(url)
        if (url.includes('d885f548-937f-4e1c-9822-0e0058e3213f')) return jsonResponse(allTimeActivity)
        if (url.includes('d13fb0aa-e015-4a49-9884-0b638679e657')) return jsonResponse(dailyActivity)
        return jsonResponse(items)
      },
    })

    const activity = await client.fetchSummary({ category: 'activity', range: 'all_time' })
    const recent = await client.fetchSummary({ category: 'activity', range: 'last_7_days' })
    const languages = await client.fetchSummary({ category: 'languages', range: 'last_7_days' })
    const editors = await client.fetchSummary({ category: 'editors', range: 'all_time' })
    const systems = await client.fetchSummary({ category: 'operating_systems', range: 'all_time' })

    expect(activity).toMatchObject({ category: 'activity', humanReadableTotal: '3,262 hrs 21 mins', daysInPeriod: 960 })
    expect(recent).toMatchObject({ category: 'activity', totalSeconds: 5_400, daysInPeriod: 2, humanReadableTotal: '1 hrs 30 mins' })
    expect(recent?.category === 'activity' ? recent.period : null).toEqual({ range: 'last_7_days', start: '2026-09-22T14:00:00Z', end: '2026-09-24T13:59:59Z' })
    expect(languages?.category === 'languages' ? languages.items[0] : null).toMatchObject({ name: 'TypeScript', percent: 63.11 })
    expect(editors?.category === 'editors' ? editors.items[0] : null).toMatchObject({ name: 'TypeScript', percent: 63.11 })
    expect(systems?.category === 'operating_systems' ? systems.items[0] : null).toMatchObject({ name: 'TypeScript', percent: 63.11 })
    expect(seen).toEqual([
      wakaTimeShareUrl('activity', 'all_time'),
      wakaTimeShareUrl('activity', 'last_7_days'),
      wakaTimeShareUrl('languages', 'last_7_days'),
      wakaTimeShareUrl('editors', 'all_time'),
      wakaTimeShareUrl('operating_systems', 'all_time'),
    ])
    expect(seen.every((url) => url.startsWith('https://wakatime.com/share/@lst97/'))).toBe(true)
  })

  it('pairs category percentages with activity totals to estimate category hours', async () => {
    const client = createWakaTimeStatsClient({
      now,
      logger,
      fetcher: async (url) => jsonResponse(url.includes('364f7e2b-adfa-4ffa-a6da-d086c4bbb7e8')
        ? { data: [{ name: 'AI Coding', percent: 50 }, { name: 'Coding', percent: 25 }] }
        : allTimeActivity),
    })

    const categoryResult = await client.fetchSummary({ category: 'categories', range: 'last_7_days' })

    expect(categoryResult).toMatchObject({ category: 'categories', period: { range: 'last_7_days' } })
    expect(categoryResult?.category === 'categories' ? categoryResult.items[0] : null).toMatchObject({ name: 'AI Coding', percent: 50, humanReadableEstimate: '1631 hrs 11 mins' })
  })

  it('caches a successful share independently from failures', async () => {
    const calls: string[] = []
    const client = createWakaTimeStatsClient({
      now,
      logger,
      fetcher: async (url) => {
        calls.push(url)
        return jsonResponse(items)
      },
    })

    await client.fetchSummary({ category: 'languages', range: 'last_7_days' })
    await client.fetchSummary({ category: 'languages', range: 'last_7_days' })

    expect(calls).toEqual([wakaTimeShareUrl('languages', 'last_7_days')])
  })

  it('returns null with a sanitized warning on invalid or unavailable shares', async () => {
    const warnings: Array<{ event: string; fields?: Record<string, unknown> }> = []
    const invalid = createWakaTimeStatsClient({ now, logger: { ...logger, warn(event, fields) { warnings.push({ event, fields }) } }, fetcher: async () => jsonResponse({ data: [{ name: 'x', percent: 101 }] }) })
    const unavailable = createWakaTimeStatsClient({ now, logger, fetcher: async () => jsonResponse({ private: 'provider detail' }, 503) })

    await expect(invalid.fetchSummary({ category: 'languages', range: 'last_7_days' })).resolves.toBeNull()
    await expect(unavailable.fetchSummary({ category: 'activity', range: 'all_time' })).resolves.toBeNull()
    expect(warnings).toContainEqual({ event: 'wakatime.public_share.failed', fields: { category: 'languages', range: 'last_7_days' } })
  })

  it('rejects invalid direct client requests before making a network call', async () => {
    let calls = 0
    const client = createWakaTimeStatsClient({
      now,
      logger,
      fetcher: async () => {
        calls += 1
        return jsonResponse(items)
      },
    })

    await expect(client.fetchSummary({ category: 'operating_systems', range: 'last_7_days' })).resolves.toBeNull()
    expect(calls).toBe(0)
  })

  it('formats a bounded, freshness-labelled LLM summary', () => {
    const summary = formatWakaTimeShareSummary(result())

    expect(summary).toContain('WakaTime public share activity')
    expect(summary).toContain('3,262 hrs 21 mins')
    expect(summary).toContain('through 2026-09-23')
    expect(summary).toContain('fetched 2026-09-24T13:00:00.000Z')
    expect(summary.length).toBeLessThanOrEqual(600)
  })
})
