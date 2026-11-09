import { HttpHeader, HttpStatus } from '@lst97-oss/last-httprism'
import {
  CHAT_BOT_BLOCKED_MESSAGE,
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
import type { BotVerification } from '../security/botid'
import type { ChatContactActionBody, ChatContactActionRequest, ChatMessageRequest, ChatStreamEvent } from './events'
import { chatContactActionSchema, chatMessageRequestSchema } from './events'
import { chatModerationRejectionMessage } from './moderation-rejection'
import { streamChatEvents } from './stream-response'

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
  checkBotRequest?(): Promise<BotVerification>
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
        body.reason === 'too_large' ? HttpStatus.CONTENT_TOO_LARGE.code : HttpStatus.BAD_REQUEST.code,
      )
    }

    const bodyRecord =
      typeof body.value === 'object' && body.value !== null && !Array.isArray(body.value)
        ? (body.value as Record<string, unknown>)
        : undefined
    if (bodyRecord && Object.hasOwn(bodyRecord, 'action')) {
      const action = chatContactActionSchema.safeParse(body.value)
      if (!action.success)
        return jsonResponse(
          requestId,
          { error: 'Enter a valid contact action.', requestId },
          HttpStatus.BAD_REQUEST.code,
        )
      return handleContactActionRequest(request, requestId, action.data, dependencies)
    }

    const parsed = chatMessageRequestSchema.safeParse(body.value)
    if (!parsed.success)
      return jsonResponse(requestId, { error: CHAT_INVALID_MESSAGE_MESSAGE, requestId }, HttpStatus.BAD_REQUEST.code)
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
  return jsonResponse(requestId, { error: CHAT_RATE_LIMIT_MESSAGE, requestId }, HttpStatus.TOO_MANY_REQUESTS.code, {
    [HttpHeader.RETRY_AFTER]: String(limit.retryAfterSeconds),
  })
}

/**
 * Vercel BotID gate. Runs after the rate limit — a local check is cheaper
 * than the BotID call — and before Turnstile, so automated traffic never
 * reaches the siteverify round trip or the model.
 */
async function botRejectedResponse(
  requestId: string,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response | undefined> {
  if (!dependencies.checkBotRequest) return undefined
  const verification = await dependencies.checkBotRequest()
  if (!verification.isBot) return undefined
  return jsonResponse(
    requestId,
    { error: CHAT_BOT_BLOCKED_MESSAGE, code: 'bot_detected', requestId },
    HttpStatus.FORBIDDEN.code,
  )
}

async function handleContactActionRequest(
  request: Request,
  requestId: string,
  action: ChatContactActionBody,
  dependencies: ChatPostHandlerDependencies,
): Promise<Response> {
  if (!dependencies.handleContactAction) {
    return jsonResponse(
      requestId,
      { error: 'The contact workflow is temporarily unavailable.', requestId },
      HttpStatus.SERVICE_UNAVAILABLE.code,
    )
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
          HttpStatus.TOO_MANY_REQUESTS.code,
          {
            [HttpHeader.RETRY_AFTER]: String(contactLimit.retryAfterSeconds),
          },
        )
      }
    }

    const botRejected = await botRejectedResponse(requestId, dependencies)
    if (botRejected) return botRejected

    // Verified here rather than inside the workflow so an unverified submission
    // never reaches the decision screen or the refiner.
    if (action.action === 'submit_form') {
      const screeningError = await verifyTurnstileToken(
        request,
        requestId,
        action.turnstileToken,
        {
          verify: dependencies.verifyContactScreeningTurnstile,
          logBase: 'chat.contact_screening_turnstile',
          unavailableMessage: 'The contact security check is temporarily unavailable.',
          rejectedMessage:
            'The security check expired or could not be verified. Complete it again to screen your request.',
        },
        dependencies.logger,
      )
      if (screeningError) return screeningError
    }

    const result = await dependencies.handleContactAction({
      ...action,
      expectedHostname: new URL(request.url).hostname,
      requestId,
    } as ChatContactActionRequest)
    if (!result.ok) {
      const status = result.reason === 'invalid_context' ? HttpStatus.BAD_REQUEST.code : HttpStatus.CONFLICT.code
      const error =
        result.reason === 'invalid_context'
          ? 'This contact session has expired. Start a new chat and try again.'
          : 'This contact action is no longer valid. Review the current chat state and try again.'
      return jsonResponse(requestId, { error, requestId }, status)
    }
    return jsonResponse(requestId, { event: result.event, requestId })
  } catch {
    dependencies.logger.error('chat.contact_workflow_failed', { requestId })
    return jsonResponse(
      requestId,
      { error: 'The contact workflow is temporarily unavailable.', requestId },
      HttpStatus.SERVICE_UNAVAILABLE.code,
    )
  }
}

