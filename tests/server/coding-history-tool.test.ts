import { describe, expect, it } from 'bun:test'

import { matchCodingHistoryRequest, runCodingHistoryTool } from '../../src/server/chat/tools/coding-history-tool'

const TODAY = '2026-09-23'

describe('matchCodingHistoryRequest', () => {
  it('claims explicit years, months, and all-time questions', () => {
    expect(matchCodingHistoryRequest('How much did I code in 2025?', TODAY)).toMatchObject({
      from: '2025-01-01', to: '2025-12-31', op: 'summary',
    })
    expect(matchCodingHistoryRequest('Coding time last month?', TODAY)).toMatchObject({
      from: '2026-08-01', to: '2026-08-31', op: 'summary',
    })
    expect(matchCodingHistoryRequest('How long have you been coding in total?', TODAY)).toMatchObject({
      from: '2000-01-01', to: TODAY, op: 'summary',
    })
    expect(matchCodingHistoryRequest('Top languages March 2025?', TODAY)).toMatchObject({
      from: '2025-03-01', to: '2025-03-31', op: 'by_language',
    })
  })

  it('claims streak and daily questions with a trailing-30-day default', () => {
    expect(matchCodingHistoryRequest('What is my longest coding streak?', TODAY)).toMatchObject({
      from: '2026-08-25', to: TODAY, op: 'streaks',
    })
    expect(matchCodingHistoryRequest('Show my daily coding time', TODAY)).toMatchObject({
      from: '2026-08-25', to: TODAY, op: 'daily',
    })
    expect(matchCodingHistoryRequest('Top projects in the last 60 days?', TODAY)).toMatchObject({
      from: '2026-07-26', to: TODAY, op: 'by_project',
    })
  })

  it('supports the four project activity range presets, including a seven-day breakdown', () => {
    expect(matchCodingHistoryRequest('Show all projects for all time', TODAY)).toMatchObject({ from: '2000-01-01', to: TODAY, op: 'by_project' })
    expect(matchCodingHistoryRequest('Show all projects from last year', TODAY)).toMatchObject({ from: '2025-01-01', to: '2025-12-31', op: 'by_project' })
    expect(matchCodingHistoryRequest('Show all projects for the last 30 days', TODAY)).toMatchObject({ from: '2026-08-25', to: TODAY, op: 'by_project' })
    expect(matchCodingHistoryRequest('Show all projects for the last 7 days', TODAY)).toMatchObject({ from: '2026-09-17', to: TODAY, op: 'by_project' })
    expect(matchCodingHistoryRequest('How about the all time status for all the projects?', TODAY)).toMatchObject({ from: '2000-01-01', to: TODAY, op: 'by_project' })
  })

  it('uses the WakaTime database for today and recent active-project queries', () => {
    expect(matchCodingHistoryRequest('How many hours did you code today?', TODAY)).toMatchObject({
      from: TODAY, to: TODAY, op: 'summary',
    })
    expect(matchCodingHistoryRequest('What project are you currently working on?', TODAY)).toMatchObject({
      from: '2026-08-25', to: TODAY, op: 'by_project',
    })
  })

  it('routes named-project spend to the project_time op', () => {
    expect(matchCodingHistoryRequest('How much time did I spend on best-maker-web in 2025?', TODAY)).toMatchObject({
      from: '2025-01-01', to: '2025-12-31', op: 'project_time', project: 'best-maker-web',
    })
    expect(matchCodingHistoryRequest('Time on "my-cool-app" last month?', TODAY)).toMatchObject({
      op: 'project_time', project: 'my-cool-app',
    })
  })

  it('leaves recent, range-less questions to the public-share tool', () => {
    expect(matchCodingHistoryRequest('How much did you code this week?', TODAY)).toBeNull()
    expect(matchCodingHistoryRequest('What is recursion?', TODAY)).toBeNull()
    expect(matchCodingHistoryRequest('Tell me about yourself', TODAY)).toBeNull()
  })
})

describe('runCodingHistoryTool project_time', () => {
  it('returns up to ten projects for a project-time breakdown', async () => {
    let requestedLimit = 0
    const entries = Array.from({ length: 10 }, (_, index) => ({
      name: `project-${index + 1}`, seconds: (10 - index) * 3_600, heartbeats: 10,
    }))
    const result = await runCodingHistoryTool(
      { op: 'by_project', from: '2000-01-01', to: TODAY },
      {
        summary: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        byProject: async (_range, limit) => { requestedLimit = limit; return entries },
        byLanguage: async () => [], projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [], streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
      { timeoutMs: 1_000, today: TODAY, logger: { warn() {} } },
    )

    expect(requestedLimit).toBe(10)
    expect(result).toContain('10. project-10')
  })

  it('reports per-project spend with the project name', async () => {
    const summary = await runCodingHistoryTool(
      { op: 'project_time', from: '2025-01-01', to: '2025-12-31', project: 'best-maker-web' },
      {
        summary: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        byProject: async () => [],
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 7200, activeDays: 4, heartbeatCount: 100 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
      { timeoutMs: 1_000, today: TODAY, logger: { warn() {} } },
    )

    expect(summary).toContain('best-maker-web')
    expect(summary).toContain('2 hrs')
  })

  it('reports the actual imported-through date without making coverage fatal', async () => {
    const source = {
      summary: async () => ({ totalSeconds: 7200, activeDays: 2, heartbeatCount: 20 }),
      byProject: async () => [],
      byLanguage: async () => [],
      projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
      dailySeries: async () => [],
      streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      coverage: async () => ({ through: '2026-09-22' }),
    }
    const summary = await runCodingHistoryTool(
      { op: 'summary', from: '2025-01-01', to: '2025-12-31' },
      source,
      { timeoutMs: 1_000, today: TODAY, logger: { warn() {} } },
    )
    const coverageFailure = await runCodingHistoryTool(
      { op: 'summary', from: '2025-01-01', to: '2025-12-31' },
      { ...source, coverage: async () => { throw new Error('database unavailable') } },
      { timeoutMs: 1_000, today: TODAY, logger: { warn() {} } },
    )

    expect(summary).toContain('Imported warehouse coverage through 2026-09-22; not live after that date.')
    expect(coverageFailure).toContain('2 hrs total across 2 active days')
    expect(coverageFailure).not.toContain('database unavailable')
  })
})
