import { describe, expect, it } from 'bun:test'

import { createGithubKnowledgeSource } from '../../src/server/knowledge/github/source'
import { createWakaTimeKnowledgeSource } from '../../src/server/knowledge/wakatime-source'

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

describe('GitHub public knowledge source', () => {
  it('paginates public repositories, skips forks, and combines repo metadata with bounded README text', async () => {
    const requested: string[] = []
    const source = createGithubKnowledgeSource({
      username: 'lst97',
      now: () => new Date('2026-09-23T00:00:00Z'),
      fetcher: async (input) => {
        const url = String(input)
        requested.push(url)
        if (url.includes('/users/lst97/repos?')) {
          const page = new URL(url).searchParams.get('page')
          if (page === '1')
            return json([
              {
                id: 1,
                name: 'tool',
                full_name: 'lst97/tool',
                html_url: 'https://github.com/lst97/tool',
                description: 'Useful tool',
                fork: false,
                private: false,
                updated_at: '2026-09-20T00:00:00Z',
              },
              {
                id: 2,
                name: 'fork',
                full_name: 'lst97/fork',
                html_url: 'https://github.com/lst97/fork',
                description: null,
                fork: true,
                private: false,
                updated_at: '2026-09-19T00:00:00Z',
              },
            ])
          return json([])
        }
        return json({ content: btoa('# Tool\n\nA helpful public tool.'), encoding: 'base64', size: 30 })
      },
    })

    const documents = await source.listDocuments()

    expect(requested[0]).toContain('per_page=100&page=1')
    expect(requested).toHaveLength(2)
    expect(documents).toHaveLength(1)
    expect(documents[0]?.source.sourceId).toBe('lst97/tool')
    expect(documents[0]?.source.url).toBe('https://github.com/lst97/tool')
    expect(documents[0]?.text).toContain('Useful tool')
    expect(documents[0]?.text).toContain('A helpful public tool.')
    expect(documents[0]?.isPublic).toBe(true)
  })

  it('bounds pagination and README text and does not leak provider response details', async () => {
    const oversized = btoa('x'.repeat(10_000))
    const source = createGithubKnowledgeSource({
      username: 'lst97',
      fetcher: async (input) =>
        String(input).includes('/repos?')
          ? json(
              Array.from({ length: 100 }, (_, index) => ({
                id: index + 1,
                name: `repo-${index}`,
                full_name: `lst97/repo-${index}`,
                html_url: `https://github.com/lst97/repo-${index}`,
                description: null,
                fork: false,
                private: false,
                updated_at: '2026-09-20T00:00:00Z',
              })),
            )
          : json({ content: oversized, encoding: 'base64', size: 10_000 }),
      maxRepositories: 2,
    })

    const documents = await source.listDocuments()

    expect(documents).toHaveLength(2)
    expect(documents.every(({ text }) => text.length <= 8_000)).toBe(true)
  })

  it('rejects malformed API payloads without exposing response bodies', async () => {
    const source = createGithubKnowledgeSource({
      username: 'lst97',
      fetcher: async () => new Response('secret provider detail', { status: 503 }),
    })
    await expect(source.listDocuments()).rejects.toThrow('GitHub source request failed')
    await expect(source.listDocuments()).rejects.not.toThrow('secret provider detail')
  })

  it('rejects repository URLs outside the canonical GitHub host', async () => {
    const source = createGithubKnowledgeSource({
      username: 'lst97',
      fetcher: async () =>
        json([
          {
            id: 7,
            name: 'tool',
            full_name: 'lst97/tool',
            html_url: 'https://evil.example/lst97/tool',
            description: 'Not canonical',
            fork: false,
            private: false,
          },
        ]),
    })
    await expect(source.listDocuments()).rejects.toThrow('GitHub source returned invalid data')
  })
})

describe('WakaTime public knowledge source', () => {
  it('normalizes all-time coding total and public language breakdown', async () => {
    const source = createWakaTimeKnowledgeSource({
      endpoint: 'https://wakatime.com/share/@lst97/example.json',
      now: () => new Date('2026-09-23T00:00:00Z'),
      fetcher: async () =>
        json({
          data: {
            grand_total: { human_readable_total_including_other_language: '3,260 hrs 21 mins' },
            languages: [
              { name: 'TypeScript', percent: 66.79, text: '2,100 hrs', total_seconds: 7_560_000 },
              { name: 'Python', percent: 9.33, text: '300 hrs', total_seconds: 1_080_000 },
            ],
          },
        }),
    })

    const document = await source.fetch('wakatime-all-time')

    expect(document?.isPublic).toBe(true)
    expect(document?.text).toContain('3,260 hrs 21 mins')
    expect(document?.text).toContain('TypeScript: 66.79% (2,100 hrs)')
    expect(document?.text).toContain('Python: 9.33% (300 hrs)')
    expect(document?.source.url).toBe('https://wakatime.com/share/@lst97/example.json')
  })

  it('rejects invalid share data and sanitizes provider failures', async () => {
    const invalid = createWakaTimeKnowledgeSource({
      endpoint: 'https://example.test/share',
      fetcher: async () => json({ data: {} }),
    })
    await expect(invalid.fetch('wakatime-all-time')).rejects.toThrow('WakaTime source returned invalid data')

    const failed = createWakaTimeKnowledgeSource({
      endpoint: 'https://example.test/share',
      fetcher: async () => new Response('secret detail', { status: 503 }),
    })
    await expect(failed.fetch('wakatime-all-time')).rejects.toThrow('WakaTime source request failed')
  })
})
