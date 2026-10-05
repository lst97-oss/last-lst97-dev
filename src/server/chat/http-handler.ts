import {
  CHAT_EXPIRED_MESSAGE,
  CHAT_INVALID_MESSAGE_MESSAGE,
  CHAT_OFFLINE_MESSAGE,
  CHAT_RATE_LIMIT_MESSAGE,
  CHAT_REQUEST_TOO_LARGE_MESSAGE,
  CHAT_TURN_LIMIT_MESSAGE,
  CHAT_TURNSTILE_REQUIRED_MESSAGE,
  MAX_CHAT_REQUEST_BODY_BYTES,
} from '../../lib/chat-limits'
import { jsonResponse, readJsonBody, requestIdFrom } from '../http/request'
import type { PublicCitation } from '../knowledge/retrieve'
import type { ChatModerationRejectionReason } from '../moderation/types'
import type { ChatDiagnosticsMetadata } from '../observability/chat-diagnostics'
import type { Logger } from '../observability/logger'
import type { ChatContactActionBody, ChatContactActionRequest, ChatMessageRequest, ChatStreamEvent } from './events'
import { chatContactActionSchema, chatMessageRequestSchema, encodeChatEvent } from './events'
import { chatModerationRejectionMessage } from './moderation-rejection'

export interface ChatPostHandlerDependencies {
  send(input: { message: string; contextToken?: string; diagnosticsMetadata?: ChatDiagnosticsMetadata }): Promise<
    | {
        status: 'replied'
        text: string
        model?: string
        contextToken: string
        citations?: PublicCitation[]
        knowledgeUnavailable?: true
      }
    | { status: 'blocked'; reason?: ChatModerationRejectionReason }
    | { status: 'contact_confirmation'; text: string; contextToken: string }
    | { status: 'unavailable' }
    | { status: 'invalid_context' }
    | { status: 'turn_limit' }
  >
  logger: Logger
  rateLimit(request: Request): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>
  verifyChatTurnstile?(token: string, expectedHostname: string): Promise<boolean>
  contactRateLimit?(request: Request): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>
  verifyContactScreeningTurnstile?(token: string, expectedHostname: string): Promise<boolean>
  handleContactAction?(
    input: ChatContactActionRequest,
  ): Promise<
    | { ok: true; event: Extract<ChatStreamEvent, { type: `contact_${string}` }> }
    | { ok: false; reason: 'invalid_context' | 'invalid_transition' | 'invalid_review' }
  >
  getDiagnosticsMetadata?(request: Request): ChatDiagnosticsMetadata | undefined
  sendStream?(
    input: { message: string; contextToken?: string; diagnosticsMetadata?: ChatDiagnosticsMetadata },
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent>
  streamMaxMs?: number | (() => number)
}

export function createChatPostHandler(dependencies: ChatPostHandlerDependencies) {
  return async function POST({ request }: { request: Request }): Promise<Response> {
    const requestId = requestIdFrom(request)
    const startedAt = performance.now()
    const body = await readJsonBody(request, MAX_CHAT_REQUEST_BODY_BYTES)
    if (!body.ok) {
      return jsonResponse(
        requestId,
        {
          error: body.reason === 'too_large' ? CHAT_REQUEST_TOO_LARGE_MESSAGE : CHAT_INVALID_MESSAGE_MESSAGE,
          requestId,
        },
        body.reason === 'too_large' ? 413 : 400,
      )
    }

    const bodyRecord =
      typeof body.value === 'object' && body.value !== null && !Array.isArray(body.value)
        ? (body.value as Record<string, unknown>)
        : undefined
    if (bodyRecord && Object.hasOwn(bodyRecord, 'action')) {
      const action = chatContactActionSchema.safeParse(body.value)
      if (!action.success) return jsonResponse(requestId, { error: 'Enter a valid contact action.', requestId }, 400)
      return handleContactActionRequest(request, requestId, action.data, dependencies)
    }

    const parsed = chatMessageRequestSchema.safeParse(body.value)
    if (!parsed.success) return jsonResponse(requestId, { error: CHAT_INVALID_MESSAGE_MESSAGE, requestId }, 400)
    return handleChatMessageRequest(request, requestId, startedAt, parsed.data, dependencies)
  }
}

async function rateLimitResponse(
  request: Request,
  requestId: string,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response | undefined> {
  const limit = await dependencies.rateLimit(request)
  if (limit.allowed) return undefined
  return jsonResponse(requestId, { error: CHAT_RATE_LIMIT_MESSAGE, requestId }, 429, {
    'retry-after': String(limit.retryAfterSeconds),
  })
}

async function handleContactActionRequest(
  request: Request,
  requestId: string,
  action: ChatContactActionBody,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response> {
  if (!dependencies.handleContactAction) {
    return jsonResponse(requestId, { error: 'The contact workflow is temporarily unavailable.', requestId }, 503)
  }

  try {
    const rateLimited = await rateLimitResponse(request, requestId, dependencies)
    if (rateLimited) return rateLimited

    // Every contact action draws on the contact budget, not just the send.
    // `submit_form` triggers screening — two model calls — so leaving it on the
    // 60/hour chat bucket made the most expensive path the cheapest to drive.
    if (dependencies.contactRateLimit) {
      const contactLimit = await dependencies.contactRateLimit(request)
      if (!contactLimit.allowed) {
        return jsonResponse(
          requestId,
          { error: 'Too many contact submissions. Please try again later.', requestId },
          429,
          {
            'retry-after': String(contactLimit.retryAfterSeconds),
          },
        )
      }
    }

    // Verified here rather than inside the workflow so an unverified submission
    // never reaches Jev or the refiner.
    if (action.action === 'submit_form') {
      const screeningError = await verifyContactScreeningToken(request, requestId, action.turnstileToken, dependencies)
      if (screeningError) return screeningError
    }

    const result = await dependencies.handleContactAction({
      ...action,
      expectedHostname: new URL(request.url).hostname,
      requestId,
    } as ChatContactActionRequest)
    if (!result.ok) {
      const status = result.reason === 'invalid_context' ? 400 : 409
      const error =
        result.reason === 'invalid_context'
          ? 'This contact session has expired. Start a new chat and try again.'
          : 'This contact action is no longer valid. Review the current chat state and try again.'
      return jsonResponse(requestId, { error, requestId }, status)
    }
    return jsonResponse(requestId, { event: result.event, requestId })
  } catch {
    dependencies.logger.error('chat.contact_workflow_failed', { requestId })
    return jsonResponse(requestId, { error: 'The contact workflow is temporarily unavailable.', requestId }, 503)
  }
}

async function verifyChatToken(
  request: Request,
  requestId: string,
  token: string | undefined,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response | undefined> {
  if (!token) {
    dependencies.logger.warn('chat.turnstile_rejected', { requestId, reason: 'token_missing' })
    return jsonResponse(
      requestId,
      {
        error: CHAT_TURNSTILE_REQUIRED_MESSAGE,
        code: 'turnstile_invalid',
        requestId,
      },
      403,
    )
  }
  if (!dependencies.verifyChatTurnstile) {
    dependencies.logger.error('chat.turnstile_unavailable', { requestId, failureCategory: 'verifier_missing' })
    return jsonResponse(
      requestId,
      {
        error: 'The chat security check is temporarily unavailable.',
        code: 'turnstile_unavailable',
        requestId,
      },
      503,
    )
  }

  let verified = false
  try {
    verified = await dependencies.verifyChatTurnstile(token, new URL(request.url).hostname)
  } catch {
    dependencies.logger.error('chat.turnstile_unavailable', { requestId, failureCategory: 'siteverify_failed' })
    return jsonResponse(
      requestId,
      {
        error: 'The chat security check is temporarily unavailable.',
        code: 'turnstile_unavailable',
        requestId,
      },
      503,
    )
  }
  if (verified) return undefined

  dependencies.logger.warn('chat.turnstile_rejected', { requestId, reason: 'token_invalid' })
  return jsonResponse(
    requestId,
    {
      error: 'The security check expired or could not be verified. Complete it again and retry.',
      code: 'turnstile_invalid',
      requestId,
    },
    403,
  )
}

/**
 * Fail-closed check for the screening step, mirroring `verifyChatToken`; only
 * the log event and copy differ.
 */
async function verifyContactScreeningToken(
  request: Request,
  requestId: string,
  token: string,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response | undefined> {
  if (!dependencies.verifyContactScreeningTurnstile) {
    dependencies.logger.error('chat.contact_screening_turnstile_unavailable', {
      requestId,
      failureCategory: 'verifier_missing',
    })
    return jsonResponse(
      requestId,
      {
        error: 'The contact security check is temporarily unavailable.',
        code: 'turnstile_unavailable',
        requestId,
      },
      503,
    )
  }

  let verified = false
  try {
    verified = await dependencies.verifyContactScreeningTurnstile(token, new URL(request.url).hostname)
  } catch {
    dependencies.logger.error('chat.contact_screening_turnstile_unavailable', {
      requestId,
      failureCategory: 'siteverify_failed',
    })
    return jsonResponse(
      requestId,
      {
        error: 'The contact security check is temporarily unavailable.',
        code: 'turnstile_unavailable',
        requestId,
      },
      503,
    )
  }
  if (verified) return undefined

  dependencies.logger.warn('chat.contact_screening_turnstile_rejected', { requestId, reason: 'token_invalid' })
  return jsonResponse(
    requestId,
    {
      error: 'The security check expired or could not be verified. Complete it again to screen your request.',
      code: 'turnstile_invalid',
      requestId,
    },
    403,
  )
}

async function handleChatMessageRequest(
  request: Request,
  requestId: string,
  startedAt: number,
  parsed: ChatMessageRequest,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response> {
  const { turnstileToken, ...chatRequest } = parsed
  try {
    const rateLimited = await rateLimitResponse(request, requestId, dependencies)
    if (rateLimited) return rateLimited

    const turnstileError = await verifyChatToken(request, requestId, turnstileToken, dependencies)
    if (turnstileError) return turnstileError

    const diagnosticsMetadata = dependencies.getDiagnosticsMetadata?.(request)
    const chatInput = {
      ...chatRequest,
      ...(diagnosticsMetadata ? { diagnosticsMetadata } : {}),
    }
    const wantsStream = request.headers.get('accept')?.includes('text/event-stream') === true
    if (wantsStream && dependencies.sendStream) {
      return streamChatEvents(requestId, startedAt, dependencies, chatInput, request.signal)
    }

    const result = await dependencies.send(chatInput)
    if (result.status === 'blocked') {
      dependencies.logger.warn('chat.rejected', { requestId, reason: result.reason ?? 'uncertain' })
      return jsonResponse(requestId, { error: chatModerationRejectionMessage(result.reason), requestId }, 422)
    }
    if (result.status === 'contact_confirmation') {
      return jsonResponse(requestId, {
        event: { type: 'contact_confirmation', text: result.text, contextToken: result.contextToken },
        requestId,
      })
    }
    if (result.status === 'unavailable') {
      dependencies.logger.error('chat.moderation_unavailable', { requestId })
      return jsonResponse(requestId, { error: 'Message screening is temporarily unavailable.', requestId }, 503)
    }
    if (result.status === 'invalid_context') {
      return jsonResponse(requestId, { error: CHAT_EXPIRED_MESSAGE, requestId }, 400)
    }
    if (result.status === 'turn_limit') {
      return jsonResponse(requestId, { error: CHAT_TURN_LIMIT_MESSAGE, code: 'turn_limit', requestId }, 409)
    }

    dependencies.logger.info('chat.completed', {
      requestId,
      durationMs: Math.round(performance.now() - startedAt),
      ...(result.model ? { model: result.model } : {}),
    })
    return jsonResponse(requestId, {
      reply: result.text,
      model: result.model,
      contextToken: result.contextToken,
      ...(result.citations ? { citations: result.citations } : {}),
      ...(result.knowledgeUnavailable ? { knowledgeUnavailable: true } : {}),
      requestId,
    })
  } catch {
    dependencies.logger.error('chat.failed', { requestId, failureCategory: 'chat_processing' })
    return jsonResponse(requestId, { error: CHAT_OFFLINE_MESSAGE, requestId }, 503)
  }
}

function streamChatEvents(
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
    return jsonResponse(requestId, { error: CHAT_OFFLINE_MESSAGE, requestId }, 503)
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
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      'x-request-id': requestId,
    },
  })
}
