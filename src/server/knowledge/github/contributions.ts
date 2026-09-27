import { z } from 'zod'

const contributionKindCountsSchema = z.object({
  commits: z.number().int().nonnegative(),
  pullRequests: z.number().int().nonnegative(),
  issues: z.number().int().nonnegative(),
  reviews: z.number().int().nonnegative(),
})

const contributionReferenceSchema = z.object({
  title: z.string().max(500),
  url: z.url(),
  state: z.string().max(40),
})

const repositoryIdentitySchema = z
  .object({
    fullName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    url: z.url(),
    isPrivate: z.boolean(),
  })
  .refine(
    ({ fullName, url }) => {
      const parsed = new URL(url)
      return (
        parsed.protocol === 'https:' &&
        parsed.hostname === 'github.com' &&
        parsed.pathname.toLowerCase() === `/${fullName.toLowerCase()}`
      )
    },
    { message: 'GitHub contribution repository identity is invalid' },
  )

const yearRepositorySchema = repositoryIdentitySchema.extend({
  counts: contributionKindCountsSchema,
  pullRequests: z.array(contributionReferenceSchema),
  issues: z.array(contributionReferenceSchema),
})

export const githubContributionYearResultSchema = z.object({
  year: z.number().int().min(2007).max(2200),
  complete: z.boolean(),
  incompleteReasons: z.array(
    z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .max(80),
  ),
  repositories: z.array(yearRepositorySchema).max(500),
})

export type GithubContributionYearResult = z.infer<typeof githubContributionYearResultSchema>
export type GithubContributionRepository = z.infer<typeof repositoryIdentitySchema> & {
  owner: string
  counts: z.infer<typeof contributionKindCountsSchema>
  pullRequests: z.infer<typeof contributionReferenceSchema>[]
  issues: z.infer<typeof contributionReferenceSchema>[]
}

export interface GithubContributionInventory {
  repositories: GithubContributionRepository[]
  complete: boolean
  incompleteReasons: string[]
}

export interface GithubContributionsGateway {
  getContributionYears(): Promise<number[]>
  getContributionsForYear(year: number): Promise<GithubContributionYearResult>
}

export interface GithubGraphqlClient {
  query(document: string): Promise<unknown>
}

const MAX_REPOSITORIES_PER_CATEGORY = 100
const MAX_CONTRIBUTIONS_PER_REPOSITORY = 100

const contributionYearsQuery = `query {
  user(login: "lst97") {
    contributionsCollection { contributionYears }
  }
}`

function contributionQuery(year: number): string {
  const from = `${year}-01-01T00:00:00Z`
  const to = `${year}-12-31T23:59:59Z`
  return `query {
    user(login: "lst97") {
      contributionsCollection(from: "${from}", to: "${to}") {
        commitContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
          repository { nameWithOwner url isPrivate }
          contributions(first: ${MAX_CONTRIBUTIONS_PER_REPOSITORY}) { totalCount nodes { commitCount isRestricted } }
        }
        pullRequestContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
          repository { nameWithOwner url isPrivate }
          contributions(first: ${MAX_CONTRIBUTIONS_PER_REPOSITORY}) {
            totalCount nodes { isRestricted pullRequest { title url state } }
          }
        }
        issueContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
          repository { nameWithOwner url isPrivate }
          contributions(first: ${MAX_CONTRIBUTIONS_PER_REPOSITORY}) {
            totalCount nodes { isRestricted issue { title url state } }
          }
        }
        pullRequestReviewContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
          repository { nameWithOwner url isPrivate }
          contributions(first: ${MAX_CONTRIBUTIONS_PER_REPOSITORY}) { totalCount nodes { isRestricted } }
        }
      }
    }
  }`
}

