import { describe, expect, it } from 'bun:test'

import {
  CHAT_CONTACT_TEMPLATES,
  createEmptyChatContactFields,
  parseChatContactFields,
  validateChatContactDraft,
} from '../../src/lib/chat-contact'

describe('chat contact templates and draft validation', () => {
  it('defines the required and optional fields for email, bug, and feature templates', () => {
    expect(CHAT_CONTACT_TEMPLATES.email.fields.filter((field) => field.required).map((field) => field.key))
      .toEqual(['email', 'message'])
    expect(CHAT_CONTACT_TEMPLATES.bug_report.fields.filter((field) => field.required).map((field) => field.key))
      .toEqual(['email', 'summary', 'expectedBehaviour', 'stepsToReproduce'])
    expect(CHAT_CONTACT_TEMPLATES.feature_request.fields.filter((field) => field.required).map((field) => field.key))
      .toEqual(['email', 'problem', 'proposedExperience'])
    expect(CHAT_CONTACT_TEMPLATES.bug_report.fields.map((field) => field.key)).toContain('environment')
    expect(CHAT_CONTACT_TEMPLATES.feature_request.fields.map((field) => field.key)).toContain('acceptanceCriteria')
  })

  it('keeps optional name blank and preserves exact field values', () => {
    const fields = createEmptyChatContactFields('email')
    fields.email = '  person@example.com  '
    fields.message = '  Please check this exact text.\nLine two.  '

    expect(fields.name).toBe('')
    expect(parseChatContactFields('email', fields)).toEqual({ ok: true, fields })
    expect(validateChatContactDraft('email', fields)).toMatchObject({ ok: true, submission: { template: 'email', fields: { name: '', email: '  person@example.com  ', message: '  Please check this exact text.\nLine two.  ' } } })
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
    expect(parseChatContactFields('email', { email: 'person@example.com', message: 'A sufficiently long message', unexpected: 'extra' }))
      .toMatchObject({ ok: false, reason: 'invalid_fields' })
    expect(parseChatContactFields('bug_report', { evidence: 'x'.repeat(12_001) }))
      .toMatchObject({ ok: false, reason: 'invalid_fields' })
  })
})
