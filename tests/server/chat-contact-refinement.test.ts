import { describe, expect, it } from 'bun:test'

import { createChatContactRefiner, type ChatContactRefinementRequest } from '../../src/server/contact/chat-contact-refinement'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'

const bug: ChatContactSubmission = {
  template: 'bug_report',
  fields: {
    name: 'Alex Visitor',
    email: 'alex@example.com',
    summary: 'filter dont work',
    expectedBehaviour: 'it should show only selected items',
    stepsToReproduce: '1. go project page\n2. click filter',
    evidence: '', impact: '', extraContext: '', environment: '',
  },
}

describe('chat contact report refinement', () => {
  it('refines only report content with JSON mode and server validation while preserving contact fields', async () => {
    let request: ChatContactRefinementRequest | undefined
    const refiner = createChatContactRefiner({
      model: 'openai/test-model',
      complete: async (input) => {
        request = input
        return {
          content: JSON.stringify({
            fields: {
              summary: 'The project filter does not work.',
              expectedBehaviour: 'The page should show only the selected items.',
              stepsToReproduce: '1. Open the projects page.\n2. Select a filter.',
              evidence: '', impact: '', extraContext: '', environment: '',
            },
          }),
          model: 'openai/test-model-2026-09-26',
          usage: { promptTokens: 80, completionTokens: 42, totalTokens: 122 },
        }
      },
    })
    const modelCalls: unknown[] = []

    const result = await refiner.refine(bug, (call) => modelCalls.push(call))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.submission.fields).toMatchObject({
      name: 'Alex Visitor',
      email: 'alex@example.com',
      summary: 'The project filter does not work.',
    })
    expect(request?.messages).toHaveLength(2)
    expect(request?.messages[0]?.role).toBe('system')
    expect(request?.messages[1]?.content).toContain('filter dont work')
    expect(request?.messages[1]?.content).not.toContain('Alex Visitor')
    expect(request?.messages[1]?.content).not.toContain('alex@example.com')
    expect(request?.messages[1]?.content).not.toContain('previous conversation')
    expect(request?.responseFormat).toEqual({ type: 'json_object' })
    expect(request?.messages[0]?.content).toContain('Return only valid JSON')
    expect(modelCalls).toEqual([{
      provider: 'openrouter', operation: 'contact_refinement', model: 'openai/test-model-2026-09-26', status: 'succeeded',
      inputTokens: 80, outputTokens: 42, totalTokens: 122,
    }])
  })

  it('does not call OpenRouter for a normal email message', async () => {
    let calls = 0
    const refiner = createChatContactRefiner({
      model: 'openai/test-model',
      complete: async () => { calls += 1; throw new Error('must not run') },
    })
    const email: ChatContactSubmission = {
      template: 'email',
      fields: { name: '', email: 'alex@example.com', message: 'Please contact me.' },
    }

    const result = await refiner.refine(email)

    expect(result.ok).toBe(true)
    expect(calls).toBe(0)
    if (result.ok) expect(result.submission).toEqual(email)
  })

  it('fails closed for malformed or materially incomplete model output', async () => {
    const malformed = createChatContactRefiner({ model: 'model', complete: async () => ({ content: 'not json' }) })
    const missingRequired = createChatContactRefiner({
      model: 'model',
      complete: async () => ({ content: JSON.stringify({ fields: { summary: '', expectedBehaviour: 'Expected.', stepsToReproduce: 'Step 1', evidence: '', impact: '', extraContext: '', environment: '' } }) }),
    })

    expect(await malformed.refine(bug)).toEqual({ ok: false, reason: 'unavailable' })
    expect(await missingRequired.refine(bug)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('accepts omitted blank optional fields and keeps them blank', async () => {
    const refiner = createChatContactRefiner({
      model: 'model',
      complete: async () => ({
        content: JSON.stringify({ fields: {
          summary: 'The project filter does not work.',
          expectedBehaviour: 'The page should show only the selected items.',
          stepsToReproduce: '1. Open the projects page. 2. Select a filter.',
        } }),
      }),
    })

    const result = await refiner.refine(bug)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.submission.fields).toMatchObject({ evidence: '', impact: '', extraContext: '', environment: '' })
    }
  })

  it('accepts text-block response content from the OpenRouter SDK', async () => {
    const refiner = createChatContactRefiner({
      model: 'model',
      complete: async () => ({
        content: [{ type: 'text', text: JSON.stringify({ fields: {
          summary: 'The project filter does not work.',
          expectedBehaviour: 'The page should show only the selected items.',
          stepsToReproduce: '1. Open the projects page. 2. Select a filter.',
        } }) }],
      }),
    })

    expect((await refiner.refine(bug)).ok).toBe(true)
  })

  it('preserves a supplied optional report detail when the model omits it', async () => {
    const report: ChatContactSubmission = {
      ...bug,
      fields: { ...bug.fields, evidence: 'The browser console reports TypeError.' },
    }
    const refiner = createChatContactRefiner({
      model: 'model',
      complete: async () => ({
        content: JSON.stringify({
          fields: {
            summary: 'The project filter does not work.',
            expectedBehaviour: 'The page should show only selected items.',
            stepsToReproduce: '1. Open the projects page.\n2. Select a filter.',
            evidence: '',
          },
        }),
      }),
    })

    const result = await refiner.refine(report)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.submission.fields).toMatchObject({ evidence: 'The browser console reports TypeError.' })
  })

  it('never falls back to sending raw content when OpenRouter fails', async () => {
    const refiner = createChatContactRefiner({ model: 'model', complete: async () => { throw new Error('provider unavailable') } })

    expect(await refiner.refine(bug)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('records a content-free provider failure category', async () => {
    const details = Object.assign(new Error('private provider details'), { code: 'ENOTFOUND' })
    const refiner = createChatContactRefiner({ model: 'model', complete: async () => { throw new Error('request failed', { cause: details }) } })
    const modelCalls: unknown[] = []

    await refiner.refine(bug, (call) => modelCalls.push(call))

    expect(modelCalls).toEqual([{
      provider: 'openrouter', operation: 'contact_refinement', model: 'model', status: 'failed',
      failureCategory: 'provider_connection_failed',
    }])
    expect(JSON.stringify(modelCalls)).not.toContain('private provider details')
  })
})
