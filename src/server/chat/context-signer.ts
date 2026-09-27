import { CHAT_CONTACT_TEMPLATES, type ChatContactFieldValues, type ChatContactTemplate } from '../../lib/chat-contact'
import { MAX_CHAT_CONTEXT_MESSAGES, MAX_CHAT_CONTEXT_TOKEN_CHARS } from '../../lib/chat-limits'
import { projectCatalogFiltersSchema } from '../knowledge/project-catalog'
import type {
  ChatConversationContext,
  ChatMessage,
  ChatProjectListState,
  ChatToolName,
  ChatTopicAnchor,
  ChatWorkflowContext,
} from './types'
import { CHAT_TOOL_NAMES } from './types'

const MAX_MESSAGE_LENGTH = 2_000
const MAX_TOPIC_ANCHORS = 8
const MAX_ANCHOR_QUESTION_LENGTH = 500
const MAX_ENTITY_LABEL_LENGTH = 80
const MAX_TOOL_OBSERVATIONS = 4
const MAX_TOOL_ARGUMENTS_LENGTH = 2_500
const MAX_TOOL_ARGUMENTS = 12
const MAX_TOOL_ARGUMENT_KEY_LENGTH = 80
const MAX_TOOL_ARGUMENT_STRING_LENGTH = 2_000
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1_000
const MAX_CONTEXT_TOKEN_LENGTH = MAX_CHAT_CONTEXT_TOKEN_CHARS
const CONTEXT_VERSION = 5
const MAX_SHOWN_PROJECT_IDS = 200
const OWNED_PROJECT_ID = /^lst97\/[A-Za-z0-9_.-]{1,100}$/

const TOOL_NAMES = new Set<ChatToolName>(CHAT_TOOL_NAMES)
const TOOL_STATUSES = new Set(['completed', 'unavailable', 'rejected'])

interface SignedContextV5 {
  version: 5
  expiresAt: number
  messages: ChatMessage[]
  topicAnchors: ChatTopicAnchor[]
  projectListState: ChatProjectListState
  workflow: ChatWorkflowContext
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    value.content.length <= MAX_MESSAGE_LENGTH
  )
}

function isObservation(value: unknown): value is ChatTopicAnchor['tools'][number] {
  if (!isRecord(value) || typeof value.name !== 'string' || !TOOL_NAMES.has(value.name as ChatToolName)) return false
  if (typeof value.status !== 'string' || !TOOL_STATUSES.has(value.status)) return false
  if (!isRecord(value.arguments) || Object.keys(value.arguments).length > MAX_TOOL_ARGUMENTS) return false

  for (const [key, argument] of Object.entries(value.arguments)) {
    if (!key || key.length > MAX_TOOL_ARGUMENT_KEY_LENGTH) return false
    if (typeof argument === 'string') {
      if (argument.length > MAX_TOOL_ARGUMENT_STRING_LENGTH) return false
    } else if (typeof argument === 'number') {
      if (!Number.isFinite(argument)) return false
    } else if (typeof argument !== 'boolean') {
      return false
    }
  }

  try {
    return JSON.stringify(value.arguments).length <= MAX_TOOL_ARGUMENTS_LENGTH
  } catch {
    return false
  }
}

function isAnchor(value: unknown): value is ChatTopicAnchor {
  if (
    !isRecord(value) ||
    typeof value.question !== 'string' ||
    value.question.trim().length === 0 ||
    value.question.length > MAX_ANCHOR_QUESTION_LENGTH ||
    (value.entityLabel !== undefined &&
      (typeof value.entityLabel !== 'string' ||
        !value.entityLabel.trim() ||
        value.entityLabel.length > MAX_ENTITY_LABEL_LENGTH ||
        !Array.isArray(value.tools) ||
        !value.tools.some(
          (tool) => isObservation(tool) && tool.name === 'coding_history' && tool.status === 'completed',
        ))) ||
    typeof value.observedAtUtc !== 'string' ||
    !Array.isArray(value.tools) ||
    value.tools.length > MAX_TOOL_OBSERVATIONS
  )
    return false

  const timestamp = Date.parse(value.observedAtUtc)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value.observedAtUtc) return false
  return value.tools.every(isObservation)
}

function boundedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter(
      (item) =>
        isRecord(item) && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string',
    )
    .slice(-MAX_CHAT_CONTEXT_MESSAGES)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH) }))
    .filter((item) => item.content.length > 0)
}

