import { describe, expect, it } from 'bun:test'

import { createChatContextSigner } from '../../src/server/chat/context-signer'
import type { ChatTopicAnchor } from '../../src/server/chat/types'

const turns = [
  { role: 'user' as const, content: 'Question' },
  { role: 'assistant' as const, content: 'Answer' },
]
const secret = 'a-secret-key-with-at-least-32-characters'
const anchor: ChatTopicAnchor = {
  question: 'What experience does Nelson have?',
  observedAtUtc: '2026-09-24T00:00:00.000Z',
  tools: [{ name: 'search_knowledge', arguments: { query: 'Nelson work experience' }, status: 'completed' }],
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

async function signedPayload(payload: unknown): Promise<string> {
  const encoded = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded)))
  return `${encoded}.${encodeBase64Url(signature)}`
}

describe('chat context signer', () => {
  it('round trips bounded turns in a signed expiring token', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signer.sign({ messages: turns, topicAnchors: [anchor] } as never)
    await expect(signer.verify(token)).resolves.toEqual({
      messages: turns,
      topicAnchors: [anchor],
      projectListState: { clarificationAsked: false, shownProjectIds: [], shortlistStarted: false },
      workflow: { mode: 'normal', phase: 'conversation' },
    })
  })

  it('round trips bounded project discovery state and catalogue filters in version 5 contexts', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const context = {
      messages: turns,
      topicAnchors: [anchor],
      projectListState: {
        clarificationAsked: true,
        shownProjectIds: ['lst97/first', 'lst97/second'],
        shortlistStarted: true,
        activeFilters: { languages: ['Python'], kinds: ['cli_tool' as const], limit: 10 },
      },
    }

    await expect(signer.verify(await signer.sign(context))).resolves.toEqual({
      ...context,
      workflow: { mode: 'normal', phase: 'conversation' },
    })
  })

  it('accepts version 2 contexts with empty project discovery state', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signedPayload({
      version: 2,
      expiresAt: 86_401_000,
      messages: turns,
      topicAnchors: [anchor],
    })

    await expect(signer.verify(token)).resolves.toEqual({
      messages: turns,
      topicAnchors: [anchor],
      projectListState: { clarificationAsked: false, shownProjectIds: [], shortlistStarted: false },
      workflow: { mode: 'normal', phase: 'conversation' },
    })
  })

  it('drops invalid and duplicate project IDs and caps project discovery state', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const oversized = Array.from({ length: 205 }, (_, index) => `lst97/project-${index}`)
    const token = await signer.sign({
      messages: turns,
      topicAnchors: [],
      projectListState: {
        clarificationAsked: true,
        shownProjectIds: ['lst97/valid', 'lst97/valid', 'someone-else/private', 'lst97/has space', ...oversized],
      },
    } as never)
    const result = await signer.verify(token)

    expect(result?.projectListState?.clarificationAsked).toBe(true)
    expect(result?.projectListState?.shownProjectIds).toHaveLength(200)
    expect(result?.projectListState?.shownProjectIds?.slice(0, 2)).toEqual(['lst97/valid', 'lst97/project-0'])
    expect(new Set(result?.projectListState?.shownProjectIds).size).toBe(
      result?.projectListState?.shownProjectIds?.length ?? 0,
    )
  })

  it('accepts a valid signed legacy message-only payload as an empty-anchor context', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signedPayload({ expiresAt: 86_401_000, messages: turns })
    await expect(signer.verify(token)).resolves.toEqual({
      messages: turns,
      topicAnchors: [],
      projectListState: { clarificationAsked: false, shownProjectIds: [], shortlistStarted: false },
      workflow: { mode: 'normal', phase: 'conversation' },
    })
  })

  it('clears normal conversation context from a confirmed contact session', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signer.sign({
      messages: turns,
      topicAnchors: [anchor],
      workflow: { mode: 'contact', phase: 'template_selection' },
    })
    const decoded = JSON.parse(atob(token.split('.')[0]!.replaceAll('-', '+').replaceAll('_', '/'))) as Record<
      string,
      unknown
    >

    expect(await signer.verify(token)).toEqual({
      messages: [],
      topicAnchors: [],
      projectListState: { clarificationAsked: false, shownProjectIds: [], shortlistStarted: false },
      workflow: { mode: 'contact', phase: 'template_selection' },
    })
    expect(JSON.stringify(decoded)).not.toContain('Question')
    expect(JSON.stringify(decoded)).not.toContain('Answer')
  })

  it('keeps contact confirmation in normal mode and binds review approval to exact draft values', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const pending = await signer.verify(
      await signer.sign({
        messages: turns,
        topicAnchors: [anchor],
        workflow: { mode: 'normal', phase: 'contact_confirmation' },
      }),
    )
    expect(pending?.workflow).toEqual({ mode: 'normal', phase: 'contact_confirmation' })
    expect(pending?.messages).toEqual(turns)

    const fields = {
      email: 'person@example.com',
      summary: 'A crash',
      expectedBehaviour: 'It should load',
      stepsToReproduce: 'Open the page',
    }
    const originalFields = { ...fields, summary: 'A problem' }
    const proof = await signer.createContactReviewProof('bug_report', fields, originalFields)
    expect(proof).not.toContain('person@example.com')
    await expect(signer.verifyContactReviewProof('bug_report', fields, proof, originalFields)).resolves.toBe(true)
    await expect(
      signer.verifyContactReviewProof('bug_report', fields, proof, { ...originalFields, summary: 'changed original' }),
    ).resolves.toBe(false)
    await expect(
      signer.verifyContactReviewProof('bug_report', { ...fields, summary: 'Changed after review' }, proof),
    ).resolves.toBe(false)
    await expect(signer.verifyContactReviewProof('feature_request', fields, proof)).resolves.toBe(false)
  })

  it('rejects contact contexts that try to carry messages or review fields in the token', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signedPayload({
      version: 5,
      expiresAt: 86_401_000,
      messages: turns,
      topicAnchors: [],
      projectListState: { clarificationAsked: false, shownProjectIds: [] },
      workflow: {
        mode: 'contact',
        phase: 'fill_form',
        template: 'bug_report',
        fields: { summary: 'private draft text' },
      },
    })

    await expect(signer.verify(token)).resolves.toBeNull()
  })

  it('caps anchors and rejects invalid signed anchor fields', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const anchors = Array.from({ length: 12 }, (_, index) => ({ ...anchor, question: `question ${index}` }))
    const token = await signer.sign({ messages: turns, topicAnchors: anchors } as never)
    const result = (await signer.verify(token)) as { messages: typeof turns; topicAnchors: typeof anchors } | null
    expect(result?.topicAnchors.length).toBe(8)
    expect(result?.topicAnchors[0]?.question).toBe('question 4')

    const invalidToken = await signedPayload({
      version: 2,
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

  it('retains forty signed messages within the chat endpoint token budget for multibyte text', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const largeContext = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: '🧪'.repeat(1_000),
    }))
    const token = await signer.sign(largeContext)
    expect(token.length).toBeLessThanOrEqual(1_500_000)
    expect(await signer.verify(token)).toEqual({
      messages: largeContext,
      topicAnchors: [],
      projectListState: { clarificationAsked: false, shownProjectIds: [], shortlistStarted: false },
      workflow: { mode: 'normal', phase: 'conversation' },
    })
  })

  it('truncates oversized server generated messages and anchor questions before signing', async () => {
    const signer = createChatContextSigner(secret, () => 1_000)
    const token = await signer.sign({
      messages: [{ role: 'assistant', content: 'x'.repeat(2_001) }],
      topicAnchors: [{ ...anchor, question: 'q'.repeat(501) }],
    })

    await expect(signer.verify(token)).resolves.toMatchObject({
      messages: [{ role: 'assistant', content: 'x'.repeat(2_000) }],
      topicAnchors: [{ question: 'q'.repeat(500) }],
    })
  })
})
