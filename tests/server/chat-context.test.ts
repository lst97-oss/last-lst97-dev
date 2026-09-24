import { describe, expect, it } from 'bun:test'

import { createChatContextSigner } from '../../src/server/chat/context-signer'

const turns = [{ role: 'user' as const, content: 'Question' }, { role: 'assistant' as const, content: 'Answer' }]
const secret = 'a-secret-key-with-at-least-32-characters'
const anchor = {
  question: 'What experience does Nelson have?',
  observedAtUtc: '2026-09-24T00:00:00.000Z',
  tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson work experience' }, status: 'completed' }],
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function signedPayload(payload: unknown): Promise<string> {
  const encoded = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded)))
  return `${encoded}.${encodeBase64Url(signature)}`
}

describe('chat context signer', () => {
  it('round trips bounded turns in a signed expiring token', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signer.sign({ messages: turns, topicAnchors: [anchor] } as never)
    await expect(signer.verify(token)).resolves.toEqual({ messages: turns, topicAnchors: [anchor] })
  })

  it('accepts a valid signed legacy message-only payload as an empty-anchor context', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signedPayload({ expiresAt: 86_401_000, messages: turns })
    await expect(signer.verify(token)).resolves.toEqual({ messages: turns, topicAnchors: [] })
  })

  it('caps anchors and rejects invalid signed anchor fields', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const anchors = Array.from({ length: 12 }, (_, index) => ({ ...anchor, question: `question ${index}` }))
    const token = await signer.sign({ messages: turns, topicAnchors: anchors } as never)
    const result = await signer.verify(token) as { messages: typeof turns; topicAnchors: typeof anchors } | null
    expect(result?.topicAnchors.length).toBe(8)
    expect(result?.topicAnchors[0]?.question).toBe('question 4')

    const invalidToken = await signedPayload({
      expiresAt: 86_401_000,
      messages: turns,
      topicAnchors: [{ ...anchor, observedAtUtc: 'yesterday', tools: [{ ...anchor.tools[0], status: 'raw-output' }] }],
    })
    await expect(signer.verify(invalidToken)).resolves.toBeNull()
  })

  it('rejects tampering and expired context', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signer.sign(turns)
    const [payload, signature] = token.split('.')
    await expect(signer.verify(`${payload}.x${signature?.slice(1)}`)).resolves.toBeNull()

    const later = createChatContextSigner(secret, () => 86_401_000)
    await expect(later.verify(token)).resolves.toBeNull()
  })

  it('rejects malformed signing secrets', () => {
    expect(() => createChatContextSigner('short')).toThrow()
  })

  it('keeps signed context within the chat endpoint token budget for multibyte text', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const largeContext = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: '🧪'.repeat(1_000),
    }))
    const token = await signer.sign(largeContext)
    expect(token.length).toBeLessThanOrEqual(60_000)
    expect(await signer.verify(token)).not.toBeNull()
  })
})
