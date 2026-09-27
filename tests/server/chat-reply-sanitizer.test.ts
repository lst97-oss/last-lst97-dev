import { describe, expect, it } from 'bun:test'

import { createAssistantReplyStreamSanitizer, sanitizeAssistantReply } from '../../src/server/chat/reply-sanitizer'

function sanitizeChunks(chunks: string[]): string {
  const sanitizer = createAssistantReplyStreamSanitizer()
  return chunks.map((chunk) => sanitizer.push(chunk)).join('') + sanitizer.finish()
}

describe('assistant reply sanitizer', () => {
  const leakedReply = "I'll look up details.\n<tool_call>search_knowledge<arg_key>query</arg_key><arg_value>demo</arg_value></tool_call>Here is the answer."

  it('removes progress narration and tool syntax from a complete reply', () => {
    expect(sanitizeAssistantReply(leakedReply)).toBe('Here is the answer.')
  })

  it('handles tool markers split across stream chunks', () => {
    const tagBoundaries = [
      "I'll look up details.\n<tool_",
      'call>search_knowledge<arg_key>query</arg_key>',
      '<arg_value>demo</arg_value></tool_call>',
      'Here is the answer.',
    ]
    const characterChunks = [...leakedReply]

    expect(sanitizeChunks(tagBoundaries)).toBe('\nHere is the answer.')
    expect(sanitizeChunks(characterChunks)).toBe('\nHere is the answer.')
  })

  it('does not emit hidden tool content before the closing marker arrives', () => {
    const sanitizer = createAssistantReplyStreamSanitizer()
    expect(sanitizer.push('I will check the requested details. <tool_call>private args')).toBe(' ')
    expect(sanitizer.push('</tool_call> Safe ending.')).toBe('')
    expect(sanitizer.finish()).toBe(' Safe ending.')
  })
})
