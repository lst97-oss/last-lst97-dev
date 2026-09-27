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
            tags: ['focus'],
            coverImage: { url: null, alt: null },
          },
        ],
        page: 1,
        totalPages: 1,
        totalDocs: 1,
      }),
      getPublishedBySlug: async () => null,
    }
    const projects: ProjectReader = {
      listPublished: async () => [],
      getPublishedBySlug: async () => null,
    }
    const changelogs: ChangelogReader = {
      listPublished: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
      getPublishedBySlug: async () => null,
    }

    const reader = createContentReader({ blogs, projects, changelogs })

    await expect(reader.listPosts({ page: 1, limit: 10 })).resolves.toMatchObject({
      items: [{ slug: 'deep-work' }],
    })
    await expect(reader.getProject('missing')).resolves.toBeNull()
  })
})
