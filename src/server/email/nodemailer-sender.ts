import nodemailer from 'nodemailer'
import type { SendMailOptions, SMTPTransportOptions, SMTPSentMessageInfo } from 'nodemailer'

import { getServerEnv, requiredServerEnv } from '../env'
import type { EmailSender } from './types'

type MailTransport = {
  sendMail(options: SendMailOptions): Promise<SMTPSentMessageInfo>
}

type MailTransportFactory = (options: SMTPTransportOptions) => MailTransport

export function createGmailEmailSender(options: {
  transport?: MailTransport
  transportFactory?: MailTransportFactory
  user?: string
  password?: string
  fromEmail?: string
  fromName?: string
} = {}): EmailSender {
  const user = options.user ?? requiredServerEnv('SMTP_USER')
  const password = options.password ?? requiredServerEnv('SMTP_APP_PASSWORD')
  const env = getServerEnv()
  const fromEmail = options.fromEmail ?? env.EMAIL_FROM ?? user
  const fromName = options.fromName ?? env.EMAIL_FROM_NAME

  const transportOptions: SMTPTransportOptions = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    dnsTimeout: 5_000,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user, pass: password },
  }
  const transporter = options.transport
    ?? (options.transportFactory
      ? options.transportFactory(transportOptions)
      : nodemailer.createTransport(transportOptions))

  return {
    async send(email) {
      const result = await transporter.sendMail({
        from: { name: fromName, address: fromEmail },
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.attachments ? {
          attachments: email.attachments.map((attachment) => ({
            filename: attachment.filename,
            content: Buffer.from(attachment.content),
            contentType: attachment.contentType,
          })),
        } : {}),
      })

      const expectedRecipient = email.to.trim().toLowerCase()
      const recipientAccepted = result.accepted.some(
        (recipient) => recipient.toLowerCase() === expectedRecipient,
      )
      const recipientRejected = result.rejected.some(
        (recipient) => recipient.toLowerCase() === expectedRecipient,
      )
      if (!recipientAccepted || recipientRejected) {
        throw new Error('Email recipient was not accepted by the SMTP server')
      }

      return { messageId: result.messageId }
    },
  }
}
