import { getServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { closeKnowledgeDatabase, getKnowledgeIndexRepository } from '../../src/server/knowledge/database'
import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import { isLocalEmbeddingUrl, resolveIndexEmbeddingConfig } from '../../src/server/knowledge/embedding-provider-config'
import { assertSafeGithubMarkdown } from '../../src/server/knowledge/github/content-safety'
import { createIndexKnowledgeSource } from '../../src/server/knowledge/index-source'
import { parseProjectDocument } from '../../src/server/knowledge/project-document'
import type { KnowledgeDocument, KnowledgeSource } from '../../src/server/knowledge/source-types'
import { logger } from '../../src/server/observability/logger'
import { startEmbeddingSidecar, stopEmbeddingSidecar } from '../dev/embedding-process'
import { projectRoot } from '../project-root'

const env = getServerEnv()

requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)

const documents: KnowledgeDocument[] = []
const identities = new Set<string>()
// One folder per project, each holding one document per topic. The parser
// derives the project from the folder, so the glob is intentionally two levels
// deep rather than a flat `src/data/projects/*.md`.
for await (const relativePath of new Bun.Glob('src/data/projects/*/*.md').scan(projectRoot)) {
  const path = `${projectRoot}/${relativePath}`
  const text = await Bun.file(path).text()
  // The corpus is hand-authored rather than cloned, but the same gate runs over
  // it: it ships inside the published Docker image and is served to the model as
  // evidence, so a stray credential or PEM block must fail the run, not reach it.
  assertSafeGithubMarkdown(text)
  const document = parseProjectDocument(relativePath, text)
  if (!document) throw new Error('A project document has invalid indexing metadata.')
  const identity = `${document.source.type}:${document.source.sourceId}`
  if (identities.has(identity)) throw new Error('Project document identities must be unique before indexing.')
  identities.add(identity)
  documents.push(document)
}

if (documents.length === 0) throw new Error('No project Markdown files were found.')

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
  const source: KnowledgeSource = { type: 'project-doc', fetch: async () => null }
  let indexedChunkCount = 0
  for (const document of documents) {
    const result = await createIndexKnowledgeSource({ source, embedding, repository, logger }).executeDocument(document)
    indexedChunkCount += result.chunkCount
  }

  let removedCount = 0
  for (const storedId of await repository.listSourceIds('project-doc')) {
    if (identities.has(`project-doc:${storedId}`)) continue
    await repository.removeSource('project-doc', storedId)
    removedCount += 1
  }

  logger.info('knowledge.project-doc.index.completed', {
    documentCount: documents.length,
    indexedChunkCount,
    removedCount,
  })
} catch (error) {
  logger.error('knowledge.project-doc.index.failed', {
    failureCategory: error instanceof Error ? error.name : 'unknown',
  })
  process.exitCode = 1
} finally {
  if (sidecar) await stopEmbeddingSidecar(sidecar)
  await closeKnowledgeDatabase()
}
