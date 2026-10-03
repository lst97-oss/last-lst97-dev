import { z } from 'zod'
import {
  CHAT_CONTACT_TEMPLATES,
  type ChatContactField,
  type ChatContactFieldValues,
  type ChatContactSubmission,
  type ChatContactTemplate,
} from '../../lib/chat-contact'
import { CHAT_OFFLINE_MESSAGE, MAX_CHAT_CONTEXT_TOKEN_CHARS } from '../../lib/chat-limits'
import type { PublicCitation } from '../knowledge/retrieve'
import { CHAT_TOOL_NAMES, type ChatToolProgressName } from './types'

// SSE event protocol for POST /api/site/chat when the client sends
// `Accept: text/event-stream`. Framing is `event: <type>\ndata: <json>\n\n`.
// This module is pure string shaping with no server runtime imports, so the
// browser chat client can share the frame splitter and parser.
//
// It is also the single definition of EVERY `/api/site/chat` wire shape:
// the stream events, the two JSON response bodies, and the incoming request
// schemas. The browser parses with the same schemas the handler validates
// with, so a body the client cannot understand is dropped instead of being
// cast into whatever shape the caller hoped for.
//
// Browser-safety is load-bearing. `vendor/payload-tanstack-vite/importProtection.js`
// fails the client build if a server-only specifier reaches this graph, so the
// only permitted value imports are `zod`, `../../lib/chat-contact`,
// `../../lib/chat-limits`, and `./types`. Everything from `src/server/**` must
// stay `import type`.

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
      /**
       * False when the clarity pass could not produce usable JSON and the
       * visitor's own words were sent instead. `refinedSubmission` then equals
       * `originalSubmission`, and the review screen and the email must say so
       * rather than describing the text as "refined".
       */
      refined: boolean
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
  | { action: 'submit_form'; contextToken: string; fields: ChatContactFieldValues; turnstileToken: string }
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

// ---------------------------------------------------------------------------
// Closed sets, derived rather than restated.

/**
 * Every template name, taken from `CHAT_CONTACT_TEMPLATES` rather than a
 * literal list. `http-handler.ts` used to hardcode
 * `z.enum(['email', 'bug_report', …])`, which is not a type error when a
 * template is added: the new name is accepted by the UI and silently 400s at
 * the boundary. Deriving makes that drift impossible.
 */
const chatContactTemplateNames = Object.keys(CHAT_CONTACT_TEMPLATES) as [ChatContactTemplate, ...ChatContactTemplate[]]
export const chatContactTemplateSchema = z.enum(chatContactTemplateNames)

const chatContactFieldNames = [
  ...new Set(Object.values(CHAT_CONTACT_TEMPLATES).flatMap((template) => template.fields.map((field) => field.key))),
] as [ChatContactField, ...ChatContactField[]]
export const chatContactFieldSchema = z.enum(chatContactFieldNames)

// `CHAT_TOOL_NAMES` minus the one tool that never surfaces a progress label,
// plus the synthetic `knowledge` label. The `unknown` hop is what lets the
// empty-tail proof a tuple cast needs; every element is already exactly
// `ChatToolProgressName`.
const chatToolProgressNames = [
  ...CHAT_TOOL_NAMES.filter((name) => name !== 'search_knowledge'),
  'knowledge',
] as unknown as [ChatToolProgressName, ...ChatToolProgressName[]]
const chatToolProgressNameSchema = z.enum(chatToolProgressNames)

const chatStatusNames = Object.keys(CHAT_STATUS_LABELS) as [ChatStatus, ...ChatStatus[]]

// ---------------------------------------------------------------------------
// Citations.

const chatCitationShape = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  isPublic: z.boolean(),
})

/**
 * Compile-time proof that the citation schema and `PublicCitation` describe the
 * same record in both directions. `tests/server/chat-events.test.ts` assigns
 * `true` to it, so adding a field to the interface without validating it here
 * breaks the build rather than letting an unvalidated value reach
 * `ChatCitations`.
 */
export type ChatCitationParity = [z.infer<typeof chatCitationShape>] extends [PublicCitation]
  ? [PublicCitation] extends [z.infer<typeof chatCitationShape>]
    ? true
    : never
  : never

/**
 * A plain `z.object`, so unknown keys are stripped rather than carried into the
 * component tree: a citation carrying chunk text is sanitised here instead of
 * reaching the renderer on the strength of a TypeScript cast.
 */
export const chatCitationSchema = chatCitationShape as unknown as z.ZodType<PublicCitation>

// ---------------------------------------------------------------------------
// Contact events.

/**
 * `ChatContactSubmission.fields` is a template-specific all-`string` record in
 * every variant (`src/lib/chat-contact.ts`), so a validated `Record<string, string>`
 * is assignable to `ChatContactFieldValues` and no consumer needs a cast.
 */
