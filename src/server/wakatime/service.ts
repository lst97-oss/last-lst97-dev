import { z } from 'zod'

import type { Logger } from '../observability/logger'

const allTimeSnapshotSchema = z.object({
  data: z.object({
    grand_total: z.object({
      human_readable_total_including_other_language: z.string().min(1),
    }).passthrough(),
  }).passthrough(),
}).passthrough()

export type WakaTimeSnapshot = z.infer<typeof allTimeSnapshotSchema>

export interface WakaTimeSnapshotResult {
  stats: WakaTimeSnapshot
  rawJson: string
}

type WakaTimeFetcher = (input: string, init?: RequestInit) => Promise<Response>

export function createWakaTimeReader(dependencies: {
  endpoint: string
  fetcher?: WakaTimeFetcher
  logger: Pick<Logger, 'warn'>
  timeoutMs?: number
}) {
  const fetcher = dependencies.fetcher ?? fetch
  const timeoutMs = dependencies.timeoutMs ?? 5_000

  return {
    async getSnapshot(): Promise<WakaTimeSnapshotResult | null> {
      let response: Response

      try {
        response = await fetcher(dependencies.endpoint, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (error) {
        dependencies.logger.warn('wakatime.snapshot.request_failed', { error })
        return null
      }

      if (!response.ok) {
        dependencies.logger.warn('wakatime.snapshot.request_failed', { status: response.status })
        return null
      }

      let rawJson: string
      let payload: unknown

      try {
        rawJson = await response.text()
        payload = JSON.parse(rawJson)
      } catch (error) {
        dependencies.logger.warn('wakatime.snapshot.invalid_json', { error })
        return null
      }

      const snapshot = allTimeSnapshotSchema.safeParse(payload)
      if (!snapshot.success) {
        dependencies.logger.warn('wakatime.snapshot.invalid_payload', {
          issues: snapshot.error.issues.map((issue) => ({ code: issue.code, path: issue.path })),
        })
        return null
      }

      return { stats: snapshot.data, rawJson }
    },
  }
}

export type WakaTimeReader = ReturnType<typeof createWakaTimeReader>
