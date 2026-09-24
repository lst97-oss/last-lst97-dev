import type {
  ChatConversationContext,
  ChatMessage,
  ChatToolName,
  ChatTopicAnchor,
} from './types'

const MAX_CONTEXT_MESSAGES = 12
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
const MAX_CONTEXT_TOKEN_LENGTH = 60_000
const CONTEXT_VERSION = 2

const TOOL_NAMES = new Set<ChatToolName>(['search_knowledge', 'coding_stats', 'coding_history', 'site_content'])
const TOOL_STATUSES = new Set(['completed', 'unavailable', 'rejected'])

interface SignedContextV2 {
  version: typeof CONTEXT_VERSION
  expiresAt: number
  messages: ChatMessage[]
  topicAnchors: ChatTopicAnchor[]
}

interface SignedContextLegacy {
  expiresAt: number
  messages: ChatMessage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMessage(value: unknown): value is ChatMessage {
  return isRecord(value)
    && (value.role === 'user' || value.role === 'assistant')
    && typeof value.content === 'string'
    && value.content.length <= MAX_MESSAGE_LENGTH
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
  if (!isRecord(value)
    || typeof value.question !== 'string'
    || value.question.trim().length === 0
    || value.question.length > MAX_ANCHOR_QUESTION_LENGTH
    || (value.entityLabel !== undefined && (
      typeof value.entityLabel !== 'string'
      || !value.entityLabel.trim()
      || value.entityLabel.length > MAX_ENTITY_LABEL_LENGTH
      || !Array.isArray(value.tools)
      || !value.tools.some((tool) => isObservation(tool) && tool.name === 'coding_history' && tool.status === 'completed')
    ))
    || typeof value.observedAtUtc !== 'string'
    || !Array.isArray(value.tools)
    || value.tools.length > MAX_TOOL_OBSERVATIONS) return false

  const timestamp = Date.parse(value.observedAtUtc)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value.observedAtUtc) return false
  return value.tools.every(isObservation)
}

function boundedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((item) => isRecord(item)
      && (item.role === 'user' || item.role === 'assistant')
      && typeof item.content === 'string')
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH) }))
    .filter((item) => item.content.length > 0)
}

function boundedAnchors(anchors: ChatTopicAnchor[]): ChatTopicAnchor[] {
  return anchors
    .filter((anchor) => isRecord(anchor)
      && typeof anchor.question === 'string'
      && typeof anchor.observedAtUtc === 'string'
      && Array.isArray(anchor.tools))
    .slice(-MAX_TOPIC_ANCHORS)
    .map((anchor) => ({
      question: anchor.question.trim().slice(0, MAX_ANCHOR_QUESTION_LENGTH),
      ...(typeof anchor.entityLabel === 'string' ? { entityLabel: anchor.entityLabel.trim().slice(0, MAX_ENTITY_LABEL_LENGTH) } : {}),
      observedAtUtc: anchor.observedAtUtc,
      tools: anchor.tools.filter(isObservation).slice(0, MAX_TOOL_OBSERVATIONS).map((tool) => ({
        name: tool.name,
        arguments: { ...tool.arguments },
        status: tool.status,
      })),
    }))
    .filter(isAnchor)
}

export function createChatContextSigner(secret: string, now: () => number = Date.now) {
  if (secret.trim().length < 32) throw new Error('Chat context signing secret must be at least 32 characters')

  const encoder = new TextEncoder()
  const keyPromise = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const decode = (value: string) => {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  }

  return {
    async sign(context: ChatConversationContext | ChatMessage[]): Promise<string> {
      const normalized = Array.isArray(context)
        ? { messages: boundedMessages(context), topicAnchors: [] }
        : { messages: boundedMessages(context.messages), topicAnchors: boundedAnchors(context.topicAnchors) }
      let envelope: SignedContextV2 = {
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

    async verify(token: string | undefined): Promise<ChatConversationContext | null> {
      try {
        if (!token || token.length > MAX_CONTEXT_TOKEN_LENGTH) return null
        const [payload, signature, ...extra] = token.split('.')
        if (!payload || !signature || extra.length) return null
        const valid = await crypto.subtle.verify('HMAC', await keyPromise, decode(signature), encoder.encode(payload))
        if (!valid) return null

        const parsed = JSON.parse(new TextDecoder().decode(decode(payload))) as Partial<SignedContextV2 & SignedContextLegacy>
        if (!Number.isFinite(parsed.expiresAt) || (parsed.expiresAt ?? 0) <= now()) return null
        if (!Array.isArray(parsed.messages) || parsed.messages.length > MAX_CONTEXT_MESSAGES || !parsed.messages.every(isMessage)) return null

        if (parsed.version === undefined && parsed.topicAnchors === undefined) {
          return { messages: parsed.messages, topicAnchors: [] }
        }
        if (parsed.version !== CONTEXT_VERSION
          || !Array.isArray(parsed.topicAnchors)
          || parsed.topicAnchors.length > MAX_TOPIC_ANCHORS
          || !parsed.topicAnchors.every(isAnchor)) return null

        return { messages: parsed.messages, topicAnchors: parsed.topicAnchors }
      } catch {
        return null
      }
    },
  }
}

export type ChatContextSigner = ReturnType<typeof createChatContextSigner>
