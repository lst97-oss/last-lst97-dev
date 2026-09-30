import { describe, expect, test } from 'bun:test'
import { Changelogs } from '../src/collections/Changelogs'
import { Posts } from '../src/collections/Posts'
import { Projects } from '../src/collections/Projects'
import { ensurePublicationDate, resolvePublicationDate } from '../src/collections/hooks/publication-date'

const NOW = new Date('2026-09-30T06:00:00.000Z')

function hookArgs(data: Record<string, unknown>, originalDoc: Record<string, unknown> = {}) {
  return { data, originalDoc } as unknown as Parameters<typeof ensurePublicationDate>[0]
}

describe('publication date', () => {
  test('stamps the date when a document is published with no publish date', () => {
    expect(resolvePublicationDate({ status: 'published', now: () => NOW })).toBe(NOW.toISOString())
  })

  test('clears the date when a document returns to draft', () => {
    expect(
      resolvePublicationDate({
        status: 'draft',
        providedPublishedAt: '2026-01-01T00:00:00.000Z',
        existingPublishedAt: '2026-01-01T00:00:00.000Z',
        now: () => NOW,
      }),
    ).toBeNull()
  })

  test('preserves a future publish date so scheduled documents stay hidden', () => {
    const scheduled = '2026-12-25T00:00:00.000Z'
    expect(resolvePublicationDate({ status: 'published', providedPublishedAt: scheduled, now: () => NOW })).toBe(
      scheduled,
    )
  })

  test('keeps the original publish date on a later edit instead of restamping it', () => {
    expect(
      resolvePublicationDate({
        status: 'published',
        existingPublishedAt: '2026-02-02T00:00:00.000Z',
        now: () => NOW,
      }),
    ).toBe('2026-02-02T00:00:00.000Z')
  })

  test('treats a blank publishedAt as missing rather than scheduling at the epoch', () => {
    expect(resolvePublicationDate({ status: 'published', providedPublishedAt: '   ', now: () => NOW })).toBe(
      NOW.toISOString(),
    )
  })

  test('the hook writes the field so the public publishedAt filter can match', () => {
    const before = Date.now()
    const stamped = ensurePublicationDate(hookArgs({ status: 'published' }))?.publishedAt
    expect(typeof stamped).toBe('string')
    expect(Date.parse(String(stamped))).toBeGreaterThanOrEqual(before)
    expect(Date.parse(String(stamped))).toBeLessThanOrEqual(Date.now())
    expect(
      ensurePublicationDate(hookArgs({ status: 'published' }, { publishedAt: '2026-03-03T00:00:00.000Z' }))?.publishedAt,
    ).toBe('2026-03-03T00:00:00.000Z')
    expect(ensurePublicationDate(hookArgs({ status: 'draft' }))?.publishedAt).toBeNull()
  })

  test('every editorial collection runs the hook', () => {
    for (const collection of [Posts, Projects, Changelogs]) {
      expect(collection.hooks?.beforeChange).toContain(ensurePublicationDate)
    }
  })
})
