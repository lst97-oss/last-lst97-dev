import { z } from 'zod'

import type { Logger } from '../observability/logger'

const allTimeSnapshotSchema = z
  .object({
    data: z
      .object({
        grand_total: z
          .object({
            human_readable_total_including_other_language: z.string().min(1),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough()

export type WakaTimeSnapshot = z.infer<typeof allTimeSnapshotSchema>

export interface WakaTimeSnapshotResult {
  stats: WakaTimeSnapshot
  /**
   * The upstream response, re-indented here on the server rather than in the
   * route that renders it: the home page used to call `js-beautify` at render
   * time, which put ~97 kB of beautifier on the client bundle's critical path
   * to indent one blob. `JSON.stringify` is the native equivalent for JSON.
   */
  formattedJson: string
}

type WakaTimeFetcher = (input: string, init?: RequestInit) => Promise<Response>

// The public-share JSON is stable for long stretches, and the home page asks for
// it on every SSR render. One in-memory entry per reader instance, refreshed at
// most once an hour: repeated loads stop paying the network round-trip, and a
// WakaTime blip no longer blanks the snapshot for every visitor until the next
// request. Failures are never cached, so a transient outage still self-heals on
// the next call instead of being pinned for the whole TTL window.
const SNAPSHOT_CACHE_TTL_MS = 60 * 60 * 1000

export function createWakaTimeReader(dependencies: {
  endpoint: string
  fetcher?: WakaTimeFetcher
  logger: Pick<Logger, 'warn'>
  timeoutMs?: number
  now?: () => number
}) {
  const fetcher = dependencies.fetcher ?? fetch
  const timeoutMs = dependencies.timeoutMs ?? 5_000
  const now = dependencies.now ?? Date.now
  let cachedSnapshot: WakaTimeSnapshotResult | null = null
  let cachedAtMs = Number.NEGATIVE_INFINITY
  let inFlight: Promise<WakaTimeSnapshotResult | null> | null = null

  async function loadSnapshot(): Promise<WakaTimeSnapshotResult | null> {
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

    let payload: unknown

    try {
      payload = JSON.parse(await response.text())
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

    return { stats: snapshot.data, formattedJson: JSON.stringify(payload, null, 2) }
  }

  return {
    async getSnapshot(): Promise<WakaTimeSnapshotResult | null> {
      if (cachedSnapshot && now() - cachedAtMs < SNAPSHOT_CACHE_TTL_MS) return cachedSnapshot

      inFlight ??= loadSnapshot()
        .then((snapshot) => {
          if (snapshot) cachedAtMs = now()
          // A null leaves cachedSnapshot null, so the guard above refetches: a
          // failure is never pinned for the hour.
          cachedSnapshot = snapshot

          return snapshot
        })
        .finally(() => {
          inFlight = null
        })

      return inFlight
    },
  }
}

export type WakaTimeReader = ReturnType<typeof createWakaTimeReader>
