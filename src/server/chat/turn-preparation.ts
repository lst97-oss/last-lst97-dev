import { MAX_CHAT_CONTEXT_MESSAGES } from '../../lib/chat-limits'
import type { ChatDiagnosticsCapture } from '../observability/chat-diagnostics'
import type { ChatServiceDependencies, PreparedTurn } from './service-contracts'
import type { AgentToolName } from './tools/agent-tools'
import type { ChatInput, ChatProjectListState, ChatTopicAnchor } from './types'

const MAX_MESSAGE_LENGTH = 2_000
const CONTACT_CONFIRMATION_TEXT =
  'It sounds like you want to send a message or report to Nelson by email. Starting a contact session clears this conversation, and none of its earlier messages will be included in your email. Would you like to continue?'

function diagnosticsObserver(capture: ChatDiagnosticsCapture | undefined) {
  return capture
    ? {
        onModelCall: capture.addModelCall,
        onJevDecision: capture.addJevDecision,
      }
    : undefined
}

function currentClock(today?: string) {
  const now = new Date()
  const currentDateTimeUtc = today ? `${today}T00:00:00.000Z` : now.toISOString()
  return { currentDateTimeUtc, today: today ?? currentDateTimeUtc.slice(0, 10) }
}

export async function prepareChatTurn(
  input: ChatInput,
  dependencies: ChatServiceDependencies,
  availableTools: AgentToolName[],
  capture?: ChatDiagnosticsCapture,
): Promise<PreparedTurn> {
  const clock = currentClock(dependencies.today)
  const message = input.message.trim().slice(0, MAX_MESSAGE_LENGTH)
  if (!message) throw new Error('Chat message is required')

  const conversation = await dependencies.contextSigner.verify(input.contextToken)
  if (input.contextToken && !conversation) return { ok: false, status: 'invalid_context' }

  const workflow = conversation?.workflow ?? { mode: 'normal' as const, phase: 'conversation' as const }
  if (workflow.mode !== 'normal' || workflow.phase !== 'conversation') return { ok: false, status: 'invalid_context' }
  if ((conversation?.messages.length ?? 0) >= MAX_CHAT_CONTEXT_MESSAGES) return { ok: false, status: 'turn_limit' }

  const verifiedHistory = (conversation?.messages ?? []).slice(-MAX_CHAT_CONTEXT_MESSAGES).map((item) => ({
    role: item.role,
    content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
  }))
  const topicAnchors: ChatTopicAnchor[] = conversation?.topicAnchors ?? []
  const projectListState: ChatProjectListState = conversation?.projectListState ?? {
    clarificationAsked: false,
    shownProjectIds: [],
  }
  const moderation = await dependencies.moderation.checkChat(
    {
      message,
      context: verifiedHistory,
      topicAnchors,
      projectListState,
      availableTools,
      currentDateTimeUtc: clock.currentDateTimeUtc,
    },
    diagnosticsObserver(capture),
  )

  if ('unavailable' in moderation) return { ok: false, status: 'unavailable' }
  if (!moderation.allowed) return { ok: false, status: 'blocked', reason: moderation.reason ?? 'uncertain' }

  if (moderation.contactIntent === 'contact') {
    const contextToken = await dependencies.contextSigner.sign({
      messages: verifiedHistory,
      topicAnchors,
      projectListState,
      workflow: { mode: 'normal', phase: 'contact_confirmation' },
    })
    return { ok: false, status: 'contact_confirmation', text: CONTACT_CONFIRMATION_TEXT, contextToken }
  }

  capture?.setContext(message, verifiedHistory)
  capture?.setMetadata(input.diagnosticsMetadata)

  return {
    ok: true,
    message,
    verifiedHistory,
    topicAnchors,
    projectListState,
    ...clock,
    toolDecisions: moderation.toolDecisions,
  }
}
