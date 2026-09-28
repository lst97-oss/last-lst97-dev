import { CHAT_TURN_LIMIT_MESSAGE } from '../../lib/chat-limits'
import type { ChatDiagnosticsCapture, ChatDiagnosticsOutcome } from '../observability/chat-diagnostics'
import { createChatDiagnosticsCapture } from '../observability/chat-diagnostics'
import { type AgentTurnState, createChatAgentLoop } from './agent/agent-loop'
import type { ChatStreamEvent } from './events'
import { chatModerationRejectionMessage } from './moderation-rejection'
import type { ChatServiceDependencies, PreparedTurn } from './service-contracts'
import { prepareChatTurn } from './turn-preparation'
import {
  type ChatInput,
  type ChatResponder,
  type ChatResponderInput,
  type ChatStreamingResponder,
  EMPTY_VERIFIED_REPLY,
} from './types'

const UNAVAILABLE_MESSAGE = 'Message screening is temporarily unavailable.'
const EXPIRED_MESSAGE = 'This conversation has expired. Please start a new conversation.'
const OFFLINE_MESSAGE = 'The assistant is offline right now.'

type ReplyFailure = {
  category: string
  message: string
  providerStatusCode?: number
}

function describeReplyFailure(error: unknown): ReplyFailure {
  const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : undefined
  const providerStatusCode = typeof record?.statusCode === 'number' ? record.statusCode : undefined
  const errorMessage = error instanceof Error ? error.message : ''

  if (providerStatusCode === 401 || providerStatusCode === 403) {
    return {
      category: 'provider_auth',
      message: 'The AI reply service is not authorized. Please contact the site owner.',
      providerStatusCode,
    }
  }
  if (providerStatusCode === 402) {
    return {
      category: 'provider_usage_limit',
      message: 'The AI reply service has reached its usage limit. Please try again later.',
      providerStatusCode,
    }
  }
  if (providerStatusCode === 429) {
    return {
      category: 'provider_rate_limit',
      message: 'The AI reply provider is rate-limited right now. Please try again in a moment.',
      providerStatusCode,
    }
  }
  if (providerStatusCode === 404 && errorMessage.startsWith('No endpoints found for ')) {
    return {
      category: 'provider_model_unavailable',
      message:
        'The configured AI model has no available OpenRouter provider right now. Please select another model or try again later.',
      providerStatusCode,
    }
  }
  if (providerStatusCode === 408 || providerStatusCode === 504 || /request timed out/i.test(errorMessage)) {
    return {
      category: 'provider_timeout',
      message: 'The AI reply provider took too long to respond. Please try again.',
      ...(providerStatusCode ? { providerStatusCode } : {}),
    }
  }
  if (errorMessage === 'OpenRouter returned an empty response') {
    return {
      category: 'provider_empty_response',
      message: 'The AI reply provider returned an empty response. Please try again.',
    }
  }
  if (providerStatusCode !== undefined && providerStatusCode >= 500) {
    return {
      category: 'provider_unavailable',
      message: 'The AI reply provider is temporarily unavailable. Please try again shortly.',
      providerStatusCode,
    }
  }
  if (providerStatusCode !== undefined && providerStatusCode >= 400) {
    return {
      category: 'provider_request_rejected',
      message: 'The AI reply provider rejected this request. Please try rephrasing your message.',
      providerStatusCode,
    }
  }
  return {
    category: 'provider_error',
    message:
      'The knowledge search finished, but the AI reply service could not generate a response. Please try again shortly.',
  }
}

