import { describe, expect, it } from 'bun:test'

import {
  aggregateGithubContributions,
  createGithubContributionsGateway,
  discoverGithubContributions,
} from '../../src/server/knowledge/github/contributions'

describe('GitHub contribution inventory', () => {
  it('merges contribution kinds across years and excludes repositories owned by lst97', () => {
    const inventory = aggregateGithubContributions([
      {
        year: 2025,
        complete: true,
        incompleteReasons: [],
        repositories: [
          {
            fullName: 'community/tool',
            url: 'https://github.com/community/tool',
            isPrivate: false,
            counts: { commits: 2, pullRequests: 1, issues: 0, reviews: 1 },
            pullRequests: [{ title: 'Add a useful feature', url: 'https://github.com/community/tool/pull/7', state: 'MERGED' }],
            issues: [],
          },
          {
            fullName: 'lst97/my-project',
            url: 'https://github.com/lst97/my-project',
            isPrivate: false,
            counts: { commits: 8, pullRequests: 1, issues: 0, reviews: 0 },
            pullRequests: [],
            issues: [],
          },
        ],
      },
      {
        year: 2026,
        complete: true,
        incompleteReasons: [],
        repositories: [
          {
            fullName: 'community/tool',
            url: 'https://github.com/community/tool',
            isPrivate: false,
            counts: { commits: 2, pullRequests: 0, issues: 0, reviews: 0 },
            pullRequests: [{ title: 'Add a useful feature', url: 'https://github.com/community/tool/pull/7', state: 'MERGED' }],
            issues: [],
          },
        ],
      },
    ])

    expect(inventory).toEqual({
      repositories: [{
        fullName: 'community/tool',
        owner: 'community',
        url: 'https://github.com/community/tool',
        isPrivate: false,
        counts: { commits: 4, pullRequests: 1, issues: 0, reviews: 1 },
        pullRequests: [{ title: 'Add a useful feature', url: 'https://github.com/community/tool/pull/7', state: 'MERGED' }],
        issues: [],
      }],
      complete: true,
      incompleteReasons: [],
    })
  })

  it('retains successful repository evidence but marks inventories incomplete when a year is unavailable', () => {
    const inventory = aggregateGithubContributions([
      {
        year: 2025,
        complete: true,
        incompleteReasons: [],
        repositories: [{
          fullName: 'community/tool',
          url: 'https://github.com/community/tool',
          isPrivate: false,
          counts: { commits: 1, pullRequests: 0, issues: 0, reviews: 0 },
          pullRequests: [],
          issues: [],
        }],
      },
      { year: 2026, complete: false, incompleteReasons: ['contribution_api_unavailable'], repositories: [] },
    ])

    expect(inventory.complete).toBe(false)
    expect(inventory.incompleteReasons).toEqual(['contribution_api_unavailable'])
    expect(inventory.repositories).toHaveLength(1)
    expect(inventory.repositories[0]?.counts.commits).toBe(1)
  })

  it('uses GitHub commit counts and normalizes pull-request evidence from GraphQL responses', async () => {
    const client = {
      async query(document: string): Promise<unknown> {
        if (document.includes('contributionYears')) {
          return { data: { user: { contributionsCollection: { contributionYears: [2025] } } } }
        }
        return {
          data: { user: { contributionsCollection: {
            commitContributionsByRepository: [{
              repository: { nameWithOwner: 'community/tool', url: 'https://github.com/community/tool', isPrivate: false },
              contributions: { totalCount: 1, nodes: [{ commitCount: 4, isRestricted: false }] },
            }],
            pullRequestContributionsByRepository: [{
              repository: { nameWithOwner: 'community/tool', url: 'https://github.com/community/tool', isPrivate: false },
              contributions: { totalCount: 1, nodes: [{ isRestricted: false, pullRequest: {
                title: 'Add feature', url: 'https://github.com/community/tool/pull/7', state: 'MERGED',
              } }] },
            }],
            issueContributionsByRepository: [],
            pullRequestReviewContributionsByRepository: [],
          } } },
        }
      },
    }
    const gateway = createGithubContributionsGateway(client)
    const years = await gateway.getContributionYears()
    const result = await gateway.getContributionsForYear(years[0]!)

    expect(result.repositories[0]?.counts).toEqual({ commits: 4, pullRequests: 1, issues: 0, reviews: 0 })
    expect(result.repositories[0]?.pullRequests[0]?.url).toBe('https://github.com/community/tool/pull/7')
    expect(result.complete).toBe(true)
  })

  it('marks the discovery incomplete and retains successful years when a year query fails', async () => {
    const inventory = await discoverGithubContributions({
      async getContributionYears() { return [2025, 2026] },
      async getContributionsForYear(year) {
        if (year === 2026) throw new Error('raw private API response must not escape')
        return {
          year,
          complete: true,
          incompleteReasons: [],
          repositories: [{
            fullName: 'community/tool',
            url: 'https://github.com/community/tool',
            isPrivate: false,
            counts: { commits: 1, pullRequests: 0, issues: 0, reviews: 0 },
            pullRequests: [],
            issues: [],
          }],
        }
      },
    })

    expect(inventory.complete).toBe(false)
    expect(inventory.incompleteReasons).toEqual(['contribution_year_unavailable'])
    expect(inventory.repositories[0]?.counts.commits).toBe(1)
  })
})
