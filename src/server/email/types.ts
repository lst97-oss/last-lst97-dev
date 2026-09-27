import type { ChatContactSubmission } from '../../lib/chat-contact'
import type { ContactMessage } from '../contact/types'

export type EmailTemplateId =
  | 'contact-notification'
  | 'contact-receipt'
  | 'chat-contact-notification'
  | 'chat-contact-receipt'

export interface EmailTemplate {
  templateId: EmailTemplateId
  subject: string
  text: string
  html: string
}

export interface EmailAttachment {
  filename: string
  content: Uint8Array
  contentType: 'application/pdf'
}

export interface OutboundEmail extends EmailTemplate {
  to: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export interface EmailSender {
  send(email: OutboundEmail): Promise<{ messageId: string }>
}

export interface ContactEmailService {
  sendOperatorNotification(contact: ContactMessage): Promise<void>
  sendReceivedConfirmation(contact: ContactMessage): Promise<void>
}

export interface ChatContactEmailService extends ContactEmailService {
  sendChatContactNotification(contact: ChatContactSubmission, originalReport?: ChatContactSubmission): Promise<void>
  sendChatContactReceipt(contact: ChatContactSubmission): Promise<void>
}
