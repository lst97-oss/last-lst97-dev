import { getServerEnv } from '../src/server/env'
import { requireIntegrationEnv } from '../src/server/env-schema'
import { createIndexKnowledgeSource } from '../src/server/knowledge/index-source'
import { createEmbeddingClient } from '../src/server/knowledge/embedding-client'
import { getKnowledgeIndexRepository, closeKnowledgeDatabase } from '../src/server/knowledge/database'
import {
  githubProfileSchema,
  normalizeGithubRepositoryCliRecord,
  renderPersonalGithubProfileMarkdown,
} from '../src/server/knowledge/github-markdown'
import {
  GithubCommandOutputTooLargeError,
  inspectGithubRepository,
  type GithubCommandRunner,
} from '../src/server/knowledge/github-repository-inspector'
import { analyzeGithubRepository } from '../src/server/knowledge/github-repository-analysis'
import { renderGithubRepositorySummary } from '../src/server/knowledge/github-summary-markdown'
import { getCuratedProjectClassification } from '../src/server/knowledge/project-curation'
import { syncGithubRepositoryReports, type GithubSyncRepository } from '../src/server/knowledge/github-knowledge-sync'
import { assertSafeGithubMarkdown, sanitizeEvidenceText } from '../src/server/knowledge/github-content-safety'
import { createProfileKnowledgeSource } from '../src/server/knowledge/profile-source'
import { createWakaTimeKnowledgeSource } from '../src/server/knowledge/wakatime-source'
import { createGithubContributionsGateway, discoverGithubContributions } from '../src/server/knowledge/github-contributions'
import { removeSupersededGithubReports } from '../src/server/knowledge/github-legacy-reports'
import { renderGithubProfileMarkdown } from '../src/server/knowledge/github-profile-markdown'
import { syncGithubProfileDocument } from '../src/server/knowledge/github-profile-sync'
import { logger } from '../src/server/observability/logger'
import type { KnowledgeDocument, KnowledgeSource } from '../src/server/knowledge/source-types'
import type { KnowledgeSourceType } from '../src/server/knowledge/types'
import { startEmbeddingSidecar, stopEmbeddingSidecar } from './embedding-process'

const OWNER = 'lst97'
const WAKATIME_SHARE_URL = 'https://wakatime.com/share/@lst97/93993eb7-ae0d-41d1-b44d-6bcf2f02ceb0.json'
const projectRoot = import.meta.dir.replace(/[/\\]scripts$/, '')
const githubDataRoot = `${projectRoot}/src/data/github`
const env = getServerEnv()

async function runGh(args: string[], maxOutputChars = 8_000_000): Promise<string> {
  let child: Bun.Subprocess
  try {
    child = Bun.spawn(['gh', ...args], {
      cwd: projectRoot,
      stdout: 'pipe',
      stderr: 'ignore',
    })
  } catch {
    throw new Error('GitHub CLI could not be started')
  }
  if (!(child.stdout instanceof ReadableStream)) throw new Error('GitHub CLI output stream was unavailable')
  const output = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0 || output.length > maxOutputChars) {
    throw new Error('GitHub CLI request failed')
  }
  return output
}

async function ensureLocalEmbeddingServer(): Promise<Bun.Subprocess | undefined> {
  const embeddingUrl = new URL(env.KNOWLEDGE_EMBEDDING_URL)
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1'])
  if (!localHosts.has(embeddingUrl.hostname)) return undefined

  const healthUrl = new URL('/health', embeddingUrl)
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1_000) })
    if (response.ok) return undefined
  } catch {
    // The local launcher below owns startup and cleanup when the service is not already running.
  }
  return startEmbeddingSidecar()
}

async function writeMarkdown(path: string, text: string): Promise<void> {
  const result = await Bun.write(path, text)
  if (result !== new TextEncoder().encode(text).byteLength) {
    throw new Error('A GitHub Markdown file could not be written completely')
  }
}

async function writeMarkdownAtomically(path: string, text: string): Promise<void> {
  const separator = path.lastIndexOf('/')
  const directory = path.slice(0, separator)
  const mkdir = Bun.spawn(['mkdir', '-p', directory], { stdout: 'ignore', stderr: 'ignore' })
  if (await mkdir.exited !== 0) throw new Error('Could not create GitHub knowledge directory')
  const temporaryPath = `${path}.tmp-${crypto.randomUUID()}`
  try {
    await writeMarkdown(temporaryPath, text)
    const move = Bun.spawn(['mv', '-f', temporaryPath, path], { stdout: 'ignore', stderr: 'ignore' })
    if (await move.exited !== 0) throw new Error('Could not replace GitHub knowledge report')
  } catch {
    const cleanup = Bun.spawn(['rm', '-f', temporaryPath], { stdout: 'ignore', stderr: 'ignore' })
    await cleanup.exited
    throw new Error('Could not write GitHub knowledge report')
  }
}

