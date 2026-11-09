import type { NitroAppPlugin } from 'nitro/types'

import { closeKnowledgeDatabase } from '@/server/knowledge/database'
import { logger } from '@/server/observability/logger'
import { closeCodingHistoryDatabase } from '@/server/wakatime/history/database'

const scope = { component: 'shutdown', role: 'app' }

type Destroyable = { destroy?: () => unknown }

function cachedPayloads(): unknown[] {
  const cache = (globalThis as Record<string, unknown>)._payload
  if (cache instanceof Map) return [...cache.values()]
  return []
}

export async function destroyCachedPayloads(): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled(
    cachedPayloads().map(async (payload) => {
      const destroy = (payload as Destroyable | null | undefined)?.destroy
      if (typeof destroy === 'function') await destroy.call(payload)
    }),
  )
}

export async function drainAll(): Promise<PromiseSettledResult<unknown>[]> {
  // allSettled: one failing pool close never masks the others.
  return Promise.allSettled([destroyCachedPayloads(), closeKnowledgeDatabase(), closeCodingHistoryDatabase()])
}

// Counts rejections, including the ones nested in destroyCachedPayloads()'s own result list.
export function countFailures(results: PromiseSettledResult<unknown>[]): number {
  return results.reduce((count, result) => {
    if (result.status === 'rejected') return count + 1
    return count + (Array.isArray(result.value) ? countFailures(result.value) : 0)
  }, 0)
}

// Payload caches instances in global._payload, each with an open Postgres pool, and the knowledge and
// wakatime clients hold pools of their own. srvx handles SIGINT/SIGTERM (unless CI or TEST is set): it stops
// accepting, lets in-flight requests finish, then runs Nitro's `close` hook. Drain there and exit, so an idle
// pool cannot hold the process until the platform force-kills it.
const payloadShutdownPlugin: NitroAppPlugin = (nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    const startedAt = performance.now()
    // srvx's "Stopping server gracefully" progress line has no newline; end it so the JSON log starts clean.
    process.stderr.write('\n')
    logger.info('shutdown.started', scope)
    const results = await drainAll()
    logger.info('shutdown.drained', {
      ...scope,
      durationMs: Math.round(performance.now() - startedAt),
      failed: countFailures(results),
    })
    logger.info('shutdown.exit', { ...scope, code: 0 })
    process.exit(0)
  })
}

export default payloadShutdownPlugin
