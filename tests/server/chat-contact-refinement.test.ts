import { describe, expect, it } from 'bun:test'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'
import { type ChatContactRefinementRequest, createChatContactRefiner } from '../../src/server/contact/chat/refinement'

const bug: ChatContactSubmission = {
  template: 'bug_report',
  fields: {
    name: 'Alex Visitor',
    email: 'alex@example.com',
    summary: 'filter dont work',
    expectedBehaviour: 'it should show only selected items',
    stepsToReproduce: '1. go project page\n2. click filter',
    evidence: '',
    impact: '',
    extraContext: '',
    environment: '',
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
              evidence: '',
              impact: '',
              extraContext: '',
              environment: '',
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
    expect(modelCalls).toEqual([
      {
        provider: 'openrouter',
        operation: 'contact_refinement',
        model: 'openai/test-model-2026-09-26',
        status: 'succeeded',
        inputTokens: 80,
        outputTokens: 42,
        totalTokens: 122,
      },
    ])
  })

  it('does not call OpenRouter for a normal email message', async () => {
    let calls = 0
    const refiner = createChatContactRefiner({
      model: 'openai/test-model',
      complete: async () => {
        calls += 1
        throw new Error('must not run')
      },
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

  it('never sends malformed or materially incomplete model output, falling back to the original', async () => {
    // Refinement is a convenience, not a gate: unusable model output must never
    // reach the operator. The request still succeeds, carrying the visitor's own
    // already-validated words with `refined: false`.
    const malformed = createChatContactRefiner({ model: 'model', complete: async () => ({ content: 'not json' }) })
    const missingRequired = createChatContactRefiner({
      model: 'model',
      complete: async () => ({
        content: JSON.stringify({
          fields: {
            summary: '',
            expectedBehaviour: 'Expected.',
            stepsToReproduce: 'Step 1',
            evidence: '',
            impact: '',
            extraContext: '',
            environment: '',
          },
        }),
      }),
    })

    expect(await malformed.refine(bug)).toMatchObject({ ok: true, refined: false, submission: bug })
    expect(await missingRequired.refine(bug)).toMatchObject({ ok: true, refined: false, submission: bug })
  })

  it('still fails when the provider itself cannot be reached', async () => {
    // The one case that must NOT fall back: there is no model output at all, so
    // there is nothing to judge and the contact workflow has to report it.
    const unreachable = createChatContactRefiner({
      model: 'model',
      complete: async () => {
        throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
      },
    })

    expect(await unreachable.refine(bug)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('accepts omitted blank optional fields and keeps them blank', async () => {
    const refiner = createChatContactRefiner({
      model: 'model',
      complete: async () => ({
        content: JSON.stringify({
          fields: {
            summary: 'The project filter does not work.',
            expectedBehaviour: 'The page should show only the selected items.',
            stepsToReproduce: '1. Open the projects page. 2. Select a filter.',
          },
        }),
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
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fields: {
                summary: 'The project filter does not work.',
                expectedBehaviour: 'The page should show only the selected items.',
                stepsToReproduce: '1. Open the projects page. 2. Select a filter.',
              },
            }),
          },
        ],
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
    if (result.ok)
      expect(result.submission.fields).toMatchObject({ evidence: 'The browser console reports TypeError.' })
  })

  it('never falls back to sending raw content when OpenRouter fails', async () => {
    const refiner = createChatContactRefiner({
      model: 'model',
      complete: async () => {
        throw new Error('provider unavailable')
      },
    })

    expect(await refiner.refine(bug)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('records a content-free provider failure category', async () => {
    const details = Object.assign(new Error('private provider details'), { code: 'ENOTFOUND' })
    const refiner = createChatContactRefiner({
      model: 'model',
      complete: async () => {
        throw new Error('request failed', { cause: details })
      },
    })
    const modelCalls: unknown[] = []

    await refiner.refine(bug, (call) => modelCalls.push(call))

    expect(modelCalls).toEqual([
      {
        provider: 'openrouter',
        operation: 'contact_refinement',
        model: 'model',
        status: 'failed',
        failureCategory: 'provider_connection_failed',
      },
    ])
    expect(JSON.stringify(modelCalls)).not.toContain('private provider details')
  })

  it('refines a quotation without letting the model invent optional scope or see contact details', async () => {
    const quotation: ChatContactSubmission = {
      template: 'quotation',
      fields: {
        name: 'Ada Visitor',
        email: 'ada@example.com',
        businessName: 'Bright Lane',
        packageInterest: 'Business — from A$2,200 (recommended)',
        existingWebsite: 'https://bright-lane.example',
        requiredPages: 'home about contact',
        requiredFeatures: 'Contact or enquiry form',
        otherFeatures: '',
        cmsRequirements: 'Standard CMS with a blog',
        designReferences: 'a bakery in Footscray',
        integrations: '',
        contentAvailability: 'Copy and images are ready',
        targetTimeline: 'One to three months',
      },
    }
    let request: ChatContactRefinementRequest | undefined
    const refiner = createChatContactRefiner({
      model: 'openai/test-model',
      complete: async (input) => {
        request = input
        return {
          // Only free-text keys are offered; every closed-set choice is absent
          // from the payload, so the model cannot rewrite the visitor's picks.
          content: JSON.stringify({
            fields: {
              businessName: 'Bright Lane Bakery',
              requiredPages: 'Home, About, and Contact.',
              designReferences: 'A bakery in Footscray whose site feels warm.',
            },
          }),
          model: 'openai/test-model-2026-10-01',
          usage: { promptTokens: 90, completionTokens: 30, totalTokens: 120 },
        }
      },
    })

    const result = await refiner.refine(quotation)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.submission.template).toBe('quotation')
    expect(result.submission.fields).toMatchObject({
      name: 'Ada Visitor',
      email: 'ada@example.com',
      businessName: 'Bright Lane Bakery',
      requiredPages: 'Home, About, and Contact.',
      designReferences: 'A bakery in Footscray whose site feels warm.',
      // Omitted optional fields fall back to what the visitor actually submitted.
      otherFeatures: '',
      integrations: '',
      existingWebsite: 'https://bright-lane.example',
    })
    expect(request?.responseFormat).toEqual({ type: 'json_object' })
    expect(request?.messages[1]?.content).not.toContain('Ada Visitor')
    expect(request?.messages[1]?.content).not.toContain('ada@example.com')
    expect(request?.messages[0]?.content).toContain('quotation requests')
    // A choice field is a fixed answer, not prose to clarify: it is never sent
    // to the model, so the model cannot rewrite the visitor's package choice.
    for (const key of [
      'packageInterest',
      'requiredFeatures',
      'cmsRequirements',
      'contentAvailability',
      'targetTimeline',
    ]) {
      expect(request?.messages[1]?.content).not.toContain(key)
    }
  })

  it('refines a support plan request while keeping its closed-set choices away from the model', async () => {
    const support: ChatContactSubmission = {
      template: 'support_plan',
      fields: {
        name: 'Ada Visitor',
        email: 'ada@example.com',
        projectName: 'Bright Lane',
        existingProject: 'https://bright-lane.example',
        supportNeeded: 'contact form not sending email since friday',
        supportConsultation: 'Technical Consultation',
        engagementType: 'Bug Fix',
        platform: 'Next.js / React',
        urgency: 'Live but needs fixing',
        accessAndBudget: 'I can grant GitHub access',
        extraContext: '',
      },
    }
    let request: ChatContactRefinementRequest | undefined
    const refiner = createChatContactRefiner({
      model: 'openai/test-model',
      complete: async (input) => {
        request = input
        return {
          // Every required refinable field must come back: the parser fails
          // closed with required_field_missing otherwise.
          content: JSON.stringify({
            fields: {
              projectName: 'Bright Lane',
              existingProject: 'https://bright-lane.example',
              supportNeeded: 'The contact form stopped sending email on Friday.',
              accessAndBudget: 'I can grant GitHub access.',
            },
          }),
          model: 'openai/test-model-2026-10-01',
          usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
        }
      },
    })

    const result = await refiner.refine(support)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.submission.template).toBe('support_plan')
    expect(result.submission.fields).toMatchObject({
      name: 'Ada Visitor',
      email: 'ada@example.com',
      projectName: 'Bright Lane',
      supportNeeded: 'The contact form stopped sending email on Friday.',
      // The visitor's closed-set picks survive verbatim even though the model
      // never saw them.
      engagementType: 'Bug Fix',
      platform: 'Next.js / React',
      urgency: 'Live but needs fixing',
    })
    expect(request?.messages[0]?.content).toContain('support plan requests')
    expect(request?.messages[1]?.content).not.toContain('ada@example.com')
    for (const key of ['engagementType', 'platform', 'urgency']) {
      expect(request?.messages[1]?.content).not.toContain(key)
    }
  })

  it('never lets the clarity pass rewrite a closed-set choice field', async () => {
    const quotation: ChatContactSubmission = {
      template: 'quotation',
      fields: {
        name: '',
        email: 'ada@example.com',
        businessName: 'Bright Lane',
        packageInterest: 'Business — from A$2,200 (recommended)',
        existingWebsite: '',
        requiredPages: 'Home, About, Contact',
        requiredFeatures: 'Contact or enquiry form',
        otherFeatures: '',
        cmsRequirements: 'Standard CMS with a blog',
        designReferences: '',
        integrations: '',
        contentAvailability: 'Copy and images are ready',
        targetTimeline: 'One to three months',
      },
    }
    let request: ChatContactRefinementRequest | undefined
    const refiner = createChatContactRefiner({
      model: 'openai/test-model',
      complete: async (input) => {
        request = input
        return {
          content: JSON.stringify({
            fields: { businessName: 'Bright Lane Bakery', requiredPages: 'Home, About, and Contact.' },
          }),
          model: 'openai/test-model-2026-10-01',
          usage: { promptTokens: 40, completionTokens: 10, totalTokens: 50 },
        }
      },
    })

    const result = await refiner.refine(quotation)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Every closed-set answer survives the refinement untouched.
    expect(result.submission.fields).toMatchObject({
      packageInterest: 'Business — from A$2,200 (recommended)',
      requiredFeatures: 'Contact or enquiry form',
      cmsRequirements: 'Standard CMS with a blog',
      contentAvailability: 'Copy and images are ready',
      targetTimeline: 'One to three months',
    })
    expect(request?.messages[1]?.content).not.toContain('A$2,200')
    expect(request?.messages[1]?.content).not.toContain('Contact or enquiry form')
  })
})
