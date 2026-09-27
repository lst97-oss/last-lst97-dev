import { describe, expect, it } from 'bun:test'

import { createChatContextSigner } from '../../src/server/chat/context-signer'
import { createChatContactWorkflow } from '../../src/server/chat/contact-workflow'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'
import type { ChatContactActionRequest } from '../../src/server/chat/events'

const secret = 'a-secret-key-with-at-least-32-characters'
const originalBug: ChatContactSubmission = {
  template: 'bug_report',
  fields: {
    name: 'Alex', email: 'alex@example.com', summary: 'Filter dont work',
    expectedBehaviour: 'Only selected projects show.', stepsToReproduce: '1. Open projects.\n2. Click filter.',
    evidence: '', impact: '', extraContext: '', environment: '',
  },
}
const refinedBug: ChatContactSubmission = {
  ...originalBug,
  fields: {
    ...originalBug.fields,
    summary: 'The project filter does not work.',
    expectedBehaviour: 'Only the selected projects should appear.',
    stepsToReproduce: '1. Open the projects page.\n2. Select a filter.',
  },
}

function request(action: ChatContactActionRequest['action'], contextToken: string, extra: Record<string, unknown> = {}): ChatContactActionRequest {
  return { action, contextToken, expectedHostname: 'example.com', requestId: 'request-1', ...extra } as ChatContactActionRequest
}

function createWorkflow(overrides: Record<string, unknown> = {}) {
  const contextSigner = createChatContextSigner(secret)
  const submitted: unknown[] = []
  const jevInputs: unknown[] = []
  const refinerInputs: unknown[] = []
  const workflow = createChatContactWorkflow({
    contextSigner,
    moderation: {
      checkContactWorkflow: async (input: unknown) => {
        jevInputs.push(input)
        return { allowed: true, missingFields: [], invalidFields: [] }
      },
    } as never,
    refiner: {
      refine: async (submission: ChatContactSubmission) => {
        refinerInputs.push(submission)
        return { ok: true, submission: submission.template === 'bug_report' ? refinedBug : submission }
      },
    } as never,
    submitContact: async (input: unknown) => {
      submitted.push(input)
      return { ok: true, receiptStatus: 'sent' }
    },
    ...overrides,
  } as never)
  return { contextSigner, workflow, submitted, jevInputs, refinerInputs }
}

