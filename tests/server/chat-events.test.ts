import { describe, expect, it } from 'bun:test'

import * as chatEvents from '../../src/server/chat/events'

const chatStatusLabel = (chatEvents as unknown as { chatStatusLabel?: (status: unknown) => string | null }).chatStatusLabel
const { encodeChatEvent, parseEventFrame, splitEventFrames } = chatEvents

describe('chat stream events', () => {
  it('frames events as SSE with a JSON payload', () => {
    expect(encodeChatEvent({ type: 'token', delta: 'Hello' })).toBe('event: token\ndata: {"type":"token","delta":"Hello"}\n\n')
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
    const parsed = parseEventFrame(encodeChatEvent({ type: 'tool_start', name: 'coding_stats', label: 'CHECKING…' }).trim())
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
