import type {
  ChatContactField,
  ChatContactFieldValues,
  ChatContactSubmission,
  ChatContactTemplate,
} from '../../lib/chat-contact'
import type { PublicCitation } from '../knowledge/retrieve'
import type { ChatToolProgressName } from './types'

// SSE event protocol for POST /api/site/chat when the client sends
// `Accept: text/event-stream`. Framing is `event: <type>\ndata: <json>\n\n`.
// This module is pure string shaping with no server runtime imports, so the
// browser chat client can share the frame splitter and parser.

export const CHAT_STATUS_LABELS = {
  thinking: 'THINKING…',
  searching_knowledge: 'SEARCHING MY NOTES…',
  preparing_arguments: 'OPENROUTER · PREPARING TOOL ARGUMENTS…',
  composing_reply: 'WRITING A REPLY…',
} as const

export type ChatStatus = keyof typeof CHAT_STATUS_LABELS

export function chatStatusLabel(status: unknown): string | null {
  if (typeof status !== 'string' || !Object.hasOwn(CHAT_STATUS_LABELS, status)) return null
  return CHAT_STATUS_LABELS[status as ChatStatus]
}

export type ChatStreamEvent =
  | { type: 'status'; status: ChatStatus }
  | { type: 'tool_start'; name: ChatToolProgressName; label: string }
  | { type: 'token'; delta: string }
  | { type: 'tool_result'; name: ChatToolProgressName; summary: string }
  | { type: 'citations'; citations: PublicCitation[] }
  | { type: 'knowledge_note' }
  | ChatContactEvent
  | { type: 'done'; contextToken: string; model?: string }
  | { type: 'error'; message: string; code?: 'turn_limit' }

export type ChatContactEvent =
  | { type: 'contact_confirmation'; text: string; contextToken: string }
  | { type: 'contact_declined'; text: string; contextToken: string }
  | { type: 'contact_started'; text: string; contextToken: string }
  | { type: 'contact_template_selected'; template: ChatContactTemplate; contextToken: string }
  | {
      type: 'contact_form_incomplete'
      template: ChatContactTemplate
      missingFields: ChatContactField[]
      invalidFields: ChatContactField[]
      contextToken: string
    }
  | { type: 'contact_out_of_scope'; text: string; contextToken: string }
  | { type: 'contact_blocked'; text: string; contextToken: string }
  | { type: 'contact_unavailable'; text: string; contextToken?: string }
  | {
      type: 'contact_review'
      template: ChatContactTemplate
      originalSubmission: ChatContactSubmission
      refinedSubmission: ChatContactSubmission
      contextToken: string
    }
  | { type: 'contact_editing'; template: ChatContactTemplate; contextToken: string }
  | {
      type: 'contact_send_error'
      reason: 'turnstile' | 'turnstile_unavailable' | 'duplicate' | 'delivery'
      text: string
      contextToken: string
    }
  | { type: 'contact_delivery'; template: ChatContactTemplate; receiptStatus: 'sent' | 'failed'; contextToken: string }
  | { type: 'contact_discarded'; text: string; contextToken: string }
  | { type: 'contact_new_chat'; text: string; contextToken: string }

export type ChatContactAction =
  | { action: 'start_contact'; contextToken: string }
  | { action: 'decline_contact'; contextToken: string }
  | { action: 'select_template'; contextToken: string; template: ChatContactTemplate }
  | { action: 'submit_form'; contextToken: string; fields: ChatContactFieldValues }
  | { action: 'edit_form'; contextToken: string }
  | {
      action: 'confirm_send'
      contextToken: string
      refinedSubmission: unknown
      originalSubmission: unknown
      turnstileToken: string
    }
  | { action: 'discard_contact'; contextToken: string; confirmed: true }
  | { action: 'start_new_chat'; contextToken: string }

export type ChatContactActionRequest = ChatContactAction & {
  expectedHostname: string
  requestId: string
}

export function encodeChatEvent(event: ChatStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

export function splitEventFrames(buffer: string): { frames: string[]; rest: string } {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  return { frames: parts, rest }
}

export function parseEventFrame(frame: string): { name: string; data: unknown } | null {
  let name = ''
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) name = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim())
  }
  if (!name || dataLines.length === 0) return null
  try {
    return { name, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return null
  }
}
