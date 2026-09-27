import { describe, expect, it } from 'bun:test'

import { createContactEmailService } from '../../src/server/email/service'
import type { ContactMessage } from '../../src/server/contact/types'
import type { OutboundEmail } from '../../src/server/email/types'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'

const contact: ContactMessage = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'A message with enough characters.',
  website: '',
}

describe('createContactEmailService', () => {
  it('sends chat contact mail only to the configured operator and validated reply email', async () => {
    const sent: OutboundEmail[] = []
    const service = createContactEmailService(
      { send: async (email) => { sent.push(email); return { messageId: 'mail-chat' } } },
      { contactRecipient: 'operator@example.com' },
    )
    const original: ChatContactSubmission = {
      template: 'feature_request',
      fields: {
        name: '', email: ' ada@example.com ', problem: 'Search is difficult.', proposedExperience: 'Add search filters.',
        whoBenefits: '', exampleUseCase: '', acceptanceCriteria: '', alternatives: '', references: '',
      },
    }
    const submission: ChatContactSubmission = {
      ...original,
      fields: { ...original.fields, problem: 'Visitors find it difficult to search for projects.' },
    }

    await service.sendChatContactNotification(submission, original)
    await service.sendChatContactReceipt(submission)

    expect(sent).toHaveLength(2)
    expect(sent[0]).toMatchObject({ to: 'operator@example.com', replyTo: 'ada@example.com', subject: 'Feature request — LAST//OS' })
    expect(sent[0]?.text).toContain('Proposed experience:')
    expect(sent[0]?.text).toContain('Add search filters.')
    expect(sent[0]?.text).toContain('Visitors find it difficult to search for projects.')
    expect(sent[0]?.text).not.toContain('Search is difficult.')
    expect(sent[0]?.attachments).toHaveLength(1)
    expect(sent[0]?.attachments?.[0]).toMatchObject({ filename: 'original-report.pdf', contentType: 'application/pdf' })
    expect(new TextDecoder('latin1').decode(sent[0]?.attachments?.[0]?.content).startsWith('%PDF-')).toBe(true)
    expect(sent[1]).toMatchObject({ to: 'ada@example.com', subject: 'We received your message — LAST//OS' })
    expect(sent[1]?.attachments).toBeUndefined()
    expect(sent[1]?.replyTo).toBeUndefined()
    expect(sent[1]?.text).not.toContain('Search is difficult.')
  })

  it('delivers the notification to the operator with the contact set as reply-to', async () => {
    const sent: OutboundEmail[] = []
    const service = createContactEmailService(
      {
        send: async (email) => {
          sent.push(email)
          return { messageId: 'mail-1' }
        },
      },
      { contactRecipient: 'operator@example.com' },
    )

    await service.sendOperatorNotification(contact)

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      templateId: 'contact-notification',
      to: 'operator@example.com',
      replyTo: 'ada@example.com',
      subject: 'New contact message — LAST//OS',
    })
    expect(sent[0]?.html).toContain('A message with enough characters.')
    expect(sent[0]?.text).toContain('A message with enough characters.')
  })

  it('delivers the received confirmation to the validated contact email', async () => {
    const sent: OutboundEmail[] = []
    const service = createContactEmailService(
      {
        send: async (email) => {
          sent.push(email)
          return { messageId: 'mail-2' }
        },
      },
      { contactRecipient: 'operator@example.com' },
    )

    await service.sendReceivedConfirmation(contact)

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      templateId: 'contact-receipt',
      to: 'ada@example.com',
      subject: 'We received your message — LAST//OS',
    })
    expect(sent[0]?.replyTo).toBeUndefined()
    expect(sent[0]?.text).toContain('We received your message')
    expect(sent[0]?.html).toContain('We received your message')
  })
})
