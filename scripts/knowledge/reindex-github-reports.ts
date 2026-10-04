import { getServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { closeKnowledgeDatabase, getKnowledgeIndexRepository } from '../../src/server/knowledge/database'
import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import { isLocalEmbeddingUrl, resolveIndexEmbeddingConfig } from '../../src/server/knowledge/embedding-provider-config'
import { assertSafeGithubMarkdown } from '../../src/server/knowledge/github/content-safety'
import { parseGithubReportDocument } from '../../src/server/knowledge/github/report-document'
import { createIndexKnowledgeSource } from '../../src/server/knowledge/index-source'
import type { KnowledgeDocument, KnowledgeSource } from '../../src/server/knowledge/source-types'
import type { KnowledgeSourceType } from '../../src/server/knowledge/types'
import { logger } from '../../src/server/observability/logger'
import { startEmbeddingSidecar, stopEmbeddingSidecar } from '../dev/embedding-process'
import { projectRoot } from '../project-root'

const env = getServerEnv()

requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)

const documents: KnowledgeDocument[] = []
const identities = new Set<string>()
for await (const relativePath of new Bun.Glob('src/data/github/**/*.md').scan(projectRoot)) {
  const path = `${projectRoot}/${relativePath}`
  const text = await Bun.file(path).text()
  assertSafeGithubMarkdown(text)
  const document = parseGithubReportDocument(relativePath, text)
  if (!document) throw new Error('A GitHub report has invalid indexing metadata.')
  const identity = `${document.source.type}:${document.source.sourceId}`
  if (identities.has(identity)) throw new Error('GitHub report identities must be unique before indexing.')
  identities.add(identity)
  documents.push(document)
}

if (documents.length === 0) throw new Error('No GitHub report Markdown files were found.')

let sidecar: Bun.Subprocess | undefined
try {
  if (isLocalEmbeddingUrl(env.KNOWLEDGE_EMBEDDING_URL)) {
    const health = await fetch(new URL('/health', env.KNOWLEDGE_EMBEDDING_URL), {
      signal: AbortSignal.timeout(1_000),
    }).catch(() => null)
    if (!health?.ok) sidecar = await startEmbeddingSidecar()
  }

  const repository = getKnowledgeIndexRepository()
  const embedding = createEmbeddingClient(resolveIndexEmbeddingConfig(env))
  const sources = new Map<KnowledgeSourceType, KnowledgeSource>()
  let indexedChunkCount = 0
  for (const document of documents) {
    const type = document.source.type
    let source = sources.get(type)
    if (!source) {
      source = { type, fetch: async () => null }
      sources.set(type, source)
    }
    const result = await createIndexKnowledgeSource({ source, embedding, repository, logger }).executeDocument(document)
    indexedChunkCount += result.chunkCount
  }

  logger.info('knowledge.github.reindex.completed', {
    reportCount: documents.length,
    indexedChunkCount,
    privateReportCount: documents.filter(({ isPublic }) => !isPublic).length,
    staleCleanup: false,
  })
} catch (error) {
  logger.error('knowledge.github.reindex.failed', {
    failureCategory: error instanceof Error ? error.name : 'unknown',
  })
  process.exitCode = 1
} finally {
  if (sidecar) await stopEmbeddingSidecar(sidecar)
  await closeKnowledgeDatabase()
}
