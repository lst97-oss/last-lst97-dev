import { describe, expect, it } from 'bun:test'

import { CHAT_CONTACT_FLOW_DIAGRAM, CHAT_PIPELINE_DIAGRAM } from '../src/components/site/chat/chat-pipeline-diagram'

describe('chat pipeline diagram', () => {
  it('gates reranked knowledge passages through Jev before including them in the answer evidence', () => {
    expect(CHAT_PIPELINE_DIAGRAM).toContain('RERANK KNOWLEDGE RESULTS')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('JEV RELEVANCE CHECK')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('DISCARD PASSAGE')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('COLLECT ACCEPTED KNOWLEDGE')
  })

  it('shows one constrained argument repair followed by schema revalidation', () => {
    expect(CHAT_PIPELINE_DIAGRAM).toContain('One repair attempt')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('Same approved tool name + call id')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('Revalidate repaired JSON')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('No source query runs')
  })

  it('verifies the signed context and Jev history decision before screening', () => {
    expect(CHAT_PIPELINE_DIAGRAM).toContain('VERIFY SIGNED CONTEXT')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('HMAC signature')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('CONTEXT REJECTED')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('VERIFIED CONVERSATION CONTEXT')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('JEV HISTORY CONTEXT DECISION')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('last 6 verified messages')
  })

  it('states the answer model reads the full history and that the context is re-signed after the reply', () => {
    expect(CHAT_PIPELINE_DIAGRAM).toContain('Full verified chat history')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('Reads the whole conversation, not the question alone')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('SIGN NEXT CONTEXT')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('Next turn returns this token')
  })

  it('decides contact intent in the same Jev screening request and hands off to the contact workflow', () => {
    expect(CHAT_PIPELINE_DIAGRAM).toContain('CONTACT INTENT?')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('From the same Jev screening request')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('CONTACT WORKFLOW · SEE THE SECOND DIAGRAM')
    expect(CHAT_PIPELINE_DIAGRAM).toContain('nothing is sent until you confirm')
  })

  it('requires a confirmed offer before a contact session clears the earlier chat', () => {
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('PENDING CONTACT OFFER')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('Nothing is sent without your confirmation')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('FRESH CONTACT SESSION')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('Earlier chat messages are cleared and never emailed')
  })

  it('screens template choice and the submitted form before any refinement happens', () => {
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('JEV TEMPLATE SCREEN')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('FILL AND SCREEN THE FORM')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('per-field presence')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('STOP · CONTACT REQUEST NOT ADVANCED')
  })

  it('refines only bug and feature content and shows both versions before sending', () => {
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('BUG OR FEATURE CONTENT?')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('OPENROUTER REFINEMENT')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('Meaning-preserving clarity edit')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('Email is sent as written')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('REVIEW BOTH VERSIONS')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('HMAC proof binds approval to this exact pair')
  })

  it('gates sending on Turnstile, rate limits, and a one-time claim before the email goes out', () => {
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('SEND GATE')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('Turnstile recheck')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('One-time claim blocks a duplicate send')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('OWNER EMAIL, THEN YOUR RECEIPT')
    expect(CHAT_CONTACT_FLOW_DIAGRAM).toContain('A failed receipt never undoes delivery')
  })

  it('numbers only the normal chat pipeline and leaves the separate contact flow unnumbered', () => {
    const stepPattern = new RegExp(`(\\d{2}) ${String.fromCharCode(0xB7)} `, 'g')
    // Source order is not stage order: "11 · RESULTS FOR THIS TURN" is declared
    // next to the Jev routing branch, so assert the set, not the sequence.
    const numbers = [...CHAT_PIPELINE_DIAGRAM.matchAll(stepPattern)].map((match) => Number(match[1])).sort((a, b) => a - b)
    expect(numbers).toEqual(Array.from({ length: 15 }, (_, index) => index + 1))
    expect(CHAT_CONTACT_FLOW_DIAGRAM).not.toMatch(stepPattern)
  })
})
