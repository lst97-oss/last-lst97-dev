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
import type { BlogReader, ChangelogReader, HomeReader, ProjectReader, TopicReader } from './types'

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
  findGlobal(args: { slug: string; depth?: number; overrideAccess?: boolean }): Promise<PayloadDocument>
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

function isPublicPost(value: unknown, now: Date): value is PayloadDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const post = value as PayloadDocument
  if (post.status !== 'published' || typeof post.publishedAt !== 'string') return false
  const publishedAt = Date.parse(post.publishedAt)
  return Number.isFinite(publishedAt) && publishedAt <= now.getTime()
}

export function createPayloadReaders(dependencies: PayloadReaderDependencies = {}): {
  blogs: BlogReader
  projects: ProjectReader
  changelogs: ChangelogReader
  topics: TopicReader
  home: HomeReader
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

  const home: HomeReader = {
    async getFeaturedPost() {
      const payload = (await getPayload()) as PayloadReaderClient
      const homePage = await payload.findGlobal({ slug: 'home-page', depth: 1, overrideAccess: true })
      if (!isPublicPost(homePage.featuredPost, now())) return null
      return mapPostSummary(homePage.featuredPost)
    },
  }

  return { blogs, projects, changelogs, topics, home }
}
