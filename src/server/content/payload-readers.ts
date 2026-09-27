import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import type {
  BlogReader,
  ChangelogReader,
  ProjectReader,
} from './types'
import {
  mapChangelog,
  mapChangelogSummary,
  mapPost,
  mapPostSummary,
  mapProject,
  mapProjectSummary,
  type PayloadDocument,
} from './payload-mappers'

type PayloadResult = {
  docs: PayloadDocument[]
  page?: number
  totalPages?: number
  totalDocs?: number
}

let payloadPromise: ReturnType<typeof getPayload> | undefined

async function getPayloadInstance() {
  payloadPromise ??= getPayload({ config: configPromise })
  return payloadPromise
}

function publishedWhere(): Where {
  return {
    and: [
      { status: { equals: 'published' } },
      { publishedAt: { less_than_equal: new Date().toISOString() } },
    ],
  }
}

export function createPayloadReaders(): { blogs: BlogReader; projects: ProjectReader; changelogs: ChangelogReader } {
  const blogs: BlogReader = {
    async listPublished(input) {
      const payload = await getPayloadInstance()
      const result = (await payload.find({
        collection: 'posts',
        where: publishedWhere(),
        limit: Math.min(Math.max(input.limit, 1), 50),
        page: Math.max(input.page, 1),
        sort: '-publishedAt',
        depth: 1,
      })) as unknown as PayloadResult

      return {
        items: result.docs.map(mapPostSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async getPublishedBySlug(slug) {
      const payload = await getPayloadInstance()
      const result = (await payload.find({
        collection: 'posts',
        where: {
          and: [publishedWhere(), { slug: { equals: slug } }],
        },
        limit: 1,
        depth: 1,
      })) as unknown as PayloadResult
      const document = result.docs[0]
      return document ? mapPost(document) : null
    },
  }

  const projects: ProjectReader = {
    async listPublished() {
      const payload = await getPayloadInstance()
      const result = (await payload.find({
        collection: 'projects',
        where: publishedWhere(),
        limit: 50,
        sort: 'sortOrder',
        depth: 1,
      })) as unknown as PayloadResult
      return result.docs.map(mapProjectSummary)
    },
    async getPublishedBySlug(slug) {
      const payload = await getPayloadInstance()
      const result = (await payload.find({
        collection: 'projects',
        where: {
          and: [publishedWhere(), { slug: { equals: slug } }],
        },
        limit: 1,
        depth: 1,
      })) as unknown as PayloadResult
      const document = result.docs[0]
      return document ? mapProject(document) : null
    },
  }

  const changelogs: ChangelogReader = {
    async listPublished(input) {
      const payload = await getPayloadInstance()
      const result = (await payload.find({
        collection: 'changelogs',
        where: publishedWhere(),
        limit: Math.min(Math.max(input.limit, 1), 50),
        page: Math.max(input.page, 1),
        sort: '-publishedAt',
        depth: 1,
      })) as unknown as PayloadResult

      return {
        items: result.docs.map(mapChangelogSummary),
        page: result.page ?? input.page,
        totalPages: result.totalPages ?? 1,
        totalDocs: result.totalDocs ?? result.docs.length,
      }
    },
    async getPublishedBySlug(slug) {
      const payload = await getPayloadInstance()
      const result = (await payload.find({
        collection: 'changelogs',
        where: {
          and: [publishedWhere(), { slug: { equals: slug } }],
        },
        limit: 1,
        depth: 1,
      })) as unknown as PayloadResult
      const document = result.docs[0]
      return document ? mapChangelog(document) : null
    },
  }

  return { blogs, projects, changelogs }
}
