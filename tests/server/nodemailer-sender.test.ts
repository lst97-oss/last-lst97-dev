import { describe, expect, it, spyOn } from 'bun:test'
import nodemailer from 'nodemailer'

import { createGmailEmailSender } from '../../src/server/email/nodemailer-sender'

describe('createGmailEmailSender', () => {
  it('sends typed HTML and text email through the transport seam', async () => {
    let sentOptions: Record<string, unknown> | undefined
    const sender = createGmailEmailSender({
      user: 'operator@gmail.com',
      password: 'app-password',
      fromEmail: 'noreply@example.com',
      fromName: 'LAST//OS',
      transport: {
        sendMail: async (options) => {
          sentOptions = options as Record<string, unknown>
          return {
            messageId: 'mail-1',
            envelope: { from: 'operator@gmail.com', to: ['inbox@example.com'] },
            accepted: ['inbox@example.com'],
            rejected: [],
          }
        },
      },
    })

    await expect(
      sender.send({
        templateId: 'contact-notification',
        to: 'inbox@example.com',
        replyTo: 'ada@example.com',
        subject: 'New contact message — LAST//OS',
        text: 'Plain-text notification',
        html: '<p>HTML notification</p>',
        attachments: [{
          filename: 'original-report.pdf',
          content: new Uint8Array([37, 80, 68, 70, 45]),
          contentType: 'application/pdf',
        }],
      }),
    ).resolves.toEqual({ messageId: 'mail-1' })

    expect(sentOptions).toMatchObject({
      from: { name: 'LAST//OS', address: 'noreply@example.com' },
      to: 'inbox@example.com',
      replyTo: 'ada@example.com',
      subject: 'New contact message — LAST//OS',
      text: 'Plain-text notification',
      html: '<p>HTML notification</p>',
    })
    expect(sentOptions).not.toHaveProperty('templateId')
    expect(sentOptions?.attachments).toEqual([{
      filename: 'original-report.pdf',
      content: Buffer.from('%PDF-'),
      contentType: 'application/pdf',
    }])
  })

  it('falls back to the authenticated Gmail address as the sender address', async () => {
    let sentOptions: Record<string, unknown> | undefined
    const sender = createGmailEmailSender({
      user: 'operator@gmail.com',
      password: 'app-password',
      fromName: 'LAST//OS',
      transport: {
        sendMail: async (options) => {
          sentOptions = options as Record<string, unknown>
          return {
            messageId: 'mail-2',
            envelope: { from: 'operator@gmail.com', to: ['ada@example.com'] },
            accepted: ['ada@example.com'],
            rejected: [],
          }
        },
      },
    })

    await sender.send({
      templateId: 'contact-receipt',
      to: 'ada@example.com',
      subject: 'We received your message — LAST//OS',
      text: 'We received your message.',
      html: '<p>We received your message.</p>',
    })

    expect(sentOptions?.from).toEqual({ name: 'LAST//OS', address: 'operator@gmail.com' })
  })

  it('rejects a resolved SMTP result when the intended recipient was rejected', async () => {
    const sender = createGmailEmailSender({
      user: 'operator@gmail.com',
      password: 'app-password',
      fromEmail: 'noreply@example.com',
      fromName: 'LAST//OS',
      transport: {
        sendMail: async () => ({
          messageId: 'mail-3',
          envelope: { from: 'operator@gmail.com', to: ['inbox@example.com'] },
          accepted: [],
          rejected: ['inbox@example.com'],
        }),
      },
    })

    await expect(sender.send({
      templateId: 'contact-notification',
      to: 'inbox@example.com',
      replyTo: 'ada@example.com',
      subject: 'New contact message — LAST//OS',
      text: 'Plain-text notification',
      html: '<p>HTML notification</p>',
    })).rejects.toThrow('Email recipient was not accepted by the SMTP server')
  })

  it('sets bounded DNS, connection, greeting, and socket timeouts', () => {
    let smtpOptions: Record<string, unknown> | undefined

    createGmailEmailSender({
      user: 'operator@gmail.com',
      password: 'app-password',
      fromEmail: 'noreply@example.com',
      fromName: 'LAST//OS',
      transportFactory: (options) => {
        smtpOptions = options as unknown as Record<string, unknown>
        return {
          sendMail: async () => ({
            messageId: 'mail-4',
            envelope: { from: 'operator@gmail.com', to: ['inbox@example.com'] },
            accepted: ['inbox@example.com'],
            rejected: [],
          }),
        }
      },
    })

    expect(smtpOptions).toMatchObject({
      dnsTimeout: 5_000,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  })

  it('passes bounded timeout options to the default Nodemailer transport factory', () => {
    const transport = {
      sendMail: async () => ({
        messageId: 'mail-5',
        envelope: { from: 'operator@gmail.com', to: ['inbox@example.com'] },
        accepted: ['inbox@example.com'],
        rejected: [],
      }),
    }
    const createTransportSpy = spyOn(nodemailer, 'createTransport').mockReturnValue(transport as never)

    try {
      createGmailEmailSender({
        user: 'operator@gmail.com',
        password: 'app-password',
        fromEmail: 'noreply@example.com',
        fromName: 'LAST//OS',
      })

      expect(createTransportSpy).toHaveBeenCalledWith(expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        dnsTimeout: 5_000,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      }))
    } finally {
      createTransportSpy.mockRestore()
    }
  })
})
