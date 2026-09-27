import type { ChatContactSubmission } from '../../lib/chat-contact'
import type { ContactMessage } from '../contact/types'
import { renderOriginalChatContactReportPdf } from './chat-contact-report-pdf'
import {
  renderChatContactNotification,
  renderChatContactReceipt,
  renderContactNotification,
  renderContactReceipt,
} from './templates'
import type { ChatContactEmailService, EmailAttachment, EmailSender } from './types'

export function createContactEmailService(
  sender: EmailSender,
  options: { contactRecipient: string },
): ChatContactEmailService {
  return {
    async sendOperatorNotification(contact: ContactMessage): Promise<void> {
      const template = renderContactNotification(contact)
      await sender.send({
        ...template,
        to: options.contactRecipient,
        replyTo: contact.email,
      })
    },

    async sendReceivedConfirmation(contact: ContactMessage): Promise<void> {
      const template = renderContactReceipt(contact)
      await sender.send({
        ...template,
        to: contact.email,
      })
    },

    async sendChatContactNotification(
      contact: ChatContactSubmission,
      originalReport?: ChatContactSubmission,
    ): Promise<void> {
      const template = renderChatContactNotification(contact)
      const source = originalReport ?? contact
      let attachments: EmailAttachment[] | undefined
      if (contact.template !== 'email') {
        if (source.template !== contact.template) {
          throw new Error('Original report must match the refined report template')
        }
        attachments = [
          {
            filename: 'original-report.pdf',
            content: await renderOriginalChatContactReportPdf(source),
            contentType: 'application/pdf',
          },
        ]
      }
      await sender.send({
        ...template,
        to: options.contactRecipient,
        replyTo: contact.fields.email.trim(),
        ...(attachments ? { attachments } : {}),
      })
    },

    async sendChatContactReceipt(contact: ChatContactSubmission): Promise<void> {
      const template = renderChatContactReceipt(contact)
      await sender.send({
        ...template,
        to: contact.fields.email.trim(),
      })
    },
  }
}
