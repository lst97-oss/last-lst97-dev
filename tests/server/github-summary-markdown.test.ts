import { describe, expect, it } from 'bun:test'

import type { GithubContributionRepository } from '../../src/server/knowledge/github/contributions'
import type { GithubRepositoryAnalysis } from '../../src/server/knowledge/github/repository-analysis'
import { renderGithubRepositorySummary } from '../../src/server/knowledge/github/summary-markdown'

const analysis: GithubRepositoryAnalysis = {
  repository: { fullName: 'lst97/demo', url: 'https://github.com/lst97/demo', isPrivate: false, description: 'Useful app' },
  purpose: { value: 'Code exports indicate this repository creates task records.', evidence: ['src/tasks/create.ts'], inferred: true },
  problem: { value: 'Unknown: source code does not explicitly state the problem addressed.', evidence: [], inferred: false },
  features: [{ value: 'Creates task records', evidence: ['src/tasks/create.ts'], inferred: true }],
  files: { total: 10, source: 5, tests: 2, docs: 1, configuration: 1, assetsAndOther: 1 },
  technology: [{ name: 'TypeScript', evidence: ['package.json'] }],
  patterns: [{ name: 'layered architecture', evidence: ['src/domain'], inferred: true }],
  structure: { directories: [], representativeFiles: [] },
  inspectedSourceFileCount: 0,
  implementationEvidence: [],
  limitations: [],
}

const contribution: GithubContributionRepository = {
  fullName: 'community/tool', owner: 'community', url: 'https://github.com/community/tool', isPrivate: true,
  counts: { commits: 4, pullRequests: 1, issues: 2, reviews: 3 },
  pullRequests: [{ title: 'Improve handling', state: 'MERGED', url: 'https://github.com/community/tool/pull/8' }],
  issues: [{ title: 'Document setup', state: 'CLOSED', url: 'https://github.com/community/tool/issues/9' }],
}

describe('GitHub repository summary Markdown', () => {
  it('renders evidence, patterns, counts, and available contribution details with private metadata', () => {
    const result = renderGithubRepositorySummary({
      analysis: { ...analysis, repository: { ...analysis.repository, fullName: 'community/tool', url: 'https://github.com/community/tool', isPrivate: true } },
      contribution,
      contributionCoverage: { complete: false, incompleteReasons: ['contribution_entries_capped'] },
      sourceKind: 'contribution',
    })

    expect(result.document.isPublic).toBe(false)
    expect(result.document.source.type).toBe('github-contrib-private')
    expect(result.markdown).toContain('Creates task records')
    expect(result.markdown).toContain('10 tracked files')
    expect(result.markdown).toContain('**inferred**')
    expect(result.markdown).toContain('4 commits, 1 pull requests, 2 issues, 3 reviews')
    expect(result.markdown).toContain('https://github.com/community/tool/pull/8')
    expect(result.markdown).toContain('GitHub capped at least one contribution list')
  })

  it('renders owned public documents and explicit unknown markers', () => {
    const result = renderGithubRepositorySummary({
      analysis: { ...analysis, purpose: { value: 'Unknown: the inspected source does not expose enough named behavior to identify the project purpose.', evidence: [], inferred: false } },
      sourceKind: 'owned',
    })
    expect(result.document.isPublic).toBe(true)
    expect(result.document.source.type).toBe('github')
    expect(result.markdown).toContain('Unknown: the inspected source does not expose enough named behavior to identify the project purpose.')
  })

  it('includes GitHub metadata formerly present only in the duplicate export and source inspection evidence', () => {
    const result = renderGithubRepositorySummary({
      analysis: {
        ...analysis,
        repository: {
          ...analysis.repository,
          topics: ['pixel-art', 'portfolio'],
          languages: [{ name: 'TypeScript', bytes: 12_345 }, { name: 'CSS', bytes: 678 }],
          defaultBranch: 'main',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        structure: { directories: [{ name: 'src', files: 4 }], representativeFiles: ['src/app.tsx'] },
        implementationEvidence: [{ value: 'Search projects', evidence: ['tests/search.test.ts'], inferred: true }],
      },
      sourceKind: 'owned',
    })

    expect(result.markdown).toContain('`pixel-art`, `portfolio`')
    expect(result.markdown).toContain('TypeScript (12,345 bytes)')
    expect(result.markdown).toContain('**Default branch:** main')
    expect(result.markdown).toContain('**Last updated:** 2026-09-01T00:00:00Z')
    expect(result.markdown).toContain('`src/` (4 tracked files)')
    expect(result.markdown).toContain('Search projects — Evidence: `tests/search.test.ts` (**inferred**)')
  })

  it('places a grounded retrieval summary before metadata and labels third-party contributions', () => {
    const result = renderGithubRepositorySummary({
      analysis: {
        ...analysis,
        purpose: {
          value: 'Expense-management app for splitting shared costs.',
          evidence: [],
          inferred: false,
          origin: 'owner-provided',
        },
        features: [
          { value: 'Creates expense groups', evidence: ['src/groups/create.ts'], inferred: true },
          { value: 'Calculates participant shares', evidence: ['src/expenses/shares.ts'], inferred: true },
        ],
        repository: {
          ...analysis.repository,
          fullName: 'community/split-tool',
          url: 'https://github.com/community/split-tool',
          topics: ['expense-sharing', 'budgeting'],
        },
      },
      sourceKind: 'contribution',
    })
    const summaryStart = result.markdown.indexOf('## Retrieval summary')
    const metadataStart = result.markdown.indexOf('## Repository metadata')
    const summary = result.markdown.slice(summaryStart, metadataStart)

    expect(summaryStart).toBeGreaterThan(-1)
    expect(summaryStart).toBeLessThan(metadataStart)
    expect(summary).toContain('Third-party contribution')
    expect(summary).toContain('Owner-provided purpose: Expense-management app for splitting shared costs.')
    expect(summary).toContain('Creates expense groups')
    expect(summary).toContain('TypeScript')
    expect(summary).toContain('expense-sharing')
  })

  it('omits unknown claims from the retrieval summary instead of turning them into positive facts', () => {
    const result = renderGithubRepositorySummary({ analysis, sourceKind: 'owned' })
    const summary = result.markdown.split('## Repository metadata')[0] ?? ''

    expect(summary).toContain('## Retrieval summary')
    expect(summary).toContain('Creates task records')
    expect(summary).not.toContain('Unknown:')
    expect(summary).not.toContain('does not expose enough')
  })

  it('surfaces the GNAF and Smartplay live project sites in retrieval summaries', () => {
    const projects = [
      { fullName: 'lst97/gnaf-autocomplete', homepage: 'https://gnaf.lst97.dev' },
      { fullName: 'lst97/smartplay-hk-oss', homepage: 'https://sphkoss.lst97.dev' },
    ]

    for (const project of projects) {
      const result = renderGithubRepositorySummary({
        analysis: { ...analysis, repository: { ...analysis.repository, ...project } },
        sourceKind: 'owned',
      })
      const summary = result.markdown.split('## Repository metadata')[0] ?? ''

      expect(summary).toContain(`Project demo: ${project.homepage}`)
    }
  })
})
