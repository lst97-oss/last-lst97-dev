import { useReducer } from 'react'

import { chatSessionReducer, createInitialChatSessionState } from './chat-session-state'
import type { ChatConversationViewModel, ChatSessionViewModel } from './chat-types'
import { useChatContactWorkflow } from './use-chat-contact-workflow'
import { useChatStream } from './use-chat-stream'

export function useChatSession(): ChatSessionViewModel {
  const [state, dispatch] = useReducer(chatSessionReducer, undefined, createInitialChatSessionState)
  const stream = useChatStream({ state, dispatch })
  const contact = useChatContactWorkflow({ state, dispatch })

  const conversation: ChatConversationViewModel = {
    history: state.conversation.history,
    completedTurns: state.conversation.completedTurns,
    turnLimitReached: stream.turnLimitReached,
    message: state.conversation.message,
    turnstileToken: state.conversation.turnstileToken,
    turnstileResetCount: state.conversation.turnstileResetCount,
    actions: {
      setMessage: stream.setMessage,
      sendMessage: stream.sendMessage,
      reset: stream.resetConversation,
      setTurnstileToken: stream.setTurnstileToken,
    },
  }

  return { conversation, contact, status: state.status }
}
