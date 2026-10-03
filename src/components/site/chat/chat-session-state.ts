import {
  CHAT_CONTACT_TEMPLATES,
  type ChatContactField,
  type ChatContactFieldValues,
  createEmptyChatContactFields,
} from '../../../lib/chat-contact'
import { MAX_CHAT_TURNS, nextCompletedChatTurnCount } from '../../../lib/chat-limits'
import type { ChatContactEvent } from '../../../server/chat/events'
import type { PublicCitation } from '../../../server/knowledge/retrieve'
import type { ChatContactFieldErrors, ChatContactReview, ChatContactUiState, ChatViewMessage } from './chat-types'

export const CHAT_WELCOME_MESSAGE =
  'I’m Zita, Nelson’s portfolio assistant. Ask about his background, projects, open-source contributions, goals, or coding activity, or what services he offers. I can search verified information from this site and help you start an email, bug report, feature request, quotation, or support plan request to him; I’m not a general-purpose assistant.'

export interface ChatSessionState {
  conversation: {
    history: ChatViewMessage[]
    completedTurns: number
    message: string
    contextToken?: string
    turnstileToken: string | null
    turnstileResetCount: number
  }
  contact: {
    state: ChatContactUiState | null
    draft: ChatContactFieldValues
    fieldErrors: ChatContactFieldErrors
    review: ChatContactReview | null
    turnstileToken: string | null
    screeningTurnstileToken: string | null
    screeningTurnstileResetCount: number
    turnstileResetCount: number
    discardConfirmation: boolean
  }
  status: {
    pending: boolean
    toolStatus: string | null
    error: string
  }
}

export type ChatSessionAction =
  | { type: 'conversation/reset'; message: string; contextToken?: string }
  | { type: 'conversation/set-message'; message: string }
  | { type: 'conversation/message-started'; message: string }
  | { type: 'conversation/stream-started' }
  | { type: 'conversation/stream-token'; delta: string }
  | { type: 'conversation/stream-citations'; citations: PublicCitation[] }
  | { type: 'conversation/knowledge-unavailable' }
  | {
      type: 'conversation/reply'
      reply: string
      contextToken?: string
      citations?: PublicCitation[]
      knowledgeUnavailable?: boolean
    }
  | { type: 'conversation/context-token'; contextToken?: string }
  | { type: 'conversation/turn-completed' }
  | { type: 'conversation/turn-limit-reached' }
  | { type: 'conversation/restore-submission'; message: string }
  | { type: 'conversation/remove-empty-draft' }
  | { type: 'conversation/set-turnstile-token'; token: string | null }
  | { type: 'conversation/reset-turnstile' }
  | { type: 'contact/event'; event: ChatContactEvent }
  | { type: 'contact/set-field-errors'; fieldErrors: ChatContactFieldErrors }
  | { type: 'contact/clear-field-error'; field: ChatContactField }
  | { type: 'contact/set-turnstile-token'; token: string | null }
  | { type: 'contact/set-screening-turnstile-token'; token: string | null }
  | { type: 'contact/set-discard-confirmation'; confirmed: boolean }
  | { type: 'status/set-pending'; pending: boolean }
  | { type: 'status/set-tool'; toolStatus: string | null }
  | { type: 'status/set-error'; error: string }
  | { type: 'status/clear-error' }

const emptyFieldErrors = (): ChatContactFieldErrors => ({ missingFields: [], invalidFields: [] })

export function createInitialChatSessionState(): ChatSessionState {
  return {
    conversation: {
      history: [{ role: 'assistant', content: CHAT_WELCOME_MESSAGE }],
      completedTurns: 0,
      message: '',
      contextToken: undefined,
      turnstileToken: null,
      turnstileResetCount: 0,
    },
    contact: {
      state: null,
      draft: {},
      fieldErrors: emptyFieldErrors(),
      review: null,
      turnstileToken: null,
      screeningTurnstileToken: null,
      screeningTurnstileResetCount: 0,
      turnstileResetCount: 0,
      discardConfirmation: false,
    },
    status: { pending: false, toolStatus: null, error: '' },
  }
}

function resetSession(state: ChatSessionState, message: string, contextToken?: string): ChatSessionState {
  return {
    conversation: {
      ...state.conversation,
      history: [{ role: 'assistant', content: message }],
      completedTurns: 0,
      message: '',
      contextToken,
      turnstileToken: null,
      turnstileResetCount: state.conversation.turnstileResetCount + 1,
    },
    contact: {
      ...state.contact,
      state: null,
      draft: {},
      fieldErrors: emptyFieldErrors(),
      review: null,
      turnstileToken: null,
      screeningTurnstileToken: null,
      screeningTurnstileResetCount: state.contact.screeningTurnstileResetCount + 1,
      discardConfirmation: false,
    },
    status: { ...state.status, toolStatus: null, error: '' },
  }
}

