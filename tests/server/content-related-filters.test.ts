import { describe, expect, it } from 'bun:test'

import { createPayloadReaders } from '../../src/server/content/payload-readers'
import { type PayloadDocument } from '../../src/server/content/payload-mappers'

type Doc = PayloadDocument & Record<string, unknown>

function doc(slug: string, extra: Record<string, unknown> = {}): Doc {
  return {
    slug,
    title: `Title ${slug}`,
    status: 'published',
    publishedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  } as Doc
}

const NOW = new Date('2026-10-01T00:00:00.000Z')

/**
 * A Payload stand-in that filters in memory using the same rules the real
 * `where` encodes: status/publishedAt always, plus slug, topic-any, and text.
 */
function fakePayload(docs: Doc[]) {
  const calls: { where: unknown; limit: number }[] = []
  return {
    calls,
    find: async ({ where, limit }: { where?: unknown; limit: number }) => {
      calls.push({ where, limit })
      const clauses = (where as { and?: Record<string, unknown>[] })?.and ?? []
      const matched = docs.filter((candidate) => clauses.every((clause) => matches(clause, candidate)))
      return { docs: matched.slice(0, limit), totalDocs: matched.length, page: 1, totalPages: 1 }
    },
  }
}

/** `%` wraps the term, so a LIKE match is a substring match, not an exact one. */
function likeMatches(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i').test(value)
}

function matches(clause: Record<string, unknown>, candidate: Doc): boolean {
  if ('or' in clause) return (clause.or as Record<string, unknown>[]).some((branch) => matches(branch, candidate))
  if ('and' in clause) return (clause.and as Record<string, unknown>[]).every((branch) => matches(branch, candidate))
  for (const [field, condition] of Object.entries(clause)) {
    if (!condition || typeof condition !== 'object') continue
    const operator = Object.keys(condition)[0]
    const operand = (condition as Record<string, unknown>)[operator]
    // Payload resolves a relationship through its own store, so the fake keeps
    // the ids on the document under a plain `topicIds` array.
    const key = field === 'topics' ? 'topicIds' : field
    const value = candidate[key]
    // A Payload array field is a list of `{ subfield: string }` rows, and `like`
    // on the field matches any row's text.
    if (Array.isArray(value) && operator === 'like') {
      const text = value.flatMap((row) => Object.values(row as Record<string, unknown>).map(String))
      if (!text.some((entry) => likeMatches(entry, String(operand)))) return false
      continue
    }
    switch (operator) {
      case 'equals':
        if (value !== operand) return false
        break
      case 'less_than_equal':
        if (String(value) > String(operand)) return false
        break
      case 'contains':
        if (!(value as number[]).includes(operand as number)) return false
        break
      case 'not_in':
        if ((operand as string[]).includes(value as string)) return false
        break
      case 'like':
        if (!likeMatches(String(value ?? ''), String(operand))) return false
        break
      default:
        throw new Error(`fakePayload does not implement the "${operator}" operator`)
    }
  }
  return true
}

const readers = (docs: Doc[]) =>
  createPayloadReaders({ getPayload: async () => fakePayload(docs) as never, now: () => NOW })

const project = (slug: string, extra: Record<string, unknown> = {}) =>
  doc(slug, { summary: `Summary ${slug}`, sortOrder: 0, featured: false, ...extra })

const post = (slug: string, extra: Record<string, unknown> = {}) => doc(slug, { excerpt: `Excerpt ${slug}`, ...extra })

