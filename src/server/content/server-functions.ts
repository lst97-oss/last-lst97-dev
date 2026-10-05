import { createServerFn } from '@tanstack/react-start'

import { contentReader } from './runtime'

import type { ContentFilters } from './types'

/**
 * Topic ids only. A list filter narrows by topic; free text was removed because
 * the only search surface the site exposes is the topic filter box.
 */
function cleanFilters(topicIds: (string | number)[] | undefined): ContentFilters | undefined {
  // Each id adds one `or` branch to the Payload query, so cap the fan-out.
  const ids = topicIds?.slice(0, 10)
  return ids?.length ? { topicIds: ids } : undefined
}

export const listPostsServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { page?: number; limit?: number; topicIds?: (string | number)[] }) => ({
    page: Math.max(input.page ?? 1, 1),
    limit: Math.min(Math.max(input.limit ?? 10, 1), 50),
    filters: cleanFilters(input.topicIds),
  }))
  .handler(({ data }) => contentReader.listPosts(data))

export const getPostServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { slug: string }) => input)
  .handler(({ data }) => contentReader.getPost(data.slug))

export const listPostsByTopicServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { topicId: string | number; page?: number; limit?: number }) => ({
    topicId: input.topicId,
    page: Math.max(input.page ?? 1, 1),
    limit: Math.min(Math.max(input.limit ?? 50, 1), 50),
  }))
  .handler(({ data }) => contentReader.listPostsByTopic(data.topicId, data))

export const listAllPostsByUpdatedServerFn = createServerFn({ method: 'GET', strict: false }).handler(() =>
  contentReader.listAllPostsByUpdated(),
)

export const listProjectsServerFn = createServerFn({ method: 'GET', strict: false }).handler(() =>
  contentReader.listProjects(),
)

export const listProjectsPageServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { page?: number; limit?: number; topicIds?: (string | number)[] }) => ({
    page: Math.max(input.page ?? 1, 1),
    limit: Math.min(Math.max(input.limit ?? 9, 1), 50),
    filters: cleanFilters(input.topicIds),
  }))
  .handler(({ data }) => contentReader.listProjectsPage(data))

export const getProjectServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { slug: string }) => input)
  .handler(({ data }) => contentReader.getProject(data.slug))

export const listChangelogsServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { page?: number; limit?: number }) => ({
    page: Math.max(input.page ?? 1, 1),
    limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
  }))
  .handler(({ data }) => contentReader.listChangelogs(data))

export const getChangelogServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { slug: string }) => input)
  .handler(({ data }) => contentReader.getChangelog(data.slug))

export const listTopicsServerFn = createServerFn({ method: 'GET', strict: false }).handler(() =>
  contentReader.listTopics(),
)

export const getTopicServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { slug: string }) => input)
  .handler(({ data }) => contentReader.getTopic(data.slug))

const relatedValidator = (input: { excludeSlug: string; topicIds?: (string | number)[]; limit?: number }) => ({
  excludeSlug: input.excludeSlug,
  topicIds: (input.topicIds ?? []).slice(0, 10),
  limit: Math.min(Math.max(input.limit ?? 3, 1), 12),
})

export const listRelatedProjectsServerFn = createServerFn({ method: 'GET', strict: false })
  .validator(relatedValidator)
  .handler(({ data }) => contentReader.listRelatedProjects(data))

export const listRelatedPostsServerFn = createServerFn({ method: 'GET', strict: false })
  .validator(relatedValidator)
  .handler(({ data }) => contentReader.listRelatedPosts(data))

export const getChangelogNeighboursServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { slug: string }) => input)
  .handler(({ data }) => contentReader.getChangelogNeighbours(data.slug))
