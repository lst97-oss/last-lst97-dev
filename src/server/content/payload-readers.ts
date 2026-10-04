import configPromise from '@payload-config'
import type { Where } from 'payload'
import { getPayload } from 'payload'
import {
  mapChangelog,
  mapChangelogSummary,
  mapPost,
  mapPostSummary,
  mapProject,
  mapProjectSummary,
  type PayloadDocument,
} from './payload-mappers'
import type { BlogReader, ChangelogReader, ProjectReader, TopicReader } from './types'

type PayloadResult = {
  docs: PayloadDocument[]
  page?: number
  totalPages?: number
  totalDocs?: number
}

type PayloadCollection = 'posts' | 'projects' | 'changelogs' | 'topics'

interface PublishedQuery {
  limit: number
  page?: number
  sort?: string
  slug?: string
  topicId?: string | number
  /** Share ANY of these topics. `topicId` above is AND-joined and needs all of them. */
  topicIds?: (string | number)[]
  /** Exclude these slugs, so a related lookup can never return the current document. */
  excludeSlugs?: string[]
}

interface PayloadReaderClient {
  find(args: {
    collection: PayloadCollection
    where?: Where
    limit: number
    page?: number
    sort?: string
    depth?: number
  }): Promise<PayloadResult>
}

interface PayloadReaderDependencies {
  getPayload?: () => Promise<unknown>
  now?: () => Date
}

let payloadPromise: ReturnType<typeof getPayload> | undefined

async function getPayloadInstance() {
  payloadPromise ??= getPayload({ config: configPromise })
  return payloadPromise
}

async function findPublishedDocuments(
  payload: PayloadReaderClient,
  collection: PayloadCollection,
  query: PublishedQuery,
  now: Date,
): Promise<PayloadResult> {
  const filters: Where[] = [
    { status: { equals: 'published' } },
    { publishedAt: { less_than_equal: now.toISOString() } },
  ]
  if (query.slug !== undefined) filters.push({ slug: { equals: query.slug } })
  if (query.topicId !== undefined) filters.push({ topics: { contains: query.topicId } })
  // One `or` branch per topic: AND-ing them would demand a document carry every
  // topic, which is not what "related" or "filter by any of these" means.
  if (query.topicIds?.length) {
    filters.push({ or: query.topicIds.map((topicId) => ({ topics: { contains: topicId } })) })
  }
  if (query.excludeSlugs?.length) filters.push({ slug: { not_in: query.excludeSlugs } })
  const where: Where = { and: filters }
  return (await payload.find({
    collection,
    where,
    limit: query.limit,
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
    depth: 1,
  })) as unknown as PayloadResult
}

function mapTopic(document: PayloadDocument) {
  const id = document.id
  if (typeof id !== 'string' && typeof id !== 'number') return null
  return {
    id,
    title:
      typeof document.title === 'string'
        ? document.title
        : typeof document.slug === 'string'
          ? document.slug
          : 'Untitled topic',
    slug: typeof document.slug === 'string' ? document.slug : '',
    description: typeof document.description === 'string' ? document.description : '',
  }
}