function boundedAnchors(anchors: ChatTopicAnchor[]): ChatTopicAnchor[] {
  return anchors
    .filter(
      (anchor) =>
        isRecord(anchor) &&
        typeof anchor.question === 'string' &&
        typeof anchor.observedAtUtc === 'string' &&
        Array.isArray(anchor.tools),
    )
    .slice(-MAX_TOPIC_ANCHORS)
    .map((anchor) => ({
      question: anchor.question.trim().slice(0, MAX_ANCHOR_QUESTION_LENGTH),
      ...(typeof anchor.entityLabel === 'string'
        ? { entityLabel: anchor.entityLabel.trim().slice(0, MAX_ENTITY_LABEL_LENGTH) }
        : {}),
      observedAtUtc: anchor.observedAtUtc,
      tools: anchor.tools
        .filter(isObservation)
        .slice(0, MAX_TOOL_OBSERVATIONS)
        .map((tool) => ({
          name: tool.name,
          arguments: { ...tool.arguments },
          status: tool.status,
        })),
    }))
    .filter(isAnchor)
}

function boundedProjectListState(value: unknown): ChatProjectListState {
  const state = isRecord(value) ? value : {}
  const seen = new Set<string>()
  const shownProjectIds = Array.isArray(state.shownProjectIds)
    ? state.shownProjectIds.filter((id): id is string => {
        if (typeof id !== 'string' || !OWNED_PROJECT_ID.test(id) || seen.has(id) || seen.size >= MAX_SHOWN_PROJECT_IDS)
          return false
        seen.add(id)
        return true
      })
    : []

  const activeFilters = projectCatalogFiltersSchema.safeParse(state.activeFilters)
  return {
    clarificationAsked: state.clarificationAsked === true,
    shownProjectIds,
    shortlistStarted: state.shortlistStarted === true,
    ...(activeFilters.success ? { activeFilters: activeFilters.data } : {}),
  }
}

function isContactTemplate(value: unknown): value is ChatContactTemplate {
  return typeof value === 'string' && Object.hasOwn(CHAT_CONTACT_TEMPLATES, value)
}

function isWorkflow(value: unknown): value is ChatWorkflowContext {
  if (!isRecord(value)) return false
  if (value.mode === 'normal') {
    return Object.keys(value).length === 2 && (value.phase === 'conversation' || value.phase === 'contact_confirmation')
  }
  if (value.mode !== 'contact') return false
  if (value.phase === 'template_selection') return Object.keys(value).length === 2
  if (!isContactTemplate(value.template)) return false
  if (value.phase === 'filling' || value.phase === 'delivered') return Object.keys(value).length === 3
  if (value.phase !== 'review' || Object.keys(value).length !== 4 || !isRecord(value.reviewApproval)) return false
  return (
    Object.keys(value.reviewApproval).length === 2 &&
    typeof value.reviewApproval.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.reviewApproval.id) &&
    typeof value.reviewApproval.draftProof === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(value.reviewApproval.draftProof)
  )
}

function emptyProjectListState(): ChatProjectListState {
  return { clarificationAsked: false, shownProjectIds: [], shortlistStarted: false }
}

function hasProjectState(value: unknown): boolean {
  const state = boundedProjectListState(value)
  return (
    state.clarificationAsked ||
    state.shownProjectIds.length > 0 ||
    state.shortlistStarted ||
    state.activeFilters !== undefined
  )
}

function sortedContactFields(fields: ChatContactFieldValues) {
  return Object.fromEntries(Object.entries(fields).sort(([left], [right]) => left.localeCompare(right)))
}

function contactReviewPayload(
  template: ChatContactTemplate,
  fields: ChatContactFieldValues,
  originalFields: ChatContactFieldValues = fields,
): string {
  return JSON.stringify({
    template,
    refinedFields: sortedContactFields(fields),
    originalFields: sortedContactFields(originalFields),
  })
}

