import { type Dispatch, type FormEvent, useEffect, useRef } from 'react'

import { CHAT_OFFLINE_MESSAGE, isChatTurnLimitReached, safeChatFailureMessage } from '../../../lib/chat-limits'
import type { ChatJsonResponse } from '../../../server/chat/events'
import {
  chatJsonResponseSchema,
  chatStatusLabel,
  parseChatStreamFrame,
  splitEventFrames,
} from '../../../server/chat/events'
import type { ChatSessionAction, ChatSessionState } from './chat-session-state'
import { CHAT_WELCOME_MESSAGE } from './chat-session-state'

interface UseChatStreamOptions {
  state: ChatSessionState
  dispatch: Dispatch<ChatSessionAction>
}

export function useChatStream({ state, dispatch }: UseChatStreamOptions) {
  const abortRef = useRef<AbortController | null>(null)
  const turnLimitReached = isChatTurnLimitReached(state.conversation.completedTurns)

  useEffect(() => () => abortRef.current?.abort(), [])

  function resetConversation() {
    dispatch({ type: 'conversation/reset', message: CHAT_WELCOME_MESSAGE })
  }

  function failDraft(message: string) {
    if (message.includes('expired')) {
      dispatch({
        type: 'conversation/reset',
        message: 'That conversation expired. Start a fresh conversation and I’ll be ready.',
      })
      return
    }
    dispatch({ type: 'status/set-error', error: message })
  }

  async function readStream(response: Response) {
    const reader = response.body?.getReader()
    if (!reader) throw new Error(CHAT_OFFLINE_MESSAGE)
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { frames, rest } = splitEventFrames(buffer)
        buffer = rest
        for (const frame of frames) {
          const event = parseChatStreamFrame(frame)
          if (!event) continue
          switch (event.type) {
            case 'status': {
              const label = chatStatusLabel(event.status)
              if (label) dispatch({ type: 'status/set-tool', toolStatus: label })
              break
            }
            case 'token':
              dispatch({ type: 'conversation/stream-token', delta: event.delta })
              break
            case 'tool_start':
              dispatch({ type: 'status/set-tool', toolStatus: event.label })
              break
            case 'tool_result':
              // Keep the last tool label through consecutive tool calls.
              break
            case 'citations':
              dispatch({ type: 'conversation/stream-citations', citations: event.citations })
              break
            case 'knowledge_note':
              dispatch({ type: 'conversation/knowledge-unavailable' })
              break
            case 'done':
              dispatch({ type: 'conversation/context-token', contextToken: event.contextToken })
              dispatch({ type: 'conversation/turn-completed' })
              break
            case 'contact_confirmation':
              dispatch({ type: 'contact/event', event })
              dispatch({ type: 'status/set-tool', toolStatus: null })
              break
            case 'error':
              dispatch({ type: 'conversation/remove-empty-draft' })
              if (event.code === 'turn_limit') dispatch({ type: 'conversation/turn-limit-reached' })
              failDraft(event.message)
              break
            default:
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextMessage = state.conversation.message.trim()
    if (!nextMessage || state.status.pending || turnLimitReached) return
    if (!state.conversation.turnstileToken) {
      dispatch({ type: 'status/set-error', error: 'Complete the security check before sending your message.' })
      return
    }
    const submittedTurnstileToken = state.conversation.turnstileToken

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch({ type: 'conversation/message-started', message: nextMessage })

    try {
      const response = await fetch('/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({
          message: nextMessage,
          contextToken: state.conversation.contextToken,
          turnstileToken: submittedTurnstileToken,
        }),
        signal: controller.signal,
      })
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('text/event-stream')) {
        dispatch({ type: 'conversation/stream-started' })
        await readStream(response)
        return
      }
      const parsed = chatJsonResponseSchema.safeParse(await response.json().catch(() => null))
      const data: ChatJsonResponse | null = parsed.success ? parsed.data : null
      if (!response.ok || !data?.reply) {
        if (data?.code === 'turn_limit') dispatch({ type: 'conversation/turn-limit-reached' })
        if (data?.code === 'turnstile_invalid' || data?.code === 'turnstile_unavailable' || response.status === 429) {
          dispatch({ type: 'conversation/restore-submission', message: nextMessage })
        }
        if (response.status === 400 && data?.error?.includes('expired')) {
          dispatch({
            type: 'conversation/reset',
            message: 'That conversation expired. Start a fresh conversation and I’ll be ready.',
          })
        }
        throw new Error(data?.error ?? CHAT_OFFLINE_MESSAGE)
      }
      dispatch({
        type: 'conversation/reply',
        reply: data.reply,
        contextToken: data.contextToken,
        citations: data.citations,
        knowledgeUnavailable: data.knowledgeUnavailable,
      })
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      dispatch({ type: 'conversation/remove-empty-draft' })
      dispatch({ type: 'status/set-error', error: safeChatFailureMessage(requestError) })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        dispatch({ type: 'conversation/reset-turnstile' })
        dispatch({ type: 'status/set-pending', pending: false })
        dispatch({ type: 'status/set-tool', toolStatus: null })
      }
    }
  }

  return {
    sendMessage,
    setMessage: (message: string) => dispatch({ type: 'conversation/set-message', message }),
    resetConversation,
    turnLimitReached,
    setTurnstileToken: (token: string | null) => dispatch({ type: 'conversation/set-turnstile-token', token }),
  }
}