const chatContactSubmissionSchema = z.object({
  template: chatContactTemplateSchema,
  fields: z.record(z.string(), z.string()),
})

/**
 * Seven of the thirteen contact events differ only in their discriminator.
 * A helper taking `type: string` would widen the discriminator to `string` and
 * collapse the discriminated union, so `chatContactEventSchema` expands these
 * calls with literal arguments instead.
 */
type ChatContactTextEventType =
  | 'contact_confirmation'
  | 'contact_declined'
  | 'contact_started'
  | 'contact_out_of_scope'
  | 'contact_blocked'
  | 'contact_discarded'
  | 'contact_new_chat'

function chatContactTextEventSchema(type: ChatContactTextEventType) {
  return z.looseObject({ type: z.literal(type), text: z.string(), contextToken: z.string() })
}

/**
 * Every variant is `z.looseObject`: the server may add a field to an event and
 * an older client must keep reading it. Unknown *citation* keys are still
 * stripped — that is data minimisation, not format tolerance.
 */
const chatContactEventSchemaUnion = z.discriminatedUnion('type', [
  chatContactTextEventSchema('contact_confirmation'),
  chatContactTextEventSchema('contact_declined'),
  chatContactTextEventSchema('contact_started'),
  chatContactTextEventSchema('contact_out_of_scope'),
  chatContactTextEventSchema('contact_blocked'),
  chatContactTextEventSchema('contact_discarded'),
  chatContactTextEventSchema('contact_new_chat'),
  z.looseObject({ type: z.literal('contact_unavailable'), text: z.string(), contextToken: z.string().optional() }),
  z.looseObject({
    type: z.literal('contact_template_selected'),
    template: chatContactTemplateSchema,
    contextToken: z.string(),
  }),
  z.looseObject({
    type: z.literal('contact_form_incomplete'),
    template: chatContactTemplateSchema,
    missingFields: z.array(chatContactFieldSchema),
    invalidFields: z.array(chatContactFieldSchema),
    contextToken: z.string(),
  }),
  z.looseObject({
    type: z.literal('contact_review'),
    template: chatContactTemplateSchema,
    originalSubmission: chatContactSubmissionSchema,
    refinedSubmission: chatContactSubmissionSchema,
    refined: z.boolean(),
    contextToken: z.string(),
  }),
  z.looseObject({ type: z.literal('contact_editing'), template: chatContactTemplateSchema, contextToken: z.string() }),
  z.looseObject({
    type: z.literal('contact_send_error'),
    reason: z.enum(['turnstile', 'turnstile_unavailable', 'duplicate', 'delivery']),
    text: z.string(),
    contextToken: z.string(),
  }),
  z.looseObject({
    type: z.literal('contact_delivery'),
    template: chatContactTemplateSchema,
    receiptStatus: z.enum(['sent', 'failed']),
    contextToken: z.string(),
  }),
])
export const chatContactEventSchema = chatContactEventSchemaUnion as unknown as z.ZodType<ChatContactEvent>

// ---------------------------------------------------------------------------
// Stream events.

/**
 * Each `.catch()` reproduces a fallback the client already applied by hand
 * (`String(data.delta ?? '')`, `String(data.label ?? 'WORKING…')`,
 * `String(data.message ?? CHAT_OFFLINE_MESSAGE)`), so a partial frame still
 * renders exactly as it did. Do not add a catch where the client had none.
 */
const chatStreamEventSchemaUnion = z.union([
  z.looseObject({ type: z.literal('status'), status: z.enum(chatStatusNames) }),
  z.looseObject({ type: z.literal('token'), delta: z.string().catch('') }),
  z.looseObject({
    type: z.literal('tool_start'),
    name: chatToolProgressNameSchema,
    label: z.string().catch('WORKING…'),
  }),
  z.looseObject({ type: z.literal('tool_result'), name: chatToolProgressNameSchema, summary: z.string() }),
  z.looseObject({ type: z.literal('citations'), citations: z.array(chatCitationSchema) }),
  z.looseObject({ type: z.literal('knowledge_note') }),
  z.looseObject({ type: z.literal('done'), contextToken: z.string().optional(), model: z.string().optional() }),
  z.looseObject({
    type: z.literal('error'),
    message: z.string().catch(CHAT_OFFLINE_MESSAGE),
    code: z.literal('turn_limit').optional(),
  }),
  chatContactEventSchema,
])
export const chatStreamEventSchema = chatStreamEventSchemaUnion as unknown as z.ZodType<ChatStreamEvent>

// ---------------------------------------------------------------------------
// JSON responses (the non-stream reply path and contact actions).

