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
import type { BlogReader, ChangelogReader, ProjectReader } from './types'

type PayloadResult = {
  docs: PayloadDocument[]
  page?: number
  totalPages?: number
  totalDocs?: number
}

type PayloadCollection = 'posts' | 'projects' | 'changelogs'

interface PublishedQuery {
  limit: number
  page?: number
  sort?: string
  slug?: string
}

let payloadPromise: ReturnType<typeof getPayload> | undefined

async function getPayloadInstance() {
  payloadPromise ??= getPayload({ config: configPromise })
  return payloadPromise
}

function publishedWhere(): Where {
  return {
    and: [{ status: { equals: 'published' } }, { publishedAt: { less_than_equal: new Date().toISOString() } }],
  }
}

async function findPublishedDocuments(collection: PayloadCollection, query: PublishedQuery): Promise<PayloadResult> {
  const payload = await getPayloadInstance()
  const where: Where =
    query.slug !== undefined ? { and: [publishedWhere(), { slug: { equals: query.slug } }] } : publishedWhere()
  return (await payload.find({
    collection,
    where,
    limit: query.limit,
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
    depth: 1,
  })) as unknown as PayloadResult
}

export function createPayloadReaders(): { blogs: BlogReader; projects: ProjectReader; changelogs: ChangelogReader } {
  const blogs: BlogReader = {
    async listPublished(input) {
      const result = await findPublishedDocuments('posts', {
        limit: Math.min(Math.max(input.limit, 1), 50),
        page: Math.max(input.page, 1),
        sort: '-publishedAt',
      })

      return {
        items: result.docs.map(mapPostSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async getPublishedBySlug(slug) {
      const result = await findPublishedDocuments('posts', {
        limit: 1,
        slug,
      })
      const document = result.docs[0]
      return document ? mapPost(document) : null
    },
  }

  const projects: ProjectReader = {
    async listPublished() {
      const result = await findPublishedDocuments('projects', {
        limit: 50,
        sort: 'sortOrder',
      })
      return result.docs.map(mapProjectSummary)
    },
    async getPublishedBySlug(slug) {
      const result = await findPublishedDocuments('projects', {
        limit: 1,
        slug,
      })
      const document = result.docs[0]
      return document ? mapProject(document) : null
    },
  }

  const changelogs: ChangelogReader = {
    async listPublished(input) {
      const result = await findPublishedDocuments('changelogs', {
        limit: Math.min(Math.max(input.limit, 1), 50),
        page: Math.max(input.page, 1),
        sort: '-publishedAt',
      })

      return {
        items: result.docs.map(mapChangelogSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async getPublishedBySlug(slug) {
      const result = await findPublishedDocuments('changelogs', {
        limit: 1,
        slug,
      })
      const document = result.docs[0]
      return document ? mapChangelog(document) : null
    },
  }

  return { blogs, projects, changelogs }
}