type TurnstileVerify = (token: string, expectedHostname: string) => Promise<boolean>

interface TurnstileGate {
  verify: TurnstileVerify | undefined
  // Log events are `${logBase}_rejected` and `${logBase}_unavailable`.
  logBase: 'chat.turnstile' | 'chat.contact_screening_turnstile'
  unavailableMessage: string
  rejectedMessage: string
  // Only the chat message gate has a token-required copy; screening sends an empty token to siteverify instead.
  missingTokenMessage?: string
}

/**
 * Fail-closed Turnstile check for chat messages and contact screening. A missing verifier, a failed
 * siteverify call and an invalid token all refuse the request; the gates differ only in log base and copy.
 */
async function verifyTurnstileToken(
  request: Request,
  requestId: string,
  token: string,
  gate: TurnstileGate,
  logger: Logger,
): Promise<Response | undefined> {
  const unavailable = () =>
    jsonResponse(
      requestId,
      { error: gate.unavailableMessage, code: 'turnstile_unavailable', requestId },
      HttpStatus.SERVICE_UNAVAILABLE.code,
    )
  if (!token && gate.missingTokenMessage) {
    logger.warn(`${gate.logBase}_rejected`, { requestId, reason: 'token_missing' })
    return jsonResponse(
      requestId,
      { error: gate.missingTokenMessage, code: 'turnstile_invalid', requestId },
      HttpStatus.FORBIDDEN.code,
    )
  }
  if (!gate.verify) {
    logger.error(`${gate.logBase}_unavailable`, { requestId, failureCategory: 'verifier_missing' })
    return unavailable()
  }

  let verified = false
  try {
    verified = await gate.verify(token, new URL(request.url).hostname)
  } catch {
    logger.error(`${gate.logBase}_unavailable`, { requestId, failureCategory: 'siteverify_failed' })
    return unavailable()
  }
  if (verified) return undefined

  logger.warn(`${gate.logBase}_rejected`, { requestId, reason: 'token_invalid' })
  return jsonResponse(
    requestId,
    { error: gate.rejectedMessage, code: 'turnstile_invalid', requestId },
    HttpStatus.FORBIDDEN.code,
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

    const botRejected = await botRejectedResponse(requestId, dependencies)
    if (botRejected) return botRejected

    const turnstileError = await verifyTurnstileToken(
      request,
      requestId,
      turnstileToken ?? '',
      {
        verify: dependencies.verifyChatTurnstile,
        logBase: 'chat.turnstile',
        unavailableMessage: 'The chat security check is temporarily unavailable.',
        rejectedMessage: 'The security check expired or could not be verified. Complete it again and retry.',
        missingTokenMessage: CHAT_TURNSTILE_REQUIRED_MESSAGE,
      },
      dependencies.logger,
    )
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
      return jsonResponse(
        requestId,
        { error: chatModerationRejectionMessage(result.reason), requestId },
        HttpStatus.UNPROCESSABLE_CONTENT.code,
      )
    }
    if (result.status === 'contact_confirmation') {
      return jsonResponse(requestId, {
        event: { type: 'contact_confirmation', text: result.text, contextToken: result.contextToken },
        requestId,
      })
    }
    if (result.status === 'unavailable') {
      dependencies.logger.error('chat.moderation_unavailable', { requestId })
      return jsonResponse(
        requestId,
        { error: 'Message screening is temporarily unavailable.', requestId },
        HttpStatus.SERVICE_UNAVAILABLE.code,
      )
    }
    if (result.status === 'invalid_context') {
      return jsonResponse(requestId, { error: CHAT_EXPIRED_MESSAGE, requestId }, HttpStatus.BAD_REQUEST.code)
    }
    if (result.status === 'turn_limit') {
      return jsonResponse(
        requestId,
        { error: CHAT_TURN_LIMIT_MESSAGE, code: 'turn_limit', requestId },
        HttpStatus.CONFLICT.code,
      )
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
    return jsonResponse(requestId, { error: CHAT_OFFLINE_MESSAGE, requestId }, HttpStatus.SERVICE_UNAVAILABLE.code)
  }
}