export function createPayloadReaders(dependencies: PayloadReaderDependencies = {}): {
  blogs: BlogReader
  projects: ProjectReader
  changelogs: ChangelogReader
  topics: TopicReader
} {
  const getPayload = dependencies.getPayload ?? getPayloadInstance
  const now = dependencies.now ?? (() => new Date())
  const blogs: BlogReader = {
    async listPublished(input) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'posts',
        {
          limit: Math.min(Math.max(input.limit, 1), 50),
          page: Math.max(input.page, 1),
          sort: '-publishedAt',
          topicIds: input.filters?.topicIds,
        },
        now(),
      )

      return {
        items: result.docs.map(mapPostSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async listPublishedByTopic(topicId, input) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'posts',
        {
          limit: Math.min(Math.max(input.limit, 1), 50),
          page: Math.max(input.page, 1),
          sort: '-publishedAt',
          topicId,
        },
        now(),
      )

      return {
        items: result.docs.map(mapPostSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async listAllByUpdated() {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'posts',
        {
          limit: 50,
          // `listPublished` sorts by publication, but an editor re-saving an old
          // note is exactly what the home window should surface.
          sort: '-updatedAt',
        },
        now(),
      )
      return result.docs.map(mapPostSummary)
    },
    async listRelated(input) {
      const client = (await getPayload()) as PayloadReaderClient
      const excluded = [input.excludeSlug]
      const sort = '-publishedAt'
      // Topic matches first. The current document is excluded in BOTH reads, so
      // it cannot reappear through the recency top-up.
      const related = input.topicIds.length
        ? (
            await findPublishedDocuments(
              client,
              'posts',
              { limit: input.limit + 1, sort, topicIds: input.topicIds, excludeSlugs: excluded },
              now(),
            )
          ).docs.map(mapPostSummary)
        : []
      if (related.length >= input.limit) return related.slice(0, input.limit)

      const recent = (
        await findPublishedDocuments(client, 'posts', { limit: input.limit + 1, sort, excludeSlugs: excluded }, now())
      ).docs.map(mapPostSummary)
      const seen = new Set(related.map((post) => post.slug))
      for (const post of recent) {
        if (seen.has(post.slug)) continue
        related.push(post)
        if (related.length >= input.limit) break
      }
      return related.slice(0, input.limit)
    },
    async getPublishedBySlug(slug) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'posts',
        {
          limit: 1,
          slug,
        },
        now(),
      )
      const document = result.docs[0]
      return document ? mapPost(document) : null
    },
  }

  const projects: ProjectReader = {
    async listPublished(input) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'projects',
        {
          limit: Math.min(Math.max(input.limit, 1), 50),
          page: Math.max(input.page, 1),
          sort: 'sortOrder',
          topicIds: input.filters?.topicIds,
        },
        now(),
      )

      return {
        items: result.docs.map(mapProjectSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },

    async listRelated(input) {
      const client = (await getPayload()) as PayloadReaderClient
      const excluded = [input.excludeSlug]
      const sort = 'sortOrder'
      // Topic matches first. The current document is excluded in BOTH reads, so
      // it cannot reappear through the recency top-up.
      const related = input.topicIds.length
        ? (
            await findPublishedDocuments(
              client,
              'projects',
              { limit: input.limit + 1, sort, topicIds: input.topicIds, excludeSlugs: excluded },
              now(),
            )
          ).docs.map(mapProjectSummary)
        : []
      if (related.length >= input.limit) return related.slice(0, input.limit)

      const recent = (
        await findPublishedDocuments(
          client,
          'projects',
          { limit: input.limit + 1, sort, excludeSlugs: excluded },
          now(),
        )
      ).docs.map(mapProjectSummary)
      const seen = new Set(related.map((project) => project.slug))
      for (const project of recent) {
        if (seen.has(project.slug)) continue
        related.push(project)
        if (related.length >= input.limit) break
      }
      return related.slice(0, input.limit)
    },

    async listAll() {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'projects',
        {
          limit: 50,
          sort: 'sortOrder',
        },
        now(),
      )
      return result.docs.map(mapProjectSummary)
    },
    async getPublishedBySlug(slug) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'projects',
        {
          limit: 1,
          slug,
        },
        now(),
      )
      const document = result.docs[0]
      return document ? mapProject(document) : null
    },
  }

  const changelogs: ChangelogReader = {
    async listPublished(input) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'changelogs',
        {
          limit: Math.min(Math.max(input.limit, 1), 50),
          page: Math.max(input.page, 1),
          sort: '-publishedAt',
        },
        now(),
      )

      return {
        items: result.docs.map(mapChangelogSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async getNeighbours({ slug }) {
      const entries = (
        await findPublishedDocuments(
          (await getPayload()) as PayloadReaderClient,
          'changelogs',
          { limit: 50, sort: '-publishedAt' },
          now(),
        )
      ).docs.map(mapChangelogSummary)
      const index = entries.findIndex((entry) => entry.slug === slug)
      // Unpublished between the two reads: there is no ordering to stand on.
      if (index < 0) return { previous: null, next: null }
      // The archive reads newest-first, so the newer neighbour is at index - 1
      // and `previous` is the older one.
      return { previous: entries[index + 1] ?? null, next: entries[index - 1] ?? null }
    },
    async getPublishedBySlug(slug) {
      const result = await findPublishedDocuments(
        (await getPayload()) as PayloadReaderClient,
        'changelogs',
        {
          limit: 1,
          slug,
        },
        now(),
      )
      const document = result.docs[0]
      return document ? mapChangelog(document) : null
    },
  }

  const topics: TopicReader = {
    async listPublished() {
      const payload = (await getPayload()) as PayloadReaderClient
      const result = await payload.find({ collection: 'topics', limit: 100, sort: 'title', depth: 0 })
      return result.docs.flatMap((document) => {
        const topic = mapTopic(document)
        return topic ? [topic] : []
      })
    },
    async getPublishedBySlug(slug) {
      const payload = (await getPayload()) as PayloadReaderClient
      const result = await payload.find({
        collection: 'topics',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
      })
      return result.docs[0] ? mapTopic(result.docs[0]) : null
    },
  }

  return { blogs, projects, changelogs, topics }
}
