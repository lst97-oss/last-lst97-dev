import { z } from 'zod'

import type { KnowledgeDocument, KnowledgeSource } from './source-types'

const MAX_PAGES = 2
const MAX_REPOSITORIES = 150
const MAX_README_CHARS = 8_000
const MAX_RESPONSE_CHARS = 1_000_000
type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const repositorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  full_name: z.string().min(1).max(200),
  html_url: z.url(),
  description: z.string().max(2_000).nullable(),
  fork: z.boolean(),
  private: z.boolean(),
  updated_at: z.iso.datetime().optional(),
})

const readmeSchema = z.object({
  content: z.string().max(1_000_000),
  encoding: z.literal('base64'),
})

export interface GithubKnowledgeSourceConfig {
  username: string
  fetcher?: FetchFunction
  now?: () => Date
  maxRepositories?: number
  timeoutMs?: number
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function createGithubKnowledgeSource(config: GithubKnowledgeSourceConfig): KnowledgeSource & { listDocuments(): Promise<KnowledgeDocument[]> } {
  const fetcher = config.fetcher ?? fetch
  const maxRepositories = Math.max(1, Math.min(MAX_REPOSITORIES, Math.floor(config.maxRepositories ?? MAX_REPOSITORIES)))
  const timeoutMs = config.timeoutMs ?? 8_000
  const documentCache = new Map<string, KnowledgeDocument>()

  async function request(url: string, accept = 'application/vnd.github+json'): Promise<Response> {
    let response: Response
    try {
      response = await fetcher(url, {
        headers: {
          accept,
          'x-github-api-version': '2022-11-28',
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch {
      throw new Error('GitHub source request failed')
    }
    return response
  }

  const source: KnowledgeSource & { listDocuments(): Promise<KnowledgeDocument[]> } = {
    type: 'github',
    async fetch(sourceId) {
      return documentCache.get(sourceId) ?? null
    },
    async listDocuments(): Promise<KnowledgeDocument[]> {
      const repos = []
      for (let page = 1; page <= MAX_PAGES && repos.length < maxRepositories; page += 1) {
        const url = new URL(`https://api.github.com/users/${encodeURIComponent(config.username)}/repos`)
        url.searchParams.set('type', 'owner')
        url.searchParams.set('sort', 'updated')
        url.searchParams.set('per_page', '100')
        url.searchParams.set('page', String(page))
        const response = await request(url.toString())
        if (!response.ok) throw new Error('GitHub source request failed')

        let payload: unknown
        try {
          const body = await response.text()
          if (body.length > MAX_RESPONSE_CHARS) throw new Error('response too large')
          payload = JSON.parse(body)
        } catch {
          throw new Error('GitHub source returned invalid data')
        }
        const parsed = z.array(repositorySchema).safeParse(payload)
        if (!parsed.success) throw new Error('GitHub source returned invalid data')
        for (const repo of parsed.data) {
          const canonicalURL = new URL(repo.html_url)
          if (
            canonicalURL.protocol !== 'https:'
            || canonicalURL.hostname !== 'github.com'
            || canonicalURL.pathname.replace(/\/$/, '') !== `/${repo.full_name}`
            || repo.full_name.split('/')[0]?.toLowerCase() !== config.username.toLowerCase()
          ) {
            throw new Error('GitHub source returned invalid data')
          }
        }
        repos.push(...parsed.data.filter(({ fork, private: isPrivate }) => !fork && !isPrivate))
        if (parsed.data.length < 100) break
      }

      const eligible = repos.slice(0, maxRepositories)
      const toDocument = async (repo: z.infer<typeof repositorySchema>): Promise<KnowledgeDocument> => {
        let readme = ''
        try {
          const response = await request(
            `https://api.github.com/repos/${repo.full_name.split('/').map(encodeURIComponent).join('/')}/readme`,
          )
          if (response.ok) {
            const body = await response.text()
            if (body.length <= MAX_RESPONSE_CHARS) {
              const parsed = readmeSchema.safeParse(JSON.parse(body))
              if (parsed.success) readme = decodeBase64(parsed.data.content).slice(0, MAX_README_CHARS)
            }
          }
        } catch {
          // A missing/unavailable README does not invalidate public repository metadata.
        }

        const metadata = [
          `Public GitHub repository: ${repo.full_name}`,
          repo.description ? `Description: ${repo.description}` : '',
          readme ? `README excerpt:\n${readme}` : '',
        ].filter(Boolean).join('\n\n')
        const updatedAt = repo.updated_at ? new Date(repo.updated_at) : null
        return {
          source: { type: 'github', sourceId: repo.full_name, title: repo.name, url: repo.html_url },
          text: metadata.slice(0, MAX_README_CHARS),
          isPublic: true,
          sourceUpdatedAt: updatedAt && Number.isFinite(updatedAt.valueOf()) ? updatedAt : config.now?.() ?? null,
        }
      }
      const documents: KnowledgeDocument[] = []
      for (let offset = 0; offset < eligible.length; offset += 5) {
        documents.push(...await Promise.all(eligible.slice(offset, offset + 5).map(toDocument)))
      }
      documentCache.clear()
      for (const document of documents) documentCache.set(document.source.sourceId, document)
      return documents
    },
  }
  return source
}