const repositoryContributionGroupSchema = z.object({
  repository: z.object({
    nameWithOwner: z.string(),
    url: z.url(),
    isPrivate: z.boolean(),
  }),
  contributions: z.object({
    totalCount: z.number().int().nonnegative(),
    nodes: z
      .array(
        z.object({
          isRestricted: z.boolean().optional(),
          commitCount: z.number().int().nonnegative().optional(),
          pullRequest: contributionReferenceSchema.optional(),
          issue: contributionReferenceSchema.optional(),
        }),
      )
      .max(MAX_CONTRIBUTIONS_PER_REPOSITORY),
  }),
})

const contributionCollectionSchema = z.object({
  commitContributionsByRepository: z.array(repositoryContributionGroupSchema).max(MAX_REPOSITORIES_PER_CATEGORY),
  pullRequestContributionsByRepository: z.array(repositoryContributionGroupSchema).max(MAX_REPOSITORIES_PER_CATEGORY),
  issueContributionsByRepository: z.array(repositoryContributionGroupSchema).max(MAX_REPOSITORIES_PER_CATEGORY),
  pullRequestReviewContributionsByRepository: z
    .array(repositoryContributionGroupSchema)
    .max(MAX_REPOSITORIES_PER_CATEGORY),
})

const graphqlResponseSchema = z.object({
  data: z.object({
    user: z
      .object({
        contributionsCollection: contributionCollectionSchema,
      })
      .nullable(),
  }),
  errors: z.array(z.unknown()).optional(),
})

const yearResponseSchema = z.object({
  data: z.object({
    user: z
      .object({
        contributionsCollection: z
          .object({ contributionYears: z.array(z.number().int().min(2007).max(2200)) })
          .nullable(),
      })
      .nullable(),
  }),
  errors: z.array(z.unknown()).optional(),
})

function contributionReference(
  value: z.infer<typeof contributionReferenceSchema> | undefined,
  repositoryUrl: string,
): z.infer<typeof contributionReferenceSchema> | undefined {
  if (!value) return undefined
  const url = new URL(value.url)
  const repoPath = new URL(repositoryUrl).pathname
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith(`${repoPath}/`)) {
    return undefined
  }
  return value
}

function groupsToYearResult(year: number, raw: unknown): GithubContributionYearResult {
  const parsed = graphqlResponseSchema.safeParse(raw)
  if (!parsed.success || parsed.data.errors?.length || !parsed.data.data.user) {
    return { year, complete: false, incompleteReasons: ['contribution_response_invalid'], repositories: [] }
  }

  const collection = parsed.data.data.user.contributionsCollection
  const reasons = new Set<string>()
  const byRepository = new Map<string, GithubContributionYearResult['repositories'][number]>()
  const groups = [
    { key: 'commitContributionsByRepository', kind: 'commits' },
    { key: 'pullRequestContributionsByRepository', kind: 'pullRequests' },
    { key: 'issueContributionsByRepository', kind: 'issues' },
    { key: 'pullRequestReviewContributionsByRepository', kind: 'reviews' },
  ] as const

  for (const { key, kind } of groups) {
    const entries = collection[key]
    if (entries.length === MAX_REPOSITORIES_PER_CATEGORY) reasons.add('repository_category_capped')
    for (const entry of entries) {
      if (entry.contributions.totalCount > entry.contributions.nodes.length) reasons.add('contribution_entries_capped')
      if (entry.contributions.nodes.some((node) => node.isRestricted)) reasons.add('restricted_contributions_present')
      const identity = repositoryIdentitySchema.safeParse({
        fullName: entry.repository.nameWithOwner,
        url: entry.repository.url,
        isPrivate: entry.repository.isPrivate,
      })
      if (!identity.success) {
        reasons.add('repository_identity_invalid')
        continue
      }
      let repository = byRepository.get(identity.data.fullName)
      if (!repository) {
        repository = {
          ...identity.data,
          counts: { commits: 0, pullRequests: 0, issues: 0, reviews: 0 },
          pullRequests: [],
          issues: [],
        }
        byRepository.set(identity.data.fullName, repository)
      }

      if (kind === 'commits') {
        repository.counts.commits += entry.contributions.nodes.reduce((sum, node) => sum + (node.commitCount ?? 0), 0)
      } else if (kind === 'pullRequests') {
        repository.counts.pullRequests += entry.contributions.totalCount
        for (const node of entry.contributions.nodes) {
          const reference = contributionReference(node.pullRequest, identity.data.url)
          if (reference) repository.pullRequests.push(reference)
        }
      } else if (kind === 'issues') {
        repository.counts.issues += entry.contributions.totalCount
        for (const node of entry.contributions.nodes) {
          const reference = contributionReference(node.issue, identity.data.url)
          if (reference) repository.issues.push(reference)
        }
      } else {
        repository.counts.reviews += entry.contributions.totalCount
      }
    }
  }

  return {
    year,
    complete: reasons.size === 0,
    incompleteReasons: [...reasons],
    repositories: [...byRepository.values()],
  }
}

