import { describe, expect, it } from 'bun:test'

import { createContentReader } from '../../src/server/content/service'
import type { BlogReader, ChangelogReader, ProjectReader } from '../../src/server/content/types'

describe('createContentReader', () => {
  it('keeps the public content interface independent from Payload', async () => {
    const blogs: BlogReader = {
      listPublished: async () => ({
        items: [
          {
            slug: 'deep-work',
            title: 'Deep Work',
            excerpt: 'A short note.',
            publishedAt: '2026-09-21T00:00:00.000Z',
            updatedAt: '2026-09-22T00:00:00.000Z',
            createdAt: '2026-09-20T00:00:00.000Z',
            tags: ['focus'],
            coverImage: { url: null, alt: null },
          },
        ],
        page: 1,
        totalPages: 1,
        totalDocs: 1,
      }),
      listPublishedByTopic: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
      getPublishedBySlug: async () => null,
    }
    const projects: ProjectReader = {
      listPublished: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
      listAll: async () => [],
      getPublishedBySlug: async () => null,
    }
    const changelogs: ChangelogReader = {
      listPublished: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
      getPublishedBySlug: async () => null,
    }

    const reader = createContentReader({
      blogs,
      projects,
      changelogs,
      topics: { listPublished: async () => [], getPublishedBySlug: async () => null },
      home: { getFeaturedPost: async () => null },
    })

    await expect(reader.listPosts({ page: 1, limit: 10 })).resolves.toMatchObject({
      items: [{ slug: 'deep-work' }],
    })
    await expect(reader.getProject('missing')).resolves.toBeNull()
  })

  it('exposes published topics, topic posts, and the selected homepage post', async () => {
    const topic = { id: 7, slug: 'engineering', title: 'Engineering', description: 'Building software.' }
    const post = {
      slug: 'shipping-small-tools',
      title: 'Shipping small tools',
      excerpt: 'A small note.',
      publishedAt: '2026-09-28T00:00:00.000Z',
      updatedAt: '2026-09-29T00:00:00.000Z',
      createdAt: '2026-09-27T00:00:00.000Z',
      tags: [],
      topics: [topic],
      coverImage: { url: null, alt: null },
    }
    const reader = createContentReader({
      blogs: {
        listPublished: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        listPublishedByTopic: async () => ({ items: [post], page: 1, totalPages: 1, totalDocs: 1 }),
        getPublishedBySlug: async () => null,
      },
      projects: { listPublished: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }), listAll: async () => [], getPublishedBySlug: async () => null },
      changelogs: { listPublished: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }), getPublishedBySlug: async () => null },
      topics: {
        listPublished: async () => [topic],
        getPublishedBySlug: async () => topic,
      },
      home: { getFeaturedPost: async () => post },
    })

    await expect(reader.listTopics()).resolves.toEqual([topic])
    await expect(reader.getTopic('engineering')).resolves.toEqual(topic)
    await expect(reader.listPostsByTopic(topic.id, { page: 1, limit: 10 })).resolves.toMatchObject({ items: [post] })
    await expect(reader.getFeaturedPost()).resolves.toEqual(post)
  })
})
