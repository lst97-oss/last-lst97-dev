import type { FormEvent } from 'react'
import type { ChatContactField, ChatContactFieldValues, ChatContactTemplate } from '../../../lib/chat-contact'
import type { ChatContactEvent } from '../../../server/chat/events'
import type { ChatMessage } from '../../../server/chat/types'
import type { PublicCitation } from '../../../server/knowledge/retrieve'

export interface ChatViewMessage extends ChatMessage {
  citations?: PublicCitation[]
  knowledgeUnavailable?: boolean
}

export type ChatContactUiState =
  | { phase: 'confirmation' }
  | { phase: 'template_selection' }
  | { phase: 'filling'; template: ChatContactTemplate }
  | { phase: 'review'; template: ChatContactTemplate }
  | { phase: 'delivered'; template: ChatContactTemplate }

export type ChatContactReview = Extract<ChatContactEvent, { type: 'contact_review' }>

export interface ChatContactFieldErrors {
  missingFields: ChatContactField[]
  invalidFields: ChatContactField[]
}

export interface ChatContactWorkflowViewModel {
  state: ChatContactUiState | null
  draft: ChatContactFieldValues
  fieldErrors: ChatContactFieldErrors
  review: ChatContactReview | null
  turnstileToken: string | null
  turnstileResetCount: number
  discardConfirmation: boolean
  hasContextToken: boolean
  actions: {
    clearFieldError: (field: ChatContactField) => void
    submitForm: (fields: ChatContactFieldValues) => void
    startContact: () => void
    declineContact: () => void
    chooseTemplate: (template: ChatContactTemplate) => void
    editReview: () => void
    confirmSend: () => void
    discard: () => void
    startBlankChat: () => void
    setTurnstileToken: (token: string | null) => void
    setDiscardConfirmation: (confirmed: boolean) => void
  }
}

export interface ChatConversationViewModel {
  history: ChatViewMessage[]
  completedTurns: number
  turnLimitReached: boolean
  message: string
  turnstileToken: string | null
  turnstileResetCount: number
  actions: {
    setMessage: (message: string) => void
    sendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>
    reset: () => void
    setTurnstileToken: (token: string | null) => void
  }
}

export interface ChatSessionViewModel {
  conversation: ChatConversationViewModel
  contact: ChatContactWorkflowViewModel
  status: {
    pending: boolean
    toolStatus: string | null
    error: string
  }
}
