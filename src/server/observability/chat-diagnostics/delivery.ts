import type { Logger } from '../logger'
import { formatChatDiagnosticMessages } from './format'
import { DELIVERY_TIMEOUT_MS, MAX_QUEUE_RECORDS, MAX_RETRY_AFTER_MS } from './limits'
import { sanitizeRecord } from './sanitize'
import type { ChatDiagnosticsRecord, ChatDiagnosticsSink, DiscordWebhookPayload } from './types'

function webhookUrl(value: string): URL {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    !['discord.com', 'discordapp.com'].includes(url.hostname) ||
    !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Chat diagnostics webhook URL is invalid')
  url.searchParams.set('wait', 'true')
  return url
}

function pause(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}

export function createDiscordDiagnosticsSink(config: {
  webhookUrl: string
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  logger?: Pick<Logger, 'warn'>
  maxQueueRecords?: number
  timeoutMs?: number
  wait?: (durationMs: number) => Promise<void>
}): ChatDiagnosticsSink {
  const url = webhookUrl(config.webhookUrl)
  const fetcher = config.fetcher ?? fetch
  const maxQueueRecords = Math.max(1, Math.floor(config.maxQueueRecords ?? MAX_QUEUE_RECORDS))
  const timeoutMs = Math.max(1, Math.floor(config.timeoutMs ?? DELIVERY_TIMEOUT_MS))
  const wait = config.wait ?? pause
  const queue: ChatDiagnosticsRecord[] = []
  let draining = false
  let drainScheduled = false

  function scheduleDrain(): void {
    if (draining || drainScheduled) return
    drainScheduled = true
    queueMicrotask(() => {
      drainScheduled = false
      void drain()
    })
  }

  async function deliver(payload: DiscordWebhookPayload): Promise<boolean> {
    const target = new URL(url)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response
      try {
        response = await fetcher(target, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch {
        if (attempt === 0) {
          await wait(250)
          continue
        }
        config.logger?.warn('chat.diagnostics.delivery_failed', { reason: 'network_error' })
        return false
      }
      if (response.ok) return true
      if (attempt === 0 && response.status === 429) {
        let retryAfterMs = Number(response.headers.get('retry-after')) * 1_000
        if (!Number.isFinite(retryAfterMs) || retryAfterMs <= 0) {
          try {
            const payload = (await response.clone().json()) as { retry_after?: unknown }
            retryAfterMs = typeof payload.retry_after === 'number' ? payload.retry_after * 1_000 : 0
          } catch {
            retryAfterMs = 0
          }
        }
        if (retryAfterMs > 0 && retryAfterMs <= MAX_RETRY_AFTER_MS) {
          await wait(retryAfterMs)
          continue
        }
      } else if (attempt === 0 && response.status >= 500) {
        await wait(250)
        continue
      }
      config.logger?.warn('chat.diagnostics.delivery_failed', { statusCode: response.status })
      return false
    }
    return false
  }

  async function drain(): Promise<void> {
    if (draining) return
    draining = true
    try {
      while (queue.length > 0) {
        const record = queue.shift()
        if (!record) continue
        for (const payload of formatChatDiagnosticMessages(record)) {
          if (!(await deliver(payload))) break
        }
      }
    } catch {
      config.logger?.warn('chat.diagnostics.delivery_failed', { reason: 'unexpected_error' })
    } finally {
      draining = false
      if (queue.length > 0) scheduleDrain()
    }
  }

  return {
    enqueue(record) {
      if (queue.length >= maxQueueRecords) {
        queue.shift()
        config.logger?.warn('chat.diagnostics.queue_saturated', { maxQueueRecords })
      }
      queue.push(sanitizeRecord(record))
      scheduleDrain()
    },
  }
}