export function createGithubContributionsGateway(client: GithubGraphqlClient): GithubContributionsGateway {
  return {
    async getContributionYears() {
      const response = yearResponseSchema.safeParse(await client.query(contributionYearsQuery))
      if (!response.success || response.data.errors?.length) throw new Error('GitHub contribution years unavailable')
      const years = response.data.data.user?.contributionsCollection?.contributionYears
      if (!years) throw new Error('GitHub contribution years unavailable')
      return [...new Set(years)].sort((left, right) => left - right)
    },
    async getContributionsForYear(year) {
      if (!Number.isInteger(year) || year < 2007 || year > 2200) {
        return { year, complete: false, incompleteReasons: ['contribution_year_invalid'], repositories: [] }
      }
      return groupsToYearResult(year, await client.query(contributionQuery(year)))
    },
  }
}

export async function discoverGithubContributions(
  gateway: GithubContributionsGateway,
): Promise<GithubContributionInventory> {
  let years: number[]
  try {
    years = await gateway.getContributionYears()
  } catch {
    return { repositories: [], complete: false, incompleteReasons: ['contribution_years_unavailable'] }
  }

  const responses: GithubContributionYearResult[] = []
  for (const year of years) {
    try {
      responses.push(await gateway.getContributionsForYear(year))
    } catch {
      responses.push({ year, complete: false, incompleteReasons: ['contribution_year_unavailable'], repositories: [] })
    }
  }
  return aggregateGithubContributions(responses)
}

export function aggregateGithubContributions(
  yearResponses: readonly GithubContributionYearResult[],
): GithubContributionInventory {
  const repositories = new Map<string, GithubContributionRepository>()
  const incompleteReasons = new Set<string>()

  for (const rawResponse of yearResponses) {
    const response = githubContributionYearResultSchema.safeParse(rawResponse)
    if (!response.success) {
      incompleteReasons.add('contribution_response_invalid')
      continue
    }
    if (!response.data.complete) {
      for (const reason of response.data.incompleteReasons) incompleteReasons.add(reason)
    }

    for (const item of response.data.repositories) {
      const owner = item.fullName.split('/').at(0) ?? ''
      if (owner.toLowerCase() === 'lst97') continue
      let target = repositories.get(item.fullName)
      if (!target) {
        target = {
          ...item,
          owner,
          counts: { commits: 0, pullRequests: 0, issues: 0, reviews: 0 },
          pullRequests: [],
          issues: [],
        }
        repositories.set(item.fullName, target)
      }
      for (const kind of Object.keys(target.counts) as (keyof GithubContributionRepository['counts'])[]) {
        target.counts[kind] += item.counts[kind]
      }
      for (const kind of ['pullRequests', 'issues'] as const) {
        const known = new Set(target[kind].map((reference) => reference.url))
        for (const reference of item[kind]) {
          if (!known.has(reference.url)) {
            target[kind].push(reference)
            known.add(reference.url)
          }
        }
      }
    }
  }

  return {
    repositories: [...repositories.values()].sort((left, right) => left.fullName.localeCompare(right.fullName)),
    complete: incompleteReasons.size === 0,
    incompleteReasons: [...incompleteReasons].sort(),
  }
}