function appendAssistantMessage(state: ChatSessionState, content: string): ChatSessionState {
  return {
    ...state,
    conversation: {
      ...state.conversation,
      history: [...state.conversation.history, { role: 'assistant', content }],
    },
  }
}

function updateLastMessage(
  state: ChatSessionState,
  update: (message: ChatViewMessage) => ChatViewMessage,
): ChatSessionState {
  const lastIndex = state.conversation.history.length - 1
  if (lastIndex < 0) return state

  const history = [...state.conversation.history]
  history[lastIndex] = update(history[lastIndex]!)
  return { ...state, conversation: { ...state.conversation, history } }
}

function applyContactEvent(state: ChatSessionState, event: ChatContactEvent): ChatSessionState {
  if (event.type === 'contact_discarded' || event.type === 'contact_new_chat') {
    return resetSession(state, event.text, event.contextToken)
  }

  let next: ChatSessionState = {
    ...state,
    conversation:
      'contextToken' in event && event.contextToken
        ? { ...state.conversation, contextToken: event.contextToken }
        : state.conversation,
    status: { ...state.status, error: '' },
  }

  switch (event.type) {
    case 'contact_confirmation': {
      const history = [...next.conversation.history]
      if (history.at(-1)?.role === 'assistant' && !history.at(-1)?.content) history.pop()
      if (history.at(-1)?.role === 'user') history.pop()
      history.push({ role: 'assistant', content: event.text })
      next = {
        ...next,
        conversation: { ...next.conversation, history },
        contact: { ...next.contact, state: { phase: 'confirmation' }, draft: {}, review: null },
      }
      break
    }
    case 'contact_declined':
      next = {
        ...next,
        contact: { ...next.contact, state: null, draft: {}, review: null },
      }
      next = appendAssistantMessage(next, event.text)
      break
    case 'contact_started':
      next = {
        ...next,
        conversation: {
          ...next.conversation,
          history: [{ role: 'assistant', content: event.text }],
          completedTurns: 0,
        },
        contact: {
          ...next.contact,
          state: { phase: 'template_selection' },
          draft: {},
          fieldErrors: emptyFieldErrors(),
          review: null,
          discardConfirmation: false,
        },
      }
      break
    case 'contact_template_selected':
      next = {
        ...next,
        contact: {
          ...next.contact,
          state: { phase: 'filling', template: event.template },
          draft: createEmptyChatContactFields(event.template),
          fieldErrors: emptyFieldErrors(),
        },
      }
      next = appendAssistantMessage(
        next,
        `${CHAT_CONTACT_TEMPLATES[event.template].label} selected. This template stays locked for this contact session.`,
      )
      break
    case 'contact_form_incomplete':
      next = {
        ...next,
        contact: {
          ...next.contact,
          fieldErrors: { missingFields: event.missingFields, invalidFields: event.invalidFields },
        },
      }
      break
    case 'contact_out_of_scope':
    case 'contact_blocked':
    case 'contact_unavailable':
    case 'contact_send_error':
      next = appendAssistantMessage(next, event.text)
      if (event.type === 'contact_send_error') {
        next = {
          ...next,
          contact: {
            ...next.contact,
            turnstileToken: null,
            turnstileResetCount: next.contact.turnstileResetCount + 1,
          },
        }
      }
      break
    case 'contact_review':
      next = {
        ...next,
        contact: {
          ...next.contact,
          review: event,
          state: { phase: 'review', template: event.template },
          fieldErrors: emptyFieldErrors(),
          // Screening tokens are single-use: spent here so the widget re-arms
          // for a resubmitted edit rather than reusing a spent token.
          screeningTurnstileToken: null,
          screeningTurnstileResetCount: next.contact.screeningTurnstileResetCount + 1,
        },
      }
      break
    case 'contact_editing': {
      const originalFields = next.contact.review?.originalSubmission.fields as ChatContactFieldValues | undefined
      next = {
        ...next,
        contact: {
          ...next.contact,
          draft: originalFields ?? createEmptyChatContactFields(event.template),
          state: { phase: 'filling', template: event.template },
          fieldErrors: emptyFieldErrors(),
          turnstileToken: null,
          screeningTurnstileToken: null,
        },
      }
      break
    }
    case 'contact_delivery':
      next = {
        ...next,
        contact: { ...next.contact, state: { phase: 'delivered', template: event.template } },
      }
      next = appendAssistantMessage(
        next,
        event.receiptStatus === 'sent'
          ? 'Your email has been sent. A short receipt was sent to your reply address.'
          : 'Your email has been sent. The owner notification was delivered, but the receipt email could not be sent.',
      )
      break
    default:
      break
  }

  return next
}