export function createChatService(responder: ChatResponder, dependencies: ChatServiceDependencies) {
  const toolTimeoutMs = dependencies.toolTimeoutMs ?? 15_000
  const agentLoop = createChatAgentLoop(dependencies, { toolTimeoutMs, maxAgentSteps: dependencies.maxAgentSteps })

  function createDiagnosticsCapture(): ChatDiagnosticsCapture | undefined {
    if (!dependencies.diagnosticsSink) return undefined
    return createChatDiagnosticsCapture(
      {
        traceId: crypto.randomUUID(),
        message: '',
      },
      dependencies.diagnosticsSink,
    )
  }

  function finishDiagnostics(
    capture: ChatDiagnosticsCapture | undefined,
    outcome: ChatDiagnosticsOutcome,
    response?: string,
  ): void {
    capture?.finish({ outcome, ...(response !== undefined ? { response } : {}) })
  }

  function prepareTurn(input: ChatInput, capture?: ChatDiagnosticsCapture): Promise<PreparedTurn> {
    return prepareChatTurn(input, dependencies, agentLoop.availableToolNames(), capture)
  }

  function responderInput(
    turn: Extract<PreparedTurn, { ok: true }>,
    state: AgentTurnState,
    diagnostics?: ChatDiagnosticsCapture,
  ): ChatResponderInput {
    const extraContext = state.toolSummaries.length > 0 ? state.toolSummaries.join('\n') : undefined
    return {
      message: turn.message,
      currentDateTimeUtc: turn.currentDateTimeUtc,
      history: turn.verifiedHistory,
      ...(state.knowledgeUnavailable
        ? { evidence: state.knowledgeEvidence ?? [] }
        : state.knowledgeEvidence !== undefined
          ? { evidence: state.knowledgeEvidence }
          : {}),
      ...(state.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}),
      ...(state.toolRoutingUnavailable ? { toolRoutingUnavailable: true as const } : {}),
      ...(extraContext ? { extraContext } : {}),
      ...(state.catalogueFallback ? { catalogueFallback: state.catalogueFallback } : {}),
      ...(state.ownedProjectCount ? { ownedProjectCount: state.ownedProjectCount } : {}),
      onModelCall: diagnostics?.addModelCall,
    }
  }

  return {
    async send(input: ChatInput) {
      const diagnostics = createDiagnosticsCapture()
      let turn: PreparedTurn
      try {
        turn = await prepareTurn(input, diagnostics)
      } catch (error) {
        finishDiagnostics(diagnostics, 'unavailable', OFFLINE_MESSAGE)
        throw error
      }
      if (!turn.ok) {
        if (turn.status === 'contact_confirmation') {
          finishDiagnostics(diagnostics, 'complete', turn.text)
          return { status: 'contact_confirmation' as const, text: turn.text, contextToken: turn.contextToken }
        }
        const response =
          turn.status === 'blocked'
            ? chatModerationRejectionMessage(turn.reason)
            : turn.status === 'turn_limit'
              ? CHAT_TURN_LIMIT_MESSAGE
              : turn.status === 'unavailable'
                ? UNAVAILABLE_MESSAGE
                : EXPIRED_MESSAGE
        finishDiagnostics(diagnostics, turn.status === 'blocked' ? 'blocked' : turn.status, response)
        return turn.status === 'blocked' ? { status: 'blocked' as const, reason: turn.reason } : { status: turn.status }
      }
      try {
        const agent = await agentLoop.runAgentLoop(
          turn.message,
          turn.verifiedHistory,
          turn.topicAnchors,
          turn.projectListState,
          turn.currentDateTimeUtc,
          turn.today,
          turn.toolDecisions,
          diagnostics,
        )
        const reply = await responder.respond(responderInput(turn, agent, diagnostics))
        const replyText = reply.text.trim()
        const finalReply =
          agent.catalogueFallback && (!replyText || replyText === EMPTY_VERIFIED_REPLY)
            ? { ...reply, text: agent.catalogueFallback }
            : reply
        const contextToken = await dependencies.contextSigner.sign(
          agentLoop.buildNextConversationContext(turn, agent, finalReply.text),
        )
        const knowledgeEnabled = dependencies.knowledgeEnabled === true
        finishDiagnostics(diagnostics, 'complete', finalReply.text)
        return {
          status: 'replied' as const,
          ...finalReply,
          contextToken,
          ...(knowledgeEnabled
            ? {
                citations: agent.citations,
                ...(agent.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}),
              }
            : {}),
        }
      } catch (error) {
        finishDiagnostics(diagnostics, 'provider_error')
        throw error
      }
    },

    async *sendStream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
      if (signal?.aborted) return
      const diagnostics = createDiagnosticsCapture()
      yield { type: 'status', status: 'thinking' }

      let turn: PreparedTurn
      try {
        turn = await prepareTurn(input, diagnostics)
      } catch {
        finishDiagnostics(diagnostics, 'unavailable', OFFLINE_MESSAGE)
        yield { type: 'error', message: OFFLINE_MESSAGE }
        return
      }
      if (!turn.ok) {
        if (turn.status === 'contact_confirmation') {
          finishDiagnostics(diagnostics, 'complete', turn.text)
          yield { type: 'contact_confirmation', text: turn.text, contextToken: turn.contextToken }
          return
        }
        const response =
          turn.status === 'turn_limit'
            ? CHAT_TURN_LIMIT_MESSAGE
            : turn.status === 'blocked'
              ? chatModerationRejectionMessage(turn.reason)
              : turn.status === 'unavailable'
                ? UNAVAILABLE_MESSAGE
                : EXPIRED_MESSAGE
        finishDiagnostics(diagnostics, turn.status === 'blocked' ? 'blocked' : turn.status, response)
        if (turn.status === 'turn_limit') {
          yield { type: 'error', code: 'turn_limit', message: CHAT_TURN_LIMIT_MESSAGE }
          return
        }
        yield {
          type: 'error',
          message:
            turn.status === 'blocked'
              ? chatModerationRejectionMessage(turn.reason)
              : turn.status === 'unavailable'
                ? UNAVAILABLE_MESSAGE
                : EXPIRED_MESSAGE,
        }
        return
      }
      if (signal?.aborted) {
        finishDiagnostics(diagnostics, 'aborted')
        return
      }

      const streaming = responder as Partial<ChatStreamingResponder>
      if (!streaming.stream) {
        finishDiagnostics(diagnostics, 'provider_error', OFFLINE_MESSAGE)
        yield { type: 'error', message: OFFLINE_MESSAGE }
        return
      }

      const agentStream = agentLoop.runAgentLoopEvents(
        turn.message,
        turn.verifiedHistory,
        turn.topicAnchors,
        turn.projectListState,
        turn.currentDateTimeUtc,
        turn.today,
        turn.toolDecisions,
        diagnostics,
      )
      let agent: AgentTurnState | undefined
      for (;;) {
        const step = await agentStream.next()
        if (step.done) {
          agent = step.value
          break
        }
        yield step.value
      }
      const state = agent ?? {
        evidence: '',
        toolOutputs: '',
        toolSummaries: [],
        toolObservations: [],
        usedTools: new Set<string>(),
        citations: [],
        knowledgeUnavailable: false,
        toolRoutingUnavailable: false,
        projectSourceIds: [],
        shortlistStarted: false,
        trackProjectSources: false,
      }
      if (signal?.aborted) {
        finishDiagnostics(diagnostics, 'aborted')
        return
      }
      yield { type: 'status', status: 'composing_reply' }

      let fullText = ''
      let model: string | undefined
      try {
        for await (const chunk of streaming.stream(responderInput(turn, state, diagnostics), signal)) {
          if ('done' in chunk) {
            fullText = chunk.text
            model = chunk.model
            break
          }
          fullText += chunk.delta
          model ??= chunk.model
          if (chunk.delta) yield { type: 'token', delta: chunk.delta }
        }
      } catch (error) {
        const failure = describeReplyFailure(error)
        dependencies.logger?.error('chat.reply_generation.failed', {
          failureCategory: failure.category,
          ...(failure.providerStatusCode ? { providerStatusCode: failure.providerStatusCode } : {}),
        })
        finishDiagnostics(diagnostics, 'provider_error', fullText || failure.message)
        yield { type: 'error', message: failure.message }
        return
      }

      if (signal?.aborted) {
        finishDiagnostics(diagnostics, 'aborted', fullText)
        return
      }
      const citations = state.citations
      if (citations.length > 0) {
        yield { type: 'citations', citations }
      }
      if (state.knowledgeUnavailable) {
        yield { type: 'knowledge_note' }
      }
      const contextToken = await dependencies.contextSigner.sign(
        agentLoop.buildNextConversationContext(turn, state, fullText),
      )
      finishDiagnostics(diagnostics, 'complete', fullText)
      yield { type: 'done', contextToken, ...(model ? { model } : {}) }
    },
  }
}

export type ChatService = ReturnType<typeof createChatService>
