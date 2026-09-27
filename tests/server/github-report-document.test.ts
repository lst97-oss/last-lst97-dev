import { describe, expect, it } from 'bun:test'

import { parseGithubReportDocument } from '../../src/server/knowledge/github-report-document'

describe('GitHub report Markdown document parser', () => {
  const report = [
    '# SplitTab',
    '',
    '## Repository metadata',
    '- **Repository:** lst97/SplitTab',
    '- **Visibility:** private',
    '- **URL:** https://github.com/lst97/SplitTab',
    '',
    '## Retrieval summary',
    'Expense-management application for splitting shared costs.',
  ].join('\n')

  it('preserves report identity and derives visibility from its private path', () => {
    expect(parseGithubReportDocument('src/data/github/private/SplitTab.md', report)).toEqual({
      source: {
        type: 'github-private',
        sourceId: 'lst97/SplitTab',
        title: 'SplitTab',
        url: 'https://github.com/lst97/SplitTab',
      },
      text: report,
      isPublic: false,
      sourceUpdatedAt: null,
      projectCatalog: {
        summary: 'Expense-management application for splitting shared costs.',
        createdAt: null,
        updatedAt: null,
        stars: null,
        forks: null,
        primaryLanguage: null,
        languages: [],
        kinds: [],
        githubTopics: [],
        curatedTopics: [],
      },
    })
  })

  it('parses structured project metadata, software kinds, and both topic sources', () => {
    const detailed = [
      '# SplitTab', '', '## Retrieval summary',
      '- **Owner-provided purpose:** Expense management for shared costs.',
      '- **Software kinds:** web_app',
      '- **GitHub topics:** expenses, budgeting',
      '- **Curated topics:** shared-expenses, household-finance',
      '', '## Repository metadata',
      '- **Repository:** lst97/SplitTab', '- **Visibility:** private',
      '- **URL:** https://github.com/lst97/SplitTab',
      '- **Created:** 2024-01-10T00:00:00Z', '- **Last updated:** 2026-09-10T00:00:00Z',
      '- **Primary language:** TypeScript', '- **Stars / forks:** 4 / 2',
      '- **Topics:** `expenses`, `budgeting`', '', '### GitHub language breakdown',
      '- TypeScript (10,000 bytes)', '- Python (500 bytes)',
    ].join('\n')
    const document = parseGithubReportDocument('src/data/github/private/SplitTab.md', detailed)

    expect(document?.projectCatalog).toEqual({
      summary: 'Expense management for shared costs.',
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
      stars: 4,
      forks: 2,
      primaryLanguage: 'TypeScript',
      languages: ['TypeScript', 'Python'],
      kinds: ['web_app'],
      githubTopics: ['expenses', 'budgeting'],
      curatedTopics: ['shared-expenses', 'household-finance'],
    })
  })

  it('maps contribution reports to their separate source type', () => {
    const contribution = report
      .replace('## Repository metadata', '## Repository metadata')
      .replace('lst97/SplitTab', 'anomalyco/opencode')
      .replace('https://github.com/lst97/SplitTab', 'https://github.com/anomalyco/opencode')
      .replace('- **Visibility:** private', '- **Visibility:** public')
    const document = parseGithubReportDocument(
      'src/data/github/contributions/public/anomalyco__opencode.md',
      contribution,
    )

    expect(document?.source.type).toBe('github-contrib')
    expect(document?.source.sourceId).toBe('anomalyco/opencode')
    expect(document?.isPublic).toBe(true)
  })

  it('rejects mismatched paths, identities, or non-canonical URLs', () => {
    expect(parseGithubReportDocument('src/data/github/public/SplitTab.md', report)).toBeNull()
    expect(parseGithubReportDocument(
      'src/data/github/private/SplitTab.md',
      report.replace('https://github.com/lst97/SplitTab', 'https://example.com/lst97/SplitTab'),
    )).toBeNull()
  })
})
