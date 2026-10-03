import { describe, expect, it } from 'bun:test'

import { projectCatalogFiltersSchema } from '../../src/server/knowledge/project-catalog'

describe('project catalogue filters', () => {
  it('accepts software kinds, languages, metrics, dates, and sorting in one request', () => {
    const result = projectCatalogFiltersSchema.safeParse({
      languages: ['Python', 'Rust'],
      kinds: ['web_app', 'api_backend'],
      topics: ['speech-recognition'],
      visibility: ['public'],
      created_after: '2024-01-01',
      updated_before: '2026-09-25',
      min_stars: 2,
      max_forks: 5,
      min_time_spent_seconds: 3_600,
      time_spent_from: '2024-01-01',
      sort_by: 'time_spent',
      sort_direction: 'desc',
      limit: 10,
    })

    expect(result.success).toBe(true)
  })

  it('accepts a named WakaTime range for project time filtering', () => {
    for (const time_spent_range of ['all_time', 'last_year', 'last_30_days', 'last_7_days']) {
      expect(projectCatalogFiltersSchema.safeParse({ time_spent_range }).success).toBe(true)
    }
  })

  it('rejects unknown software kinds, oversized batches, and inverted ranges', () => {
    expect(projectCatalogFiltersSchema.safeParse({ kinds: ['website'] }).success).toBe(false)
    expect(projectCatalogFiltersSchema.safeParse({ limit: 11 }).success).toBe(false)
    expect(
      projectCatalogFiltersSchema.safeParse({ created_after: '2025-01-01', created_before: '2024-01-01' }).success,
    ).toBe(false)
    expect(projectCatalogFiltersSchema.safeParse({ min_stars: 8, max_stars: 2 }).success).toBe(false)
    expect(
      projectCatalogFiltersSchema.safeParse({ time_spent_range: 'last_7_days', time_spent_from: '2026-09-01' }).success,
    ).toBe(false)
  })
})
