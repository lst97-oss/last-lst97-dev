import { describe, expect, it } from 'bun:test'

import { CHAT_CONTACT_TEMPLATES, type ChatContactSubmission } from '../../src/lib/chat-contact'
import { CHAT_OFFLINE_MESSAGE } from '../../src/lib/chat-limits'
import type { ChatCitationParity, ChatStreamEvent } from '../../src/server/chat/events'
import * as chatEvents from '../../src/server/chat/events'

const chatStatusLabel = (chatEvents as unknown as { chatStatusLabel?: (status: unknown) => string | null })
  .chatStatusLabel
const { chatContactActionSchema, encodeChatEvent, parseChatStreamFrame, parseEventFrame, splitEventFrames } = chatEvents

describe('chat stream events', () => {
  it('frames events as SSE with a JSON payload', () => {
    expect(encodeChatEvent({ type: 'token', delta: 'Hello' })).toBe(
      'event: token\ndata: {"type":"token","delta":"Hello"}\n\n',
    )
    expect(encodeChatEvent({ type: 'status', status: 'searching_knowledge' })).toBe(
      'event: status\ndata: {"type":"status","status":"searching_knowledge"}\n\n',
    )
    expect(encodeChatEvent({ type: 'status', status: 'thinking' })).toBe(
      'event: status\ndata: {"type":"status","status":"thinking"}\n\n',
    )
    expect(encodeChatEvent({ type: 'done', contextToken: 'signed', model: 'm' })).toBe(
      'event: done\ndata: {"type":"done","contextToken":"signed","model":"m"}\n\n',
    )
  })

  it('splits buffered chunks into complete frames and keeps the remainder', () => {
    const first = encodeChatEvent({ type: 'token', delta: 'Hel' })
    const second = encodeChatEvent({ type: 'token', delta: 'lo' })
    const { frames, rest } = splitEventFrames(`${first}${second.slice(0, 10)}`)

    expect(frames).toHaveLength(1)
    expect(rest).toBe(second.slice(0, 10))

    const next = splitEventFrames(`${rest}${second.slice(10)}`)
    expect(next.frames).toHaveLength(1)
    expect(next.rest).toBe('')
  })

  it('parses frames back into typed events and rejects malformed input', () => {
    const parsed = parseEventFrame(
      encodeChatEvent({ type: 'tool_start', name: 'coding_stats', label: 'CHECKING…' }).trim(),
    )
    expect(parsed?.name).toBe('tool_start')
    expect(parsed?.data).toMatchObject({ name: 'coding_stats' })

    const status = parseEventFrame(encodeChatEvent({ type: 'status', status: 'composing_reply' }).trim())
    expect(status?.name).toBe('status')
    expect(status?.data).toMatchObject({ status: 'composing_reply' })

    expect(parseEventFrame('')).toBeNull()
    expect(parseEventFrame('event: token\ndata: not-json')).toBeNull()
    expect(parseEventFrame('data: {"type":"token"}')).toBeNull()
  })

  it('maps only known status codes to fixed UI labels', () => {
    expect(chatStatusLabel?.('thinking')).toBe('THINKING…')
    expect(chatStatusLabel?.('searching_knowledge')).toBe('SEARCHING MY NOTES…')
    expect(chatStatusLabel?.('composing_reply')).toBe('WRITING A REPLY…')
    expect(chatStatusLabel?.('untrusted label')).toBeNull()
  })
})