export function chatSessionReducer(state: ChatSessionState, action: ChatSessionAction): ChatSessionState {
  switch (action.type) {
    case 'conversation/reset':
      return resetSession(state, action.message, action.contextToken)
    case 'conversation/set-message':
      return { ...state, conversation: { ...state.conversation, message: action.message } }
    case 'conversation/message-started':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          history: [...state.conversation.history, { role: 'user', content: action.message }],
        },
        status: { ...state.status, pending: true, error: '', toolStatus: null },
      }
    case 'conversation/stream-started':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          message: '',
          history: [...state.conversation.history, { role: 'assistant', content: '' }],
        },
      }
    case 'conversation/stream-token':
      return updateLastMessage(state, (message) => ({ ...message, content: `${message.content}${action.delta}` }))
    case 'conversation/stream-citations':
      return updateLastMessage(state, (message) => ({ ...message, citations: action.citations }))
    case 'conversation/knowledge-unavailable':
      return updateLastMessage(state, (message) => ({ ...message, knowledgeUnavailable: true }))
    case 'conversation/reply':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          message: '',
          history: [
            ...state.conversation.history,
            {
              role: 'assistant',
              content: action.reply,
              ...(action.citations ? { citations: action.citations } : {}),
              ...(action.knowledgeUnavailable ? { knowledgeUnavailable: true } : {}),
            },
          ],
          contextToken: action.contextToken,
          completedTurns: nextCompletedChatTurnCount(state.conversation.completedTurns),
        },
      }
    case 'conversation/context-token':
      return { ...state, conversation: { ...state.conversation, contextToken: action.contextToken } }
    case 'conversation/turn-completed':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          completedTurns: nextCompletedChatTurnCount(state.conversation.completedTurns),
        },
        status: { ...state.status, toolStatus: null },
      }
    case 'conversation/turn-limit-reached':
      return { ...state, conversation: { ...state.conversation, completedTurns: MAX_CHAT_TURNS } }
    case 'conversation/restore-submission': {
      const last = state.conversation.history.at(-1)
      return {
        ...state,
        conversation: {
          ...state.conversation,
          message: action.message,
          history:
            last?.role === 'user' && last.content === action.message
              ? state.conversation.history.slice(0, -1)
              : state.conversation.history,
        },
      }
    }
    case 'conversation/remove-empty-draft': {
      const last = state.conversation.history.at(-1)
      if (!last || last.role !== 'assistant' || last.content || last.citations || last.knowledgeUnavailable)
        return state
      return { ...state, conversation: { ...state.conversation, history: state.conversation.history.slice(0, -1) } }
    }
    case 'conversation/set-turnstile-token':
      return { ...state, conversation: { ...state.conversation, turnstileToken: action.token } }
    case 'conversation/reset-turnstile':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          turnstileToken: null,
          turnstileResetCount: state.conversation.turnstileResetCount + 1,
        },
      }
    case 'contact/event':
      return applyContactEvent(state, action.event)
    case 'contact/set-field-errors':
      return { ...state, contact: { ...state.contact, fieldErrors: action.fieldErrors } }
    case 'contact/clear-field-error':
      return {
        ...state,
        contact: {
          ...state.contact,
          fieldErrors: {
            missingFields: state.contact.fieldErrors.missingFields.filter((field) => field !== action.field),
            invalidFields: state.contact.fieldErrors.invalidFields.filter((field) => field !== action.field),
          },
        },
      }
    case 'contact/set-turnstile-token':
      return { ...state, contact: { ...state.contact, turnstileToken: action.token } }
    case 'contact/set-screening-turnstile-token':
      return { ...state, contact: { ...state.contact, screeningTurnstileToken: action.token } }
    case 'contact/set-discard-confirmation':
      return { ...state, contact: { ...state.contact, discardConfirmation: action.confirmed } }
    case 'status/set-pending':
      return { ...state, status: { ...state.status, pending: action.pending } }
    case 'status/set-tool':
      return { ...state, status: { ...state.status, toolStatus: action.toolStatus } }
    case 'status/set-error':
      return { ...state, status: { ...state.status, error: action.error } }
    case 'status/clear-error':
      return { ...state, status: { ...state.status, error: '' } }
    default:
      return state
  }
}
