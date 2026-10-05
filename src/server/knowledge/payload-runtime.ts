import type { Payload } from 'payload'

import { getServerEnv } from '../env'
import { logger } from '../observability/logger'
import { getKnowledgeIndexRepository } from './database'
import { createEmbeddingClient } from './embedding-client'
import { resolveIndexEmbeddingConfig } from './embedding-provider-config'
import { createIndexKnowledgeSource } from './index-source'
import type { KnowledgeListSource } from './jobs'
import { createKnowledgeSourceSynchronizer } from './jobs'
import type { PayloadKnowledgeRecord } from './payload-source'
import { createPayloadKnowledgeSource } from './payload-source'
import type { KnowledgeDocument, KnowledgeSource } from './source-types'
import type { KnowledgeSourceType } from './types'
import { createWakaTimeKnowledgeSource } from './wakatime-source'

const WAKATIME_SHARE_URL = 'https://wakatime.com/share/@lst97/93993eb7-ae0d-41d1-b44d-6bcf2f02ceb0.json'

function publicSiteUrl(): string {
  const env = getServerEnv()
  return (env.PUBLIC_SITE_URL ?? env.PAYLOAD_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}

function createPayloadContentSource(payload: Payload, type: 'post' | 'project') {
  const collection = type === 'post' ? 'posts' : 'projects'
  return createPayloadKnowledgeSource({
    type,
    publicSiteUrl: publicSiteUrl(),
    findById: async (sourceId) => {
      const result = await payload.find({
        collection,
        where: { id: { equals: sourceId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      return (result.docs[0] as unknown as PayloadKnowledgeRecord | undefined) ?? null
    },
    findAll: async () => {
      const result = await payload.find({
        collection,
        where: { status: { equals: 'published' } },
        limit: 1_000,
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      return result.docs as unknown as PayloadKnowledgeRecord[]
    },
  })
}

function createKnowledgeDependencies(source: KnowledgeSource) {
  const env = getServerEnv()
  const repository = getKnowledgeIndexRepository()
  const embedding = createEmbeddingClient(resolveIndexEmbeddingConfig(env))
  return { indexer: createIndexKnowledgeSource({ source, embedding, repository, logger }) }
}

export async function runPayloadKnowledgeIndexTask(
  payload: Payload,
  input: { sourceType: 'post' | 'project'; sourceId: string },
): Promise<{ status: string; chunkCount: number }> {
  const source = createPayloadContentSource(payload, input.sourceType)
  const { indexer } = createKnowledgeDependencies(source)
  return indexer.execute(input.sourceId)
}

export function createPayloadKnowledgeSourceList(sources: {
  post: KnowledgeSource & KnowledgeListSource
  project: KnowledgeSource & KnowledgeListSource
  wakatime: KnowledgeSource & KnowledgeListSource
  profile?: KnowledgeSource & KnowledgeListSource
}): Array<KnowledgeSource & KnowledgeListSource> {
  // Repository summaries are indexed by sync-github-knowledge from inspected clones.
  // The lightweight GitHub API source shares the same IDs and would overwrite them.
  // `profile` is omitted by the sync: its curated biography is merged into the
  // github-profile/lst97-profile document, so a separate profile record would
  // store the same text twice under different source identities.
  return sources.profile
    ? [sources.post, sources.project, sources.profile, sources.wakatime]
    : [sources.post, sources.project, sources.wakatime]
}

export async function runPayloadKnowledgeSyncTask(
  payload: Payload,
): Promise<{ indexedCount: number; removedCount: number }> {
  const postSource = createPayloadContentSource(payload, 'post')
  const projectSource = createPayloadContentSource(payload, 'project')
  const wakaTimeSource = createWakaTimeKnowledgeSource({ endpoint: WAKATIME_SHARE_URL })
  const sources = createPayloadKnowledgeSourceList({
    post: postSource,
    project: projectSource,
    wakatime: wakaTimeSource,
  })
  const env = getServerEnv()
  const repository = getKnowledgeIndexRepository()
  const embedding = createEmbeddingClient(resolveIndexEmbeddingConfig(env))
  const indexers = new Map<KnowledgeSourceType, ReturnType<typeof createIndexKnowledgeSource>>()
  for (const source of sources) {
    indexers.set(source.type, createIndexKnowledgeSource({ source, embedding, repository, logger }))
  }

  const sourceLister = sources.map((source) => ({
    type: source.type,
    listDocuments: () =>
      'listDocuments' in source ? source.listDocuments() : Promise.resolve([] as KnowledgeDocument[]),
  }))
  const synchronizer = createKnowledgeSourceSynchronizer({
    sources: sourceLister,
    repository,
    indexer: {
      executeDocument: async (document) => {
        const indexer = indexers.get(document.source.type)
        if (!indexer) throw new Error('Knowledge source type is not configured')
        return indexer.executeDocument(document)
      },
    },
    logger,
  })
  return synchronizer.execute()
}
