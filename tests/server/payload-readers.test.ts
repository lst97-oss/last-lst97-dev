import { describe, expect, it } from 'bun:test'

import { createPayloadReaders } from '../../src/server/content/payload-readers'

describe('Payload content readers', () => {
  it('filters topic posts by published visibility and the selected topic', async () => {
    const calls: Record<string, unknown>[] = []
    const post = {
      id: 23,
      title: 'Topic post',
      slug: 'topic-post',
      excerpt: 'A post for a topic.',
      status: 'published',
      publishedAt: '2026-09-28T00:00:00.000Z',
      topics: [{ id: 7, title: 'Engineering', slug: 'engineering', description: '' }],
    }
    const payload = {
      find: async (args: Record<string, unknown>) => {
        calls.push(args)
        return { docs: [post], page: 1, totalPages: 1, totalDocs: 1 }
      },
      findGlobal: async () => ({}),
    }
    const readers = createPayloadReaders({
      getPayload: async () => payload,
      now: () => new Date('2026-09-29T00:00:00.000Z'),
    })

    const result = await readers.blogs.listPublishedByTopic(7, { page: 1, limit: 10 })

    expect(result.items).toMatchObject([{ slug: 'topic-post', topics: [{ slug: 'engineering' }] }])
    expect(calls[0]).toMatchObject({
      collection: 'posts',
      where: {
        and: [
          { status: { equals: 'published' } },
          { publishedAt: { less_than_equal: '2026-09-29T00:00:00.000Z' } },
          { topics: { contains: 7 } },
        ],
      },
    })
  })

  it('returns a selected homepage post only when it is already public', async () => {
    const selected = {
      id: 23,
      title: 'Featured',
      slug: 'featured',
      excerpt: 'Selected note.',
      status: 'published',
      publishedAt: '2026-09-28T00:00:00.000Z',
    }
    let selectedPost: Record<string, unknown> = selected
    const payload = {
      find: async () => ({ docs: [] }),
      findGlobal: async () => ({ featuredPost: selectedPost }),
    }
    const readers = createPayloadReaders({
      getPayload: async () => payload,
      now: () => new Date('2026-09-29T00:00:00.000Z'),
    })

    await expect(readers.home.getFeaturedPost()).resolves.toMatchObject({ slug: 'featured' })
    selectedPost = { ...selected, status: 'draft' }
    await expect(readers.home.getFeaturedPost()).resolves.toBeNull()
    selectedPost = { ...selected, publishedAt: '2099-01-01T00:00:00.000Z' }
    await expect(readers.home.getFeaturedPost()).resolves.toBeNull()
  })
})
