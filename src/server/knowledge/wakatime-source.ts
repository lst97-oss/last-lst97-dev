import { z } from 'zod'

import type { KnowledgeDocument, KnowledgeSource } from './source-types'

type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const shareSchema = z.object({
  data: z.object({
    grand_total: z.object({
      human_readable_total_including_other_language: z.string().min(1).max(100),
    }),
    languages: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          percent: z.number().finite().min(0).max(100),
          text: z.string().max(100).optional(),
        }),
      )
      .max(100)
      .optional(),
  }),
})

export interface WakaTimeKnowledgeSourceConfig {
  endpoint: string
  fetcher?: FetchFunction
  now?: () => Date
  timeoutMs?: number
}

export function createWakaTimeKnowledgeSource(
  config: WakaTimeKnowledgeSourceConfig,
): KnowledgeSource & { listDocuments(): Promise<KnowledgeDocument[]> } {
  const fetcher = config.fetcher ?? fetch

  const source: KnowledgeSource = {
    type: 'wakatime',
    async fetch(sourceId): Promise<KnowledgeDocument | null> {
      if (sourceId !== 'wakatime-all-time') return null
      let response: Response
      try {
        response = await fetcher(config.endpoint, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(config.timeoutMs ?? 5_000),
        })
      } catch {
        throw new Error('WakaTime source request failed')
      }
      if (!response.ok) throw new Error('WakaTime source request failed')

      let payload: unknown
      try {
        const body = await response.text()
        if (body.length > 100_000) throw new Error('response too large')
        payload = JSON.parse(body)
      } catch {
        throw new Error('WakaTime source returned invalid data')
      }
      const parsed = shareSchema.safeParse(payload)
      if (!parsed.success) throw new Error('WakaTime source returned invalid data')

      const total = parsed.data.data.grand_total.human_readable_total_including_other_language
      const languages = (parsed.data.data.languages ?? [])
        .slice()
        .sort((left, right) => right.percent - left.percent)
        .slice(0, 20)
        .map(({ name, percent, text }) => `${name}: ${percent}%${text ? ` (${text})` : ''}`)
      const text = [
        `All-time coding duration (including other languages): ${total}`,
        ...(languages.length > 0 ? [`Most-used languages: ${languages.join('; ')}`] : []),
      ].join('\n')

      return {
        source: { type: 'wakatime', sourceId, title: 'WakaTime coding activity', url: config.endpoint },
        text,
        isPublic: true,
        sourceUpdatedAt: config.now?.() ?? new Date(),
      }
    },
  }
  return Object.assign(source, {
    listDocuments: async () => {
      const document = await source.fetch('wakatime-all-time')
      return document ? [document] : []
    },
  })
}
