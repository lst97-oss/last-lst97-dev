import { createServerFn } from '@tanstack/react-start'

import { contentReader } from './runtime'

export const listPostsServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { page?: number; limit?: number }) => ({
    page: Math.max(input.page ?? 1, 1),
    limit: Math.min(Math.max(input.limit ?? 10, 1), 50),
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

export const listProjectsServerFn = createServerFn({ method: 'GET', strict: false }).handler(() =>
  contentReader.listProjects(),
)

export const listProjectsPageServerFn = createServerFn({ method: 'GET', strict: false })
  .validator((input: { page?: number; limit?: number }) => ({
    page: Math.max(input.page ?? 1, 1),
    limit: Math.min(Math.max(input.limit ?? 9, 1), 50),
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

export const getFeaturedPostServerFn = createServerFn({ method: 'GET', strict: false }).handler(() =>
  contentReader.getFeaturedPost(),
)
