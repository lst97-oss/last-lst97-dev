import { describe, expect, it } from 'bun:test'

import {
  matchCodingStatsRequest,
  parseCodingStatsToolArguments,
  runCodingStatsTool,
} from '../../src/server/chat/tools/coding-stats-tool'
import type { CodingStatsRequest, CodingStatsResult } from '../../src/server/wakatime/stats'

const RETRIEVED_AT = '2026-09-24T13:00:00.000Z'
const ranges = ['last_7_days', 'last_30_days', 'last_year', 'all_time'] as const
const rangePhrases = {
  last_7_days: 'last 7 days',
  last_30_days: 'last 30 days',
  last_year: 'last year',
  all_time: 'all time',
} as const
const categoryPhrases = {
  activity: 'coding activity',
  languages: 'programming languages',
  editors: 'editors',
  operating_systems: 'operating systems',
  categories: 'work categories',
} as const

const supportedRequests: CodingStatsRequest[] = [
  ...ranges.map((range) => ({ category: 'activity', range }) as CodingStatsRequest),
  ...ranges.map((range) => ({ category: 'languages', range }) as CodingStatsRequest),
  ...ranges.map((range) => ({ category: 'editors', range }) as CodingStatsRequest),
  { category: 'operating_systems', range: 'all_time' },
  ...ranges.map((range) => ({ category: 'categories', range }) as CodingStatsRequest),
]

function resultFor(query: CodingStatsRequest): CodingStatsResult {
  const period = { range: query.range, start: null, end: null }
  if (query.category === 'activity') {
    return {
      category: 'activity',
      period,
      retrievedAtUtc: RETRIEVED_AT,
      totalSeconds: 3_600,
      daysInPeriod: 7,
      humanReadableTotal: '1 hrs',
    }
  }
  if (query.category === 'categories') {
    return {
      category: 'categories',
      period,
      retrievedAtUtc: RETRIEVED_AT,
      items: [{ name: 'AI Coding', percent: 50, estimatedSeconds: 1_800, humanReadableEstimate: '0 hrs 30 mins' }],
    }
  }
  return {
    category: query.category,
    period,
    retrievedAtUtc: RETRIEVED_AT,
    items: [{ name: 'TypeScript', percent: 100 }],
  }
}

describe('coding_stats request matching', () => {
  it('maps every supported public-share category and range deterministically', () => {
    for (const query of supportedRequests) {
      const phrase = `WakaTime ${categoryPhrases[query.category]} ${rangePhrases[query.range]}`
      expect(matchCodingStatsRequest(phrase)).toEqual(query)
      expect(parseCodingStatsToolArguments(query)).toEqual(query)
    }
  })

  it('rejects operating-system shares outside the all-time period', () => {
    for (const range of ranges.filter((value) => value !== 'all_time')) {
      const query = { category: 'operating_systems', range }
      expect(matchCodingStatsRequest(`WakaTime operating systems ${rangePhrases[range]}`)).toBeNull()
      expect(parseCodingStatsToolArguments(query)).toBeNull()
    }
  })
})

describe('coding_stats output freshness', () => {
  it('reports the requested period and retrieval time for every category', async () => {
    for (const query of supportedRequests) {
      const output = await runCodingStatsTool(
        query,
        { fetchSummary: async () => resultFor(query) },
        { timeoutMs: 1_000, logger: { warn() {} } },
      )

      expect(output).toContain(rangePhrases[query.range])
      expect(output).toContain(`fetched ${RETRIEVED_AT}`)
      expect(output?.length).toBeLessThanOrEqual(600)
    }
  })
})
