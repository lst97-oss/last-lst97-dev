import { describe, expect, it } from 'bun:test'

import { githubRepositoryDocument, normalizeGithubRepositoryCliRecord, renderGithubRepositoryMarkdown, renderPersonalGithubProfileMarkdown } from '../../src/server/knowledge/github/markdown'

const repository = {
  nameWithOwner: 'lst97/example-tool',
  name: 'example-tool',
  description: 'A small developer tool.',
  url: 'https://github.com/lst97/example-tool',
  isPrivate: false,
  isFork: false,
  isArchived: false,
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
  primaryLanguage: { name: 'TypeScript' },
  languages: [{ name: 'TypeScript', size: 1000 }, { name: 'Shell', size: 250 }],
  repositoryTopics: [{ name: 'developer-tools' }],
  homepageUrl: 'https://example.test',
  defaultBranchRef: { name: 'main' },
  licenseInfo: { name: 'MIT License' },
  stargazerCount: 12,
  forkCount: 3,
  visibility: 'PUBLIC' as const,
}

describe('GitHub Markdown knowledge documents', () => {
  it('normalizes GitHub CLI nullable fields and language nodes into the domain record', () => {
    const normalized = normalizeGithubRepositoryCliRecord({
      ...repository,
      homepageUrl: '',
      languages: [{ node: { name: 'TypeScript' }, size: 1000 }],
      repositoryTopics: null,
      defaultBranchRef: { name: '' },
    })

    expect(normalized.homepageUrl).toBeNull()
    expect(normalized.languages).toEqual([{ name: 'TypeScript', size: 1000 }])
    expect(normalized.repositoryTopics).toEqual([])
    expect(normalized.defaultBranchRef).toBeNull()
  })

  it('includes repository metadata and README text in a Markdown document', () => {
    const markdown = renderGithubRepositoryMarkdown(repository, '# Example Tool\n\nUseful automation.')

    expect(markdown).toContain('# example-tool')
    expect(markdown).toContain('A small developer tool.')
    expect(markdown).toContain('TypeScript')
    expect(markdown).toContain('developer-tools')
    expect(markdown).toContain('https://example.test')
    expect(markdown).toContain('Useful automation.')
  })

  it('assigns private repos a separate non-public RAG source type', () => {
    const document = githubRepositoryDocument({ ...repository, isPrivate: true, visibility: 'PRIVATE' as const }, '# Internal')

    expect(document.source.type).toBe('github-private')
    expect(document.source.sourceId).toBe('lst97/example-tool')
    expect(document.isPublic).toBe(false)
    expect(document.text).toContain('# Internal')
  })

  it('builds profile Markdown without treating unavailable fields as facts', () => {
    const markdown = renderPersonalGithubProfileMarkdown({
      login: 'lst97',
      name: 'Nelson',
      bio: 'Full-stack developer building open-source tools.',
      public_repos: 89,
      followers: 17,
      following: 31,
      created_at: '2015-06-01T00:00:00Z',
    })

    expect(markdown).toContain('Nelson')
    expect(markdown).toContain('89 public repositories')
    expect(markdown).toContain('LinkedIn')
    expect(markdown).not.toContain('Location:')
  })
})
