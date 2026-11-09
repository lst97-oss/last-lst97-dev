import { HttpHeader, HttpStatus, MediaType } from '@lst97-oss/last-httprism'
import { CHAT_OFFLINE_MESSAGE } from '../../lib/chat-limits'
import { jsonResponse } from '../http/request'
import type { ChatDiagnosticsMetadata } from '../observability/chat-diagnostics'
import type { ChatStreamEvent } from './events'
import { encodeChatEvent } from './events'
import type { ChatPostHandlerDependencies } from './http-handler'

// Server-sent events for one chat turn. Kept apart from the request guards in http-handler.ts,
// which decide whether the turn runs at all.
export function streamChatEvents(
  requestId: string,
  startedAt: number,
  dependencies: ChatPostHandlerDependencies,
  input: { message: string; contextToken?: string; diagnosticsMetadata?: ChatDiagnosticsMetadata },
  signal: AbortSignal,
): Response {
  const maxMsOption = dependencies.streamMaxMs
  const maxMs = typeof maxMsOption === 'function' ? maxMsOption() : (maxMsOption ?? 90_000)
  const sendStream = dependencies.sendStream
  if (!sendStream) {
    return jsonResponse(requestId, { error: CHAT_OFFLINE_MESSAGE, requestId }, HttpStatus.SERVICE_UNAVAILABLE.code)
  }
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const push = (event: ChatStreamEvent) => controller.enqueue(encoder.encode(encodeChatEvent(event)))
      const deadline = Date.now() + maxMs
      try {
        for await (const event of sendStream(input, signal)) {
          if (Date.now() > deadline) {
            push({ type: 'error', message: CHAT_OFFLINE_MESSAGE })
            break
          }
          push(event)
          if (event.type === 'done' || event.type === 'error') {
            dependencies.logger.info('chat.stream_completed', {
              requestId,
              durationMs: Math.round(performance.now() - startedAt),
              outcome: event.type,
            })
            break
          }
        }
      } catch {
        try {
          push({ type: 'error', message: CHAT_OFFLINE_MESSAGE })
        } catch {
          // Client already went away; nothing left to report.
        }
      }
      controller.close()
    },
  })
  return new Response(stream, {
    status: HttpStatus.OK.code,
    headers: {
      [HttpHeader.CONTENT_TYPE]: `${MediaType.EVENT_STREAM}; charset=utf-8`,
      [HttpHeader.CACHE_CONTROL]: 'no-store',
      'x-request-id': requestId,
    },
  })
}