describe('chat wire contract', () => {
  // `satisfies` rather than a type annotation: it keeps `template` narrowed
  // to 'email' while proving the fixture is a real `ChatContactSubmission`.
  const submission = {
    template: 'email',
    fields: { name: 'Ada', email: 'ada@example.com', message: 'The contact form stopped sending.' },
  } satisfies ChatContactSubmission

  /**
   * One object per `ChatStreamEvent` member. Enumerating them by hand is the
   * point: a new variant added to the union without a matching schema fails
   * here rather than being silently dropped by the browser decoder.
   */
  const everyStreamedEvent: ChatStreamEvent[] = [
    { type: 'status', status: 'thinking' },
    { type: 'status', status: 'searching_knowledge' },
    { type: 'status', status: 'preparing_arguments' },
    { type: 'status', status: 'composing_reply' },
    { type: 'token', delta: 'Hello' },
    { type: 'tool_start', name: 'coding_stats', label: 'CHECKING…' },
    { type: 'tool_result', name: 'site_content', summary: 'Site sections (8):' },
    { type: 'citations', citations: [{ id: 'K1', title: 'GitHub profile', url: 'https://a.test', isPublic: true }] },
    { type: 'knowledge_note' },
    { type: 'done', contextToken: 'signed', model: 'openai/test-model' },
    { type: 'done', contextToken: 'signed' },
    { type: 'error', message: CHAT_OFFLINE_MESSAGE },
    { type: 'error', message: 'Turn limit reached.', code: 'turn_limit' },
    { type: 'contact_confirmation', text: 'Send an email?', contextToken: 'c1' },
    { type: 'contact_declined', text: 'No problem.', contextToken: 'c1' },
    { type: 'contact_started', text: 'Fresh session.', contextToken: 'c2' },
    { type: 'contact_template_selected', template: 'email', contextToken: 'c3' },
    {
      type: 'contact_form_incomplete',
      template: 'email',
      missingFields: ['name'],
      invalidFields: [],
      contextToken: 'c3',
    },
    { type: 'contact_out_of_scope', text: 'Out of scope.', contextToken: 'c3' },
    { type: 'contact_blocked', text: 'Blocked.', contextToken: 'c3' },
    { type: 'contact_unavailable', text: 'Unavailable.' },
    { type: 'contact_unavailable', text: 'Unavailable.', contextToken: 'c3' },
    {
      type: 'contact_review',
      template: 'bug_report',
      originalSubmission: submission,
      refinedSubmission: submission,
      refined: true,
      contextToken: 'c4',
    },
    { type: 'contact_editing', template: 'bug_report', contextToken: 'c4' },
    { type: 'contact_send_error', reason: 'turnstile', text: 'Check expired.', contextToken: 'c4' },
    { type: 'contact_delivery', template: 'email', receiptStatus: 'sent', contextToken: 'c5' },
    { type: 'contact_delivery', template: 'email', receiptStatus: 'failed', contextToken: 'c5' },
    { type: 'contact_discarded', text: 'Discarded.', contextToken: 'c6' },
    { type: 'contact_new_chat', text: 'New chat.', contextToken: 'c7' },
  ]

  it('round-trips every streamed event through the wire parser', () => {
    for (const event of everyStreamedEvent) {
      expect(parseChatStreamFrame(encodeChatEvent(event).trim())).toEqual(event)
    }
  })

  it('rejects a frame whose payload does not match the SSE event name', () => {
    // The hand-rolled switch this replaced branched on the frame name and read
    // the body untyped, so a mislabelled frame was acted on as its name.
    expect(parseChatStreamFrame('event: done\ndata: {"type":"token","delta":"x"}')).toBeNull()
    expect(parseChatStreamFrame('event: nope\ndata: {"type":"token","delta":"x"}')).toBeNull()
  })

  it('validates citations and strips unknown citation keys', () => {
    const parsed = parseChatStreamFrame(
      'event: citations\ndata: {"type":"citations","citations":[{"id":"K1","title":"t","url":"https://a.test","isPublic":true,"chunkText":"private index text","internalId":"internal-id"}]}',
    )
    expect(parsed).toEqual({
      type: 'citations',
      citations: [{ id: 'K1', title: 't', url: 'https://a.test', isPublic: true }],
    })
    expect(JSON.stringify(parsed)).not.toContain('private index text')

    // A citation missing a required field invalidates the array, so the frame
    // is dropped whole rather than rendered with a half-typed citation.
    expect(
      parseChatStreamFrame(
        'event: citations\ndata: {"type":"citations","citations":[{"id":"K1","title":"t","url":"https://a.test"}]}',
      ),
    ).toBeNull()
  })

  it('keeps the fallbacks the client used to apply by hand', () => {
    expect(parseChatStreamFrame('event: token\ndata: {"type":"token"}')).toEqual({ type: 'token', delta: '' })
    expect(parseChatStreamFrame('event: tool_start\ndata: {"type":"tool_start","name":"knowledge"}')).toEqual({
      type: 'tool_start',
      name: 'knowledge',
      label: 'WORKING…',
    })
    expect(parseChatStreamFrame('event: error\ndata: {"type":"error"}')).toEqual({
      type: 'error',
      message: CHAT_OFFLINE_MESSAGE,
    })
  })

  it('accepts every contact template the templates module declares and rejects unknown ones', () => {
    const templates = Object.keys(CHAT_CONTACT_TEMPLATES)
    expect(templates.length).toBeGreaterThan(0)
    for (const template of templates) {
      expect(
        chatContactActionSchema.safeParse({ action: 'select_template', contextToken: 'signed', template }).success,
      ).toBe(true)
    }
    expect(
      chatContactActionSchema.safeParse({ action: 'select_template', contextToken: 'signed', template: 'newsletter' })
        .success,
    ).toBe(false)
  })

  it('keeps the citation schema in step with the retrieval citation interface', () => {
    // Assigning `true` fails to compile the moment a field is added to
    // `PublicCitation` without a matching validator here.
    const parity: ChatCitationParity = true
    expect(parity).toBe(true)
  })
})