/**
 * A union, not a plain object, because the browser branch is driven by
 * `!response.ok || !data?.reply`: a body carrying neither `reply` nor `error`
 * must not parse into something that looks usable. The three `code` values are
 * the only ones `http-handler.ts` ever emits.
 *
 * `z.object`, not `z.looseObject`: a loose object infers an index signature, and
 * reading `data.code` off a union of two such objects degrades to `{}`, which
 * silently breaks every consumer of the parsed body. Stripping the unknown keys
 * (`requestId`) costs nothing here and keeps the named properties typed. Stream
 * events stay loose because they are consumed by a `switch` on `type`, never by
 * named property access across a union.
 */
const chatJsonReplyBranch = z.object({
  reply: z.string(),
  contextToken: z.string().optional(),
  model: z.string().optional(),
  citations: z.array(chatCitationSchema).optional(),
  knowledgeUnavailable: z.boolean().optional(),
})
const chatJsonErrorBranch = z.object({
  error: z.string(),
  code: z.enum(['turnstile_invalid', 'turnstile_unavailable', 'turn_limit']).optional(),
})
export const chatJsonResponseSchema = z.union([chatJsonReplyBranch, chatJsonErrorBranch])
/**
 * Flattened deliberately. The union is what the *parser* enforces — a body
 * carrying neither `reply` nor `error` is rejected — while the type is what the
 * *consumer* reads. Reading `data.reply` off the inferred union is an error on
 * the branch that lacks it, which would push the client back into a cast.
 * `Partial` of both branches keeps every read legal while the parser stays
 * strict; a branch the type widened is still only ever populated by a parse
 * that matched it.
 */
export type ChatJsonResponse = Partial<z.infer<typeof chatJsonReplyBranch> & z.infer<typeof chatJsonErrorBranch>>

/**
 * `event` and `error` are both optional so a 400/409/503 body still parses and
 * the client keeps showing the server's own expired-session copy instead of
 * collapsing every failure to the generic message.
 */
export const chatContactActionResponseSchema = z.object({
  event: chatContactEventSchema.optional(),
  error: z.string().optional(),
})
export type ChatContactActionResponse = z.infer<typeof chatContactActionResponseSchema>

// ---------------------------------------------------------------------------
// Incoming requests. These stay `.strict()`: an unknown request key is a 400.

const chatContextTokenSchema = z.string().min(1).max(MAX_CHAT_CONTEXT_TOKEN_CHARS)

export const chatMessageRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(2_000),
    contextToken: z.string().max(MAX_CHAT_CONTEXT_TOKEN_CHARS).optional(),
    turnstileToken: z.string().max(2_048).optional(),
  })
  .strict()
export type ChatMessageRequest = z.infer<typeof chatMessageRequestSchema>

export const chatContactActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_contact'), contextToken: chatContextTokenSchema }).strict(),
  z.object({ action: z.literal('decline_contact'), contextToken: chatContextTokenSchema }).strict(),
  z
    .object({
      action: z.literal('select_template'),
      contextToken: chatContextTokenSchema,
      template: chatContactTemplateSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('submit_form'),
      contextToken: chatContextTokenSchema,
      fields: z.unknown(),
      // Screening spends two model calls, so it is gated ahead of the work
      // rather than only at the final send.
      turnstileToken: z.string().min(1).max(2_048),
    })
    .strict(),
  z.object({ action: z.literal('edit_form'), contextToken: chatContextTokenSchema }).strict(),
  z
    .object({
      action: z.literal('confirm_send'),
      contextToken: chatContextTokenSchema,
      refinedSubmission: z.unknown(),
      originalSubmission: z.unknown(),
      turnstileToken: z.string().min(1).max(2_048),
    })
    .strict(),
  z
    .object({ action: z.literal('discard_contact'), contextToken: chatContextTokenSchema, confirmed: z.literal(true) })
    .strict(),
  z.object({ action: z.literal('start_new_chat'), contextToken: chatContextTokenSchema }).strict(),
])
export type ChatContactActionBody = z.infer<typeof chatContactActionSchema>

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

/**
 * The browser's frame decoder: parse, then validate, then confirm the SSE
 * event name agrees with the payload's own `type`.
 *
 * The name check is stricter than the hand-rolled switch it replaces, which
 * branched on the frame name and then read the body as
 * `Record<string, unknown>`. A `done:` frame carrying a token payload is
 * dropped rather than dispatched as a completed turn.
 */
export function parseChatStreamFrame(frame: string): ChatStreamEvent | null {
  const parsed = parseEventFrame(frame)
  if (!parsed) return null
  const event = chatStreamEventSchema.safeParse(parsed.data)
  if (!event.success || event.data.type !== parsed.name) return null
  return event.data
}