async function sanitizeExistingGithubMarkdown(): Promise<number> {
  let sanitizedCount = 0
  const markdownFiles = new Bun.Glob('src/data/github/**/*.md')
  for await (const path of markdownFiles.scan(projectRoot)) {
    const existing = await Bun.file(`${projectRoot}/${path}`).text()
    const sanitized = sanitizeEvidenceText(existing)
    assertSafeGithubMarkdown(sanitized.text)
    if (`${sanitized.text}\n` !== existing) {
      await writeMarkdownAtomically(`${projectRoot}/${path}`, `${sanitized.text}\n`)
      sanitizedCount += 1
    }
  }
  return sanitizedCount
}

async function reportFileExists(repository: GithubSyncRepository): Promise<boolean> {
  const contributionPrefix = repository.sourceKind === 'contribution' ? '/contributions' : ''
  const visibility = repository.isPrivate ? 'private' : 'public'
  const filename = repository.sourceKind === 'contribution'
    ? repository.fullName.replace('/', '__')
    : repository.name
  const file = Bun.file(`${githubDataRoot}${contributionPrefix}/${visibility}/${filename}.md`)
  return file.exists()
}

async function indexDocuments(documents: KnowledgeDocument[]): Promise<void> {
  const repository = getKnowledgeIndexRepository()
  const embedding = createEmbeddingClient({
    baseUrl: env.KNOWLEDGE_EMBEDDING_URL,
    model: env.KNOWLEDGE_EMBEDDING_MODEL,
    apiKey: env.KNOWLEDGE_EMBEDDING_API_KEY,
    timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
  })
  const sources = new Map<KnowledgeSourceType, KnowledgeSource>()
  const indexedIds = new Map<KnowledgeSourceType, Set<string>>()

  for (const document of documents) {
    const sourceType = document.source.type
    let source = sources.get(sourceType)
    if (!source) {
      source = { type: sourceType, fetch: async () => null }
      sources.set(sourceType, source)
      indexedIds.set(sourceType, new Set())
    }
    const indexer = createIndexKnowledgeSource({ source, embedding, repository, logger })
    await indexer.executeDocument(document)
    indexedIds.get(sourceType)!.add(document.source.sourceId)
  }

  for (const [sourceType, presentIds] of indexedIds) {
    const storedIds = await repository.listSourceIds(sourceType)
    for (const sourceId of storedIds) {
      if (!presentIds.has(sourceId)) await repository.removeSource(sourceType, sourceId)
    }
  }
}