export function createChatContextSigner(secret: string, now: () => number = Date.now) {
  if (secret.trim().length < 32) throw new Error('Chat context signing secret must be at least 32 characters')

  const encoder = new TextEncoder()
  const keyPromise = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
  const encode = (bytes: Uint8Array) => {
    const chunks: string[] = []
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)))
    }
    return btoa(chunks.join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  }
  const decode = (value: string) => {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
    const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  }

  return {
    async sign(context: ChatConversationContext | ChatMessage[]): Promise<string> {
      const workflow = Array.isArray(context)
        ? { mode: 'normal' as const, phase: 'conversation' as const }
        : (context.workflow ?? { mode: 'normal' as const, phase: 'conversation' as const })
      if (!isWorkflow(workflow)) throw new Error('Invalid chat workflow context')
      const contactMode = workflow.mode === 'contact'
      const normalized = Array.isArray(context)
        ? { messages: boundedMessages(context), topicAnchors: [], projectListState: emptyProjectListState(), workflow }
        : {
            messages: contactMode ? [] : boundedMessages(context.messages),
            topicAnchors: contactMode ? [] : boundedAnchors(context.topicAnchors),
            projectListState: contactMode ? emptyProjectListState() : boundedProjectListState(context.projectListState),
            workflow,
          }
      let envelope: SignedContextV5 = {
        version: CONTEXT_VERSION,
        expiresAt: now() + TOKEN_LIFETIME_MS,
        ...normalized,
      }
      let payload = encode(encoder.encode(JSON.stringify(envelope)))

      while (payload.length + 44 >= MAX_CONTEXT_TOKEN_LENGTH && envelope.topicAnchors.length > 0) {
        envelope = { ...envelope, topicAnchors: envelope.topicAnchors.slice(1) }
        payload = encode(encoder.encode(JSON.stringify(envelope)))
      }
      while (payload.length + 44 >= MAX_CONTEXT_TOKEN_LENGTH && envelope.messages.length > 1) {
        envelope = { ...envelope, messages: envelope.messages.slice(1) }
        payload = encode(encoder.encode(JSON.stringify(envelope)))
      }

      const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await keyPromise, encoder.encode(payload)))
      const token = `${payload}.${encode(signature)}`
      if (token.length > MAX_CONTEXT_TOKEN_LENGTH) throw new Error('Signed chat context exceeds its size limit')
      return token
    },

    async createContactReviewProof(
      template: ChatContactTemplate,
      fields: ChatContactFieldValues,
      originalFields?: ChatContactFieldValues,
    ): Promise<string> {
      const payload = contactReviewPayload(template, fields, originalFields)
      const signature = new Uint8Array(
        await crypto.subtle.sign('HMAC', await keyPromise, encoder.encode(`contact-review\u0000${payload}`)),
      )
      return encode(signature)
    },

    async verifyContactReviewProof(
      template: ChatContactTemplate,
      fields: ChatContactFieldValues,
      proof: string,
      originalFields?: ChatContactFieldValues,
    ): Promise<boolean> {
      try {
        if (!/^[A-Za-z0-9_-]{43}$/.test(proof)) return false
        return await crypto.subtle.verify(
          'HMAC',
          await keyPromise,
          decode(proof),
          encoder.encode(`contact-review\u0000${contactReviewPayload(template, fields, originalFields)}`),
        )
      } catch {
        return false
      }
    },

    async verify(token: string | undefined): Promise<ChatConversationContext | null> {
      try {
        if (!token || token.length > MAX_CONTEXT_TOKEN_LENGTH) return null
        const [payload, signature, ...extra] = token.split('.')
        if (!payload || !signature || extra.length) return null
        const valid = await crypto.subtle.verify('HMAC', await keyPromise, decode(signature), encoder.encode(payload))
        if (!valid) return null

        const parsed = JSON.parse(new TextDecoder().decode(decode(payload))) as {
          version?: number
          expiresAt?: number
          messages?: unknown
          topicAnchors?: unknown
          projectListState?: unknown
          workflow?: unknown
        }
        if (!Number.isFinite(parsed.expiresAt) || (parsed.expiresAt ?? 0) <= now()) return null
        if (
          !Array.isArray(parsed.messages) ||
          parsed.messages.length > MAX_CHAT_CONTEXT_MESSAGES ||
          !parsed.messages.every(isMessage)
        )
          return null

        if (parsed.version === undefined && parsed.topicAnchors === undefined) {
          return {
            messages: parsed.messages,
            topicAnchors: [],
            projectListState: emptyProjectListState(),
            workflow: { mode: 'normal', phase: 'conversation' },
          }
        }
        if (
          (parsed.version !== 2 &&
            parsed.version !== 3 &&
            parsed.version !== 4 &&
            parsed.version !== CONTEXT_VERSION) ||
          !Array.isArray(parsed.topicAnchors) ||
          parsed.topicAnchors.length > MAX_TOPIC_ANCHORS ||
          !parsed.topicAnchors.every(isAnchor)
        )
          return null

        if (parsed.version === CONTEXT_VERSION) {
          if (!isWorkflow(parsed.workflow)) return null
          if (
            parsed.workflow.mode === 'contact' &&
            (parsed.messages.length > 0 || parsed.topicAnchors.length > 0 || hasProjectState(parsed.projectListState))
          )
            return null
          return {
            messages: parsed.messages,
            topicAnchors: parsed.topicAnchors,
            projectListState: boundedProjectListState(parsed.projectListState),
            workflow: parsed.workflow,
          }
        }

        return {
          messages: parsed.messages,
          topicAnchors: parsed.topicAnchors,
          projectListState: boundedProjectListState(
            parsed.version === 3 || parsed.version === 4 ? parsed.projectListState : undefined,
          ),
          workflow: { mode: 'normal', phase: 'conversation' },
        }
      } catch {
        return null
      }
    },
  }
}

type FullChatContextSigner = ReturnType<typeof createChatContextSigner>
export type ChatContextSigner = Omit<FullChatContextSigner, 'createContactReviewProof' | 'verifyContactReviewProof'> & {
  createContactReviewProof?: FullChatContextSigner['createContactReviewProof']
  verifyContactReviewProof?: FullChatContextSigner['verifyContactReviewProof']
}
