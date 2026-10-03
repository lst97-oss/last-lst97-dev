import { describe, expect, it } from 'bun:test'

import {
  CHAT_CONTACT_EMPTY_CHOICE,
  CHAT_CONTACT_TEMPLATES,
  createEmptyChatContactFields,
  isChatContactChoiceField,
  parseChatContactChoices,
  parseChatContactFields,
  serializeChatContactChoices,
  validateChatContactDraft,
} from '../../src/lib/chat-contact'

describe('chat contact templates and draft validation', () => {
  it('defines the required and optional fields for email, bug, and feature templates', () => {
    expect(CHAT_CONTACT_TEMPLATES.email.fields.filter((field) => field.required).map((field) => field.key)).toEqual([
      'email',
      'message',
    ])
    expect(
      CHAT_CONTACT_TEMPLATES.bug_report.fields.filter((field) => field.required).map((field) => field.key),
    ).toEqual(['email', 'summary', 'expectedBehaviour', 'stepsToReproduce'])
    expect(
      CHAT_CONTACT_TEMPLATES.feature_request.fields.filter((field) => field.required).map((field) => field.key),
    ).toEqual(['email', 'problem', 'proposedExperience'])
    expect(CHAT_CONTACT_TEMPLATES.bug_report.fields.map((field) => field.key)).toContain('environment')
    expect(CHAT_CONTACT_TEMPLATES.feature_request.fields.map((field) => field.key)).toContain('acceptanceCriteria')
  })

  it('defines the quotation fields that price a fixed scope without blocking on optional detail', () => {
    expect(CHAT_CONTACT_TEMPLATES.quotation.fields.filter((field) => field.required).map((field) => field.key)).toEqual(
      ['email', 'businessName', 'requiredPages', 'targetTimeline'],
    )
    // The package of interest is a hint, not a commitment: pricing is confirmed
    // after discovery, so requiring it would block a visitor who has not read
    // the packages page.
    expect(CHAT_CONTACT_TEMPLATES.quotation.fields.map((field) => field.key)).toContain('packageInterest')
    expect(createEmptyChatContactFields('quotation')).toEqual(
      Object.fromEntries(CHAT_CONTACT_TEMPLATES.quotation.fields.map((field) => [field.key, ''])),
    )
  })

  it('defines the support plan fields and makes the consultation compulsory', () => {
    expect(
      CHAT_CONTACT_TEMPLATES.support_plan.fields.filter((field) => field.required).map((field) => field.key),
    ).toEqual(['email', 'projectName', 'existingProject', 'supportNeeded', 'supportConsultation'])

    const consultation = CHAT_CONTACT_TEMPLATES.support_plan.fields.find((field) => field.key === 'supportConsultation')
    // Not a control: the consultation is the base every engagement starts from,
    // so there is nothing to pick and it must be pre-filled rather than blank.
    expect(consultation).toBeDefined()
    expect('control' in (consultation as object)).toBe(false)
    expect(consultation && 'defaultValue' in consultation ? consultation.defaultValue : undefined).toBe(
      'Technical Consultation',
    )

    // Engagements are a multi-select: support work is rarely one thing, and a
    // select would force the visitor to drop the second problem.
    const engagements = CHAT_CONTACT_TEMPLATES.support_plan.fields.find((field) => field.key === 'engagementType')
    expect(engagements && 'control' in engagements ? engagements.control : undefined).toBe('checkboxes')
    // Every engagement shares one standard rate, so the options stay bare and
    // the price is stated once on the label instead of on each row.
    const labels = CHAT_CONTACT_TEMPLATES.support_plan.fields.find((field) => field.key === 'engagementType')
    expect(labels?.label).toBe('Support engagements needed (from A$100 each)')
    const engagement = CHAT_CONTACT_TEMPLATES.support_plan.fields.find(
      (field) => field.key === 'engagementType' && 'options' in field,
    )
    expect(engagement && 'options' in engagement ? engagement.options.map((option) => option.label) : []).not.toContain(
      expect.stringContaining('A$'),
    )
    // The consultation is not offered as a peer, because it is the base rather
    // than one of the standard-rate items.
    expect(engagement && 'options' in engagement ? engagement.options.map((option) => option.value) : []).not.toContain(
      'Technical Consultation',
    )

    expect(createEmptyChatContactFields('support_plan')).toEqual(
      Object.fromEntries(
        CHAT_CONTACT_TEMPLATES.support_plan.fields.map((field) => [
          field.key,
          'defaultValue' in field ? field.defaultValue : '',
        ]),
      ),
    )
  })

  it("rejects a hand-crafted value that is not one of a support plan field's options", () => {
    // The same server-side closed set the quotation template relies on: a
    // crafted submit_form must not put arbitrary text into a field the operator
    // reads as a published engagement or price.
    const base = {
      email: 'alex@example.com',
      projectName: 'Bright Lane Bakery',
      existingProject: 'https://example.com',
      supportNeeded: 'The contact form stopped sending email after the last deploy.',
      supportConsultation: 'Technical Consultation',
    }

    expect(validateChatContactDraft('support_plan', { ...base, engagementType: 'Free unlimited help' })).toMatchObject({
      ok: false,
      invalidFields: ['engagementType'],
    })
    expect(validateChatContactDraft('support_plan', { ...base, platform: 'A bespoke framework' })).toMatchObject({
      ok: false,
      invalidFields: ['platform'],
    })
    expect(
      validateChatContactDraft('support_plan', {
        ...base,
        // Several engagements at once is the normal case, and the stored order
        // is the declared option order rather than the click order.
        engagementType: 'Bug Fix, Deployment / Deployment Fix',
        platform: 'Next.js / React',
        urgency: 'Live but needs fixing',
      }),
    ).toMatchObject({ ok: true })
    // Blanking the compulsory consultation is the one thing that must fail: it
    // is not a visitor choice, so an empty value means a crafted request.
    expect(validateChatContactDraft('support_plan', { ...base, supportConsultation: '' })).toMatchObject({
      ok: false,
      missingFields: ['supportConsultation'],
    })
  })

  it("rejects a hand-crafted value that is not one of a quotation field's options", () => {
    // A select is only a constraint on the browser unless the server enforces
    // it too, so a crafted submit_form cannot put arbitrary text into a field
    // the operator reads as a fixed published answer.
    const base = {
      email: 'alex@example.com',
      businessName: 'Bright Lane',
      requiredPages: 'Home, About, Contact',
      targetTimeline: 'One to three months',
    }

    expect(validateChatContactDraft('quotation', { ...base, packageInterest: 'Business' })).toMatchObject({
      ok: false,
      invalidFields: ['packageInterest'],
    })
    expect(
      validateChatContactDraft('quotation', { ...base, cmsRequirements: 'A bespoke backend nobody offers' }),
    ).toMatchObject({ ok: false, invalidFields: ['cmsRequirements'] })
    expect(
      validateChatContactDraft('quotation', {
        ...base,
        packageInterest: 'Business — from A$2,200 (recommended)',
        requiredFeatures: 'Contact or enquiry form, Blog or news section',
        cmsRequirements: 'Standard CMS with a blog',
        contentAvailability: 'Copy and images are ready',
      }),
    ).toMatchObject({ ok: true })
  })

  it('stores checkbox selections in the declared order, not the click order', () => {
    // `ChatContactChoiceField` is an `Extract` over every template's field
    // union, so it only collapses to one assignable shape while a single
    // template contributes the field. Narrow through the shared guard, which
    // the server itself uses, rather than a local predicate that re-states the
    // whole union.
    const field = CHAT_CONTACT_TEMPLATES.quotation.fields.find(
      (candidate) => candidate.key === 'requiredFeatures' && isChatContactChoiceField(candidate),
    )
    if (!field) throw new Error('requiredFeatures must be a closed-set choice field')
    expect(field.control).toBe('checkboxes')

    expect(serializeChatContactChoices(field, ['Search', 'Contact or enquiry form'])).toBe(
      'Contact or enquiry form, Search',
    )
    expect(serializeChatContactChoices(field, [])).toBe(CHAT_CONTACT_EMPTY_CHOICE)
    expect(parseChatContactChoices(field, 'Contact or enquiry form, Search')).toEqual([
      'Contact or enquiry form',
      'Search',
    ])
    expect(parseChatContactChoices(field, CHAT_CONTACT_EMPTY_CHOICE)).toEqual([])
    // Values the field never offered are dropped rather than echoed back.
    expect(parseChatContactChoices(field, 'Contact or enquiry form, Smuggled')).toEqual(['Contact or enquiry form'])
  })

  it('normalises omitted optional quotation fields and reports missing or invalid required ones', () => {
    const complete = validateChatContactDraft('quotation', {
      name: 'Alex',
      email: 'alex@example.com',
      businessName: 'Bright Lane',
      requiredPages: 'Home, About, Contact',
      targetTimeline: 'One to three months',
    })

    expect(complete).toMatchObject({
      ok: true,
      submission: { template: 'quotation', fields: { name: 'Alex', packageInterest: '', contentAvailability: '' } },
    })

    const noTimeline = validateChatContactDraft('quotation', {
      email: 'alex@example.com',
      businessName: 'Bright Lane',
      requiredPages: 'Home',
    })
    expect(noTimeline).toMatchObject({ ok: false, missingFields: ['targetTimeline'] })

    const badEmail = validateChatContactDraft('quotation', {
      email: 'not-an-email',
      businessName: 'Bright Lane',
      requiredPages: 'Home',
      targetTimeline: 'One to three months',
    })
    expect(badEmail).toMatchObject({ ok: false, invalidFields: ['email'] })
  })

  it('keeps optional name blank and preserves exact field values', () => {
    const fields = createEmptyChatContactFields('email')
    fields.email = '  person@example.com  '
    fields.message = '  Please check this exact text.\nLine two.  '

    expect(fields.name).toBe('')
    expect(parseChatContactFields('email', fields)).toEqual({ ok: true, fields })
    expect(validateChatContactDraft('email', fields)).toMatchObject({
      ok: true,
      submission: {
        template: 'email',
        fields: { name: '', email: 'person@example.com', message: '  Please check this exact text.\nLine two.  ' },
      },
    })
  })

  it('reports required fields and rejects an invalid reply email', () => {
    const fields = createEmptyChatContactFields('bug_report')
    fields.email = 'invalid email'
    fields.summary = 'A useful summary'

    expect(validateChatContactDraft('bug_report', fields)).toEqual({
      ok: false,
      missingFields: ['expectedBehaviour', 'stepsToReproduce'],
      invalidFields: ['email'],
    })
  })

  it('rejects unknown fields and bounds total draft size before classification', () => {
    expect(
      parseChatContactFields('email', {
        email: 'person@example.com',
        message: 'A sufficiently long message',
        unexpected: 'extra',
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_fields' })
    expect(parseChatContactFields('bug_report', { evidence: 'x'.repeat(12_001) })).toMatchObject({
      ok: false,
      reason: 'invalid_fields',
    })
  })
})