async function collectDocuments(): Promise<{
  documents: KnowledgeDocument[]
  repositories: GithubSyncRepository[]
  inventoryComplete: boolean
  privateCount: number
  publicCount: number
  contributionCount: number
}> {
  const repoOutput = await runGh([
    'repo', 'list', OWNER,
    '--limit', '1000',
    '--json', 'nameWithOwner,name,description,url,isPrivate,isFork,isArchived,createdAt,updatedAt,primaryLanguage,languages,repositoryTopics,homepageUrl,defaultBranchRef,licenseInfo,stargazerCount,forkCount,visibility',
  ])
  let rawRepositories: unknown
  try {
    rawRepositories = JSON.parse(repoOutput)
  } catch {
    throw new Error('GitHub CLI returned invalid repository data')
  }
  if (!Array.isArray(rawRepositories) || rawRepositories.length > 1_000) {
    throw new Error('GitHub repository inventory is invalid')
  }

  const parsedResults = rawRepositories.map((item) => {
    try {
      return { success: true as const, data: normalizeGithubRepositoryCliRecord(item) }
    } catch {
      return { success: false as const }
    }
  })
  if (parsedResults.some((result) => !result.success)) {
    throw new Error('GitHub repository inventory contained invalid entries')
  }
  const repositories = parsedResults.flatMap((result) => result.success ? [result.data] : [])
  const contributionGateway = createGithubContributionsGateway({
    async query(document) {
      const output = await runGh(['api', 'graphql', '-f', `query=${document}`], 8_000_000)
      try {
        return JSON.parse(output) as unknown
      } catch {
        throw new Error('GitHub contribution response was invalid')
      }
    },
  })
  const contributions = await discoverGithubContributions(contributionGateway)
  const profileOutput = await runGh(['api', `users/${OWNER}`], 100_000)
  let rawProfile: unknown
  try {
    rawProfile = JSON.parse(profileOutput)
  } catch {
    throw new Error('GitHub CLI returned invalid profile data')
  }
  const profile = githubProfileSchema.safeParse(rawProfile)
  if (!profile.success) throw new Error('GitHub profile data is invalid')

  const ownedRepositories: GithubSyncRepository[] = repositories.map((repository) => {
    const curated = getCuratedProjectClassification(repository.nameWithOwner)
    return {
      fullName: repository.nameWithOwner,
      name: repository.name,
      url: repository.url,
      isPrivate: repository.isPrivate,
      ...(repository.nameWithOwner.toLowerCase() === 'lst97/splittab'
        ? { ownerProvidedPurpose: 'Expense-management app for splitting shared costs.' }
        : {}),
      description: repository.description,
      topics: repository.repositoryTopics.map(({ name }) => name),
      languages: repository.languages.map(({ name, size }) => ({ name, bytes: size })),
      defaultBranch: repository.defaultBranchRef?.name ?? null,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
      primaryLanguage: repository.primaryLanguage?.name ?? null,
      license: repository.licenseInfo?.name ?? null,
      homepage: repository.homepageUrl,
      stars: repository.stargazerCount,
      forks: repository.forkCount,
      softwareKinds: curated.kinds,
      curatedTopics: curated.topics,
      sourceKind: 'owned',
    }
  })
  const contributionRepositories: GithubSyncRepository[] = contributions.repositories.map((repository) => ({
    fullName: repository.fullName,
    name: repository.fullName.split('/').at(-1)!,
    url: repository.url,
    isPrivate: repository.isPrivate,
    sourceKind: 'contribution',
    contribution: repository,
    contributionCoverage: { complete: contributions.complete, incompleteReasons: contributions.incompleteReasons },
  }))

  const curatedProfile = await createProfileKnowledgeSource().fetch('operator-profile')
  const wakaTimeProfile = await createWakaTimeKnowledgeSource({ endpoint: WAKATIME_SHARE_URL }).fetch('wakatime-all-time')
  const profileMarkdown = renderGithubProfileMarkdown({
    githubProfileMarkdown: renderPersonalGithubProfileMarkdown(profile.data),
    curatedProfileMarkdown: curatedProfile?.text ?? 'No additional owner-provided profile summary is configured.',
    ...(wakaTimeProfile ? { wakaTimeMarkdown: wakaTimeProfile.text } : {}),
    wakaTimeSourceUrl: WAKATIME_SHARE_URL,
  })
  const documents: KnowledgeDocument[] = [{
    source: {
      type: 'github-profile',
      sourceId: 'lst97-profile',
      title: 'Nelson (LST97) profile',
      url: 'https://github.com/lst97',
    },
    text: profileMarkdown,
    isPublic: true,
    sourceUpdatedAt: null,
  }]

  if (!wakaTimeProfile) logger.warn('knowledge.github.wakatime_profile_unavailable')
  logger.info('knowledge.github.fetch.completed', {
    repositoryCount: repositories.length,
    publicCount: repositories.filter((repository) => !repository.isPrivate).length,
    privateCount: repositories.filter((repository) => repository.isPrivate).length,
    contributionRepositoryCount: contributions.repositories.length,
    contributionInventoryComplete: contributions.complete,
    contributionIncompleteReasons: contributions.incompleteReasons,
  })
  return {
    documents,
    repositories: [...ownedRepositories, ...contributionRepositories],
    inventoryComplete: contributions.complete,
    contributionCount: contributions.repositories.length,
    publicCount: repositories.filter((repository) => !repository.isPrivate).length,
    privateCount: repositories.filter((repository) => repository.isPrivate).length,
  }
}