describe('chat contact workflow controller', () => {
  it('starts a context-free contact session only after the pending confirmation', async () => {
    const { contextSigner, workflow } = createWorkflow()
    const pending = await contextSigner.sign({
      messages: [{ role: 'user', content: 'Normal private chat detail' }], topicAnchors: [],
      workflow: { mode: 'normal', phase: 'contact_confirmation' },
    })

    const result = await workflow.handle(request('start_contact', pending))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.event.type).toBe('contact_started')
    if (result.event.type !== 'contact_started') return
    const context = await contextSigner.verify(result.event.contextToken)
    expect(context?.messages).toEqual([])
    expect(context?.workflow).toEqual({ mode: 'contact', phase: 'template_selection' })
    expect(JSON.stringify(context)).not.toContain('Normal private chat detail')
  })

  it('screens and locks the selected template, then sends only refined content with original PDF source data', async () => {
    const { contextSigner, workflow, jevInputs, refinerInputs, submitted } = createWorkflow()
    const pending = await contextSigner.sign({ messages: [], topicAnchors: [], workflow: { mode: 'normal', phase: 'contact_confirmation' } })
    const started = await workflow.handle(request('start_contact', pending))
    if (!started.ok || started.event.type !== 'contact_started') throw new Error('contact did not start')
    const selected = await workflow.handle(request('select_template', started.event.contextToken, { template: 'bug_report' }))
    if (!selected.ok || selected.event.type !== 'contact_template_selected') throw new Error('template was not selected')
    expect(jevInputs[0]).toMatchObject({ phase: 'template', template: 'bug_report', fields: {} })
    expect(JSON.stringify(jevInputs)).not.toContain('Normal private chat detail')

    const reviewed = await workflow.handle(request('submit_form', selected.event.contextToken, { fields: originalBug.fields }))
    expect(reviewed.ok).toBe(true)
    if (!reviewed.ok || reviewed.event.type !== 'contact_review') return
    expect(refinerInputs).toEqual([originalBug])
    expect(reviewed.event.originalSubmission).toEqual(originalBug)
    expect(reviewed.event.refinedSubmission).toEqual(refinedBug)
    const reviewContext = await contextSigner.verify(reviewed.event.contextToken)
    expect(reviewContext?.messages).toEqual([])
    expect(JSON.stringify(reviewContext)).not.toContain('Filter dont work')

    const changed = await workflow.handle(request('confirm_send', reviewed.event.contextToken, {
      refinedSubmission: { ...refinedBug, fields: { ...refinedBug.fields, summary: 'Changed after review' } },
      originalSubmission: originalBug,
      turnstileToken: 'valid-token',
    }))
    expect(changed).toMatchObject({ ok: false, reason: 'invalid_review' })
    expect(submitted).toHaveLength(0)

    const delivered = await workflow.handle(request('confirm_send', reviewed.event.contextToken, {
      refinedSubmission: refinedBug,
      originalSubmission: originalBug,
      turnstileToken: 'valid-token',
    }))
    expect(delivered.ok).toBe(true)
    if (!delivered.ok || delivered.event.type !== 'contact_delivery') return
    expect(delivered.event.receiptStatus).toBe('sent')
    expect(submitted).toEqual([expect.objectContaining({ submission: refinedBug, originalSubmission: originalBug })])
    expect((await contextSigner.verify(delivered.event.contextToken))?.workflow).toEqual({ mode: 'contact', phase: 'delivered', template: 'bug_report' })
  })

  it('keeps template and phase locked when Jev says the new content is out of scope', async () => {
    const { contextSigner, workflow } = createWorkflow({
      moderation: {
        checkContactWorkflow: async ({ phase }: { phase: string }) => phase === 'template'
          ? { allowed: true, missingFields: [], invalidFields: [] }
          : { allowed: false, reason: 'out_of_scope' },
      },
    })
    const pending = await contextSigner.sign({ messages: [], topicAnchors: [], workflow: { mode: 'normal', phase: 'contact_confirmation' } })
    const started = await workflow.handle(request('start_contact', pending))
    if (!started.ok || started.event.type !== 'contact_started') throw new Error('contact did not start')
    const selected = await workflow.handle(request('select_template', started.event.contextToken, { template: 'bug_report' }))
    if (!selected.ok || selected.event.type !== 'contact_template_selected') throw new Error('template was not selected')
    const outOfScope = await workflow.handle(request('submit_form', selected.event.contextToken, { fields: originalBug.fields }))

    expect(outOfScope).toMatchObject({ ok: true, event: { type: 'contact_out_of_scope', contextToken: selected.event.contextToken } })
    expect((await contextSigner.verify(selected.event.contextToken))?.workflow).toEqual({ mode: 'contact', phase: 'filling', template: 'bug_report' })
  })

  it('does not refine or send a safety-rejected form and only discards on explicit confirmation', async () => {
    const { contextSigner, workflow, refinerInputs, submitted } = createWorkflow({
      moderation: {
        checkContactWorkflow: async ({ phase }: { phase: string }) => phase === 'template'
          ? { allowed: true, missingFields: [], invalidFields: [] }
          : { allowed: false, reason: 'unsafe' },
      },
    })
    const pending = await contextSigner.sign({ messages: [], topicAnchors: [], workflow: { mode: 'normal', phase: 'contact_confirmation' } })
    const started = await workflow.handle(request('start_contact', pending))
    if (!started.ok || started.event.type !== 'contact_started') throw new Error('contact did not start')
    const selected = await workflow.handle(request('select_template', started.event.contextToken, { template: 'bug_report' }))
    expect(selected).toMatchObject({ ok: true, event: { type: 'contact_template_selected' } })
    if (!selected.ok || selected.event.type !== 'contact_template_selected') return
    const attempted = await workflow.handle(request('submit_form', selected.event.contextToken, { fields: originalBug.fields }))
    expect(attempted).toMatchObject({ ok: true, event: { type: 'contact_blocked' } })
    expect(refinerInputs).toHaveLength(0)
    expect(submitted).toHaveLength(0)
    expect(await workflow.handle(request('discard_contact', selected.event.contextToken, { confirmed: false }))).toMatchObject({ ok: false, reason: 'invalid_transition' })
    const discarded = await workflow.handle(request('discard_contact', selected.event.contextToken, { confirmed: true }))
    expect(discarded).toMatchObject({ ok: true, event: { type: 'contact_discarded' } })
    if (discarded.ok && discarded.event.type === 'contact_discarded') {
      expect(await contextSigner.verify(discarded.event.contextToken)).toMatchObject({ messages: [], workflow: { mode: 'normal', phase: 'conversation' } })
    }
  })
})