describe('related projects', () => {
  const docs = [
    project('alpha', { topicIds: [1] }),
    project('beta', { topicIds: [1, 2] }),
    project('gamma', { topicIds: [2] }),
    project('delta', { topicIds: [] }),
    project('epsilon', { topicIds: [] }),
  ]

  it('returns other projects that share any topic, never the current one', async () => {
    const { projects } = readers(docs)

    const related = await projects.listRelated({ excludeSlug: 'alpha', topicIds: [1], limit: 3 })

    expect(related.map((item) => item.slug)).toEqual(['beta', 'gamma', 'delta'])
    expect(related.map((item) => item.slug)).not.toContain('alpha')
  })

  it('lists a project that shares two topics only once', async () => {
    const { projects } = readers(docs)

    const related = await projects.listRelated({ excludeSlug: 'delta', topicIds: [1, 2], limit: 4 })

    expect(related.map((item) => item.slug)).toEqual(['alpha', 'beta', 'gamma', 'epsilon'])
    expect(new Set(related.map((item) => item.slug)).size).toBe(related.length)
  })

  it('falls back to the most recent others when the document has no topics', async () => {
    const { projects } = readers(docs)

    const related = await projects.listRelated({ excludeSlug: 'alpha', topicIds: [], limit: 3 })

    expect(related).toHaveLength(3)
    expect(related.map((item) => item.slug)).not.toContain('alpha')
  })

  it('never exceeds the requested limit', async () => {
    const { projects } = readers(docs)

    expect(await projects.listRelated({ excludeSlug: 'alpha', topicIds: [1, 2], limit: 2 })).toHaveLength(2)
  })
})

describe('related notes', () => {
  const docs = [post('one'), post('two'), post('three')]

  it('returns the other notes when none carry topics', async () => {
    const { blogs } = readers(docs)

    const related = await blogs.listRelated({ excludeSlug: 'two', topicIds: [], limit: 3 })

    expect(related.map((note) => note.slug).sort()).toEqual(['one', 'three'])
  })
})

describe('listing filters', () => {
  it('narrows a project listing to one topic id', async () => {
    const scoped = [project('tagged', { topicIds: [7] }), project('untagged', { topicIds: [] })]

    const page = await readers(scoped).projects.listPublished({ page: 1, limit: 9, filters: { topicIds: [7] } })

    expect(page.items.map((item) => item.slug)).toEqual(['tagged'])
  })

  it('keeps documents sharing any of several topic ids', async () => {
    const scoped = [
      project('both', { topicIds: [7, 8] }),
      project('only-first', { topicIds: [7] }),
      project('only-second', { topicIds: [8] }),
      project('neither', { topicIds: [] }),
    ]

    const page = await readers(scoped).projects.listPublished({ page: 1, limit: 9, filters: { topicIds: [7, 8] } })

    expect(page.items.map((item) => item.slug).sort()).toEqual(['both', 'only-first', 'only-second'])
  })

  it('narrows a note listing to one topic id', async () => {
    const scoped = [post('tagged', { topicIds: [3] }), post('untagged', { topicIds: [] })]

    const page = await readers(scoped).blogs.listPublished({ page: 1, limit: 9, filters: { topicIds: [3] } })

    expect(page.items.map((note) => note.slug)).toEqual(['tagged'])
  })
})

describe('changelog neighbours', () => {
  // Newest first, the order the listing reads in.
  const docs: Doc[] = [
    doc('newest', { version: 'v3' }),
    doc('middle', { version: 'v2' }),
    doc('oldest', { version: 'v1' }),
  ]

  it('returns the release either side of the current one', async () => {
    const { changelogs } = readers(docs)

    const neighbours = await changelogs.getNeighbours({ slug: 'middle' })

    expect(neighbours.next?.slug).toBe('newest')
    expect(neighbours.previous?.slug).toBe('oldest')
  })

  it('has no newer neighbour on the newest release', async () => {
    const { changelogs } = readers(docs)

    const neighbours = await changelogs.getNeighbours({ slug: 'newest' })

    expect(neighbours.next).toBeNull()
    expect(neighbours.previous?.slug).toBe('middle')
  })

  it('has no older neighbour on the oldest release', async () => {
    const { changelogs } = readers(docs)

    const neighbours = await changelogs.getNeighbours({ slug: 'oldest' })

    expect(neighbours.previous).toBeNull()
    expect(neighbours.next?.slug).toBe('middle')
  })

  it('returns neither when the entry is no longer published', async () => {
    const { changelogs } = readers(docs)

    expect(await changelogs.getNeighbours({ slug: 'gone' })).toEqual({ previous: null, next: null })
  })
})