let sidecar: Bun.Subprocess | undefined
let syncStage: 'github_fetch' | 'embedding_server' | 'indexing' = 'github_fetch'
try {
  requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
  const data = await collectDocuments()
  const retryMissingOnly = Bun.argv.includes('--retry-missing')
  const refreshContributionsOnly = Bun.argv.includes('--refresh-contributions')
  const selectedRepository = Bun.argv.find((argument) => argument.startsWith('--repository='))?.slice('--repository='.length)
  if (selectedRepository && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(selectedRepository)) {
    throw new Error('The selected repository identity is invalid')
  }
  if (selectedRepository && !data.repositories.some(({ fullName }) => fullName === selectedRepository)) {
    throw new Error('The selected repository is not in the current GitHub inventory')
  }
  const repositoriesToSync = retryMissingOnly
    ? await Promise.all(data.repositories.map(async (repository) => ({ repository, exists: await reportFileExists(repository) })))
      .then((entries) => entries.filter(({ exists }) => !exists).map(({ repository }) => repository))
      : refreshContributionsOnly
        ? data.repositories.filter((repository) => repository.sourceKind === 'contribution')
        : selectedRepository
          ? data.repositories.filter((repository) => repository.fullName === selectedRepository)
          : data.repositories
  syncStage = 'embedding_server'
  sidecar = await ensureLocalEmbeddingServer()
  syncStage = 'indexing'
  const repository = getKnowledgeIndexRepository()
  const embedding = createEmbeddingClient({
    baseUrl: env.KNOWLEDGE_EMBEDDING_URL,
    model: env.KNOWLEDGE_EMBEDDING_MODEL,
    apiKey: env.KNOWLEDGE_EMBEDDING_API_KEY,
    timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
  })
  const commandRunner: GithubCommandRunner = {
    async run(command, args, maxOutputBytes = 2_000_000) {
      const process = Bun.spawn([command, ...args], { cwd: projectRoot, stdout: 'pipe', stderr: 'ignore' })
      if (!(process.stdout instanceof ReadableStream)) throw new Error('Repository command output unavailable')
      const reader = process.stdout.getReader()
      const chunks: ArrayBuffer[] = []
      let outputBytes = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        outputBytes += chunk.value.byteLength
        if (outputBytes > maxOutputBytes) {
          await reader.cancel()
          await process.exited
          throw new GithubCommandOutputTooLargeError()
        }
        chunks.push(chunk.value.slice().buffer as ArrayBuffer)
      }
      const output = await new Blob(chunks).text()
      const exitCode = await process.exited
      if (exitCode !== 0) {
        throw new Error('Repository command failed')
      }
      return output
    },
  }
  const inventoryComplete = await syncGithubRepositoryReports({
    rootDirectory: githubDataRoot,
    repositories: repositoriesToSync,
    inventoryComplete: selectedRepository ? false : data.inventoryComplete,
    allowStaleCleanup: !retryMissingOnly && !refreshContributionsOnly && !selectedRepository,
    inspect: async (item) => inspectGithubRepository(item, Bun.env.TMPDIR || '/tmp', commandRunner),
    analyze: analyzeGithubRepository,
    render: renderGithubRepositorySummary,
    writeAtomically: writeMarkdownAtomically,
    async index(document) {
      const source: KnowledgeSource = { type: document.source.type, fetch: async () => null }
      await createIndexKnowledgeSource({ source, embedding, repository, logger }).executeDocument(document)
    },
    listSourceIds: (type) => repository.listSourceIds(type),
    removeSource: (type, sourceId) => repository.removeSource(type, sourceId),
    logger,
  })
  const sanitizedLegacyReportCount = await sanitizeExistingGithubMarkdown()
  if (sanitizedLegacyReportCount > 0) {
    logger.warn('knowledge.github.legacy_reports_sanitized', { reportCount: sanitizedLegacyReportCount })
  }
  let legacyReportsRemoved = 0
  let legacyReportsRetained = 0
  if (inventoryComplete.failedCount === 0) {
    const candidates: string[] = []
    for await (const path of new Bun.Glob('src/data/github/**/*.md.md').scan(projectRoot)) {
      candidates.push(`${projectRoot}/${path}`)
    }
    const cleanup = await removeSupersededGithubReports({
      candidates,
      async read(path) { return Bun.file(path).text() },
      async remove(path) {
        const child = Bun.spawn(['rm', '-f', path], { stdout: 'ignore', stderr: 'ignore' })
        if (await child.exited !== 0) throw new Error('Could not remove superseded GitHub report')
      },
    })
    legacyReportsRemoved = cleanup.removedCount
    legacyReportsRetained = cleanup.retainedCount
  }
  if (!inventoryComplete.complete && !selectedRepository) process.exitCode = 1
  for (const document of data.documents) {
    await syncGithubProfileDocument({
      document,
      outputPath: `${projectRoot}/src/data/profile.md`,
      async indexDocument(profileDocument) { await indexDocuments([profileDocument]) },
      writeAtomically: writeMarkdownAtomically,
    })
  }
  logger.info('knowledge.github.sync.completed', {
    publicRepositoryCount: data.publicCount,
    privateRepositoryCount: data.privateCount,
    indexedDocumentCount: data.documents.length,
    privateDocumentsIndexedAsNonPublic: data.privateCount,
    contributionRepositoryCount: data.contributionCount,
    contributionInventoryComplete: data.inventoryComplete,
    repositoryRefreshComplete: inventoryComplete.complete,
    repositoryReportsWritten: inventoryComplete.writtenCount,
    repositoryReportsFailed: inventoryComplete.failedCount,
    repositoryReportFailuresByStage: inventoryComplete.failedByStage,
    repositoryReportFailuresByCategory: inventoryComplete.failedByCategory,
    legacyReportsRemoved,
    legacyReportsRetained,
    retryMissingOnly,
    refreshContributionsOnly,
    selectedRepository: selectedRepository ? '[selected]' : undefined,
  })
} catch (error) {
  logger.error('knowledge.github.sync.failed', {
    stage: syncStage,
    failureCategory: error instanceof Error ? error.name : 'unknown',
  })
  process.exitCode = 1
} finally {
  if (sidecar) await stopEmbeddingSidecar(sidecar)
  await closeKnowledgeDatabase()
}
