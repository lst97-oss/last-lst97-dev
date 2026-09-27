import { getServerEnv } from '../src/server/env'
import { requireIntegrationEnv } from '../src/server/env-schema'
import { closeKnowledgeDatabase, getKnowledgeIndexRepository } from '../src/server/knowledge/database'
import { normalizeGithubRepositoryCliRecord } from '../src/server/knowledge/github/markdown'
import { getCuratedProjectClassification } from '../src/server/knowledge/project-curation'

const OWNER = 'lst97'
const MAX_GITHUB_OUTPUT = 8_000_000
const env = getServerEnv()
requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)

async function runGh(args: string[]): Promise<string> {
  let child: Bun.Subprocess
  try {
    child = Bun.spawn(['gh', ...args], { stdout: 'pipe', stderr: 'ignore' })
  } catch {
    throw new Error('GitHub CLI could not be started')
  }
  if (!(child.stdout instanceof ReadableStream)) throw new Error('GitHub CLI output stream was unavailable')
  const output = await new Response(child.stdout).text()
  const exitCode = await child.exited
  if (exitCode !== 0 || output.length > MAX_GITHUB_OUTPUT) throw new Error('GitHub repository metadata could not be fetched')
  return output
}

const githubRecords = JSON.parse(await runGh([
  'repo', 'list', OWNER,
  '--limit', '1000',
  '--json', 'nameWithOwner,name,description,url,isPrivate,isFork,isArchived,createdAt,updatedAt,primaryLanguage,languages,repositoryTopics,homepageUrl,defaultBranchRef,licenseInfo,stargazerCount,forkCount,visibility',
])) as unknown
if (!Array.isArray(githubRecords) || githubRecords.length > 1_000) throw new Error('GitHub repository inventory is invalid')
const repositories = githubRecords.map(normalizeGithubRepositoryCliRecord)
if (repositories.some(({ nameWithOwner }) => !nameWithOwner.toLowerCase().startsWith(`${OWNER}/`))) {
  throw new Error('GitHub repository inventory contains a repository outside the owner account')
}

const repository = getKnowledgeIndexRepository()
const projects = []
let excluded: string[] = []
for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
  const page = await repository.listOwnedProjects({ limit: 10, exclude_source_ids: excluded, first_batch: false })
  projects.push(...page.projects)
  excluded = projects.map(({ sourceId }) => sourceId)
  if (!page.hasMore) break
}
const storedById = new Map(projects.map((project) => [project.sourceId.toLowerCase(), project]))
const entries = repositories.flatMap((repo) => {
  const existing = storedById.get(repo.nameWithOwner.toLowerCase())
  if (!existing) return []
  const curated = getCuratedProjectClassification(repo.nameWithOwner)
  return [{
    sourceType: repo.isPrivate ? 'github-private' as const : 'github' as const,
    sourceId: repo.nameWithOwner,
    title: repo.name,
    url: repo.url,
    isPublic: !repo.isPrivate,
    metadata: {
      summary: existing.summary,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      primaryLanguage: repo.primaryLanguage?.name ?? null,
      languages: repo.languages.map(({ name }) => name),
      kinds: curated.kinds,
      githubTopics: repo.repositoryTopics.map(({ name }) => name),
      curatedTopics: curated.topics,
    },
  }]
})
if (entries.length !== repositories.length) throw new Error('GitHub catalogue metadata did not match every stored owned project')
await repository.upsertOwnedProjectCatalogEntries(entries)
await closeKnowledgeDatabase()
console.info(JSON.stringify({ event: 'knowledge.github.catalogue.completed', ownedProjectCount: entries.length, publicCount: entries.filter(({ isPublic }) => isPublic).length, privateCount: entries.filter(({ isPublic }) => !isPublic).length }))
