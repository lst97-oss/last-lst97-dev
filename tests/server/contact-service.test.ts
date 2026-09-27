import { describe, expect, it } from 'bun:test'

import { submitContactMessage } from '../../src/server/contact/service'
import type { ContactMessage } from '../../src/server/contact/types'
import type { ContactEmailService } from '../../src/server/email/types'
import type { Logger, LogFields } from '../../src/server/observability/logger'
import type { TurnstileVerifier } from '../../src/server/contact/types'
import type { ModerationService } from '../../src/server/moderation/service'

const validInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'A message with enough characters.',
  website: '',
  turnstileToken: 'test-turnstile-token',
}

function createLogger(events: Array<{ level: string; event: string; fields?: LogFields }> = []): Logger {
  return {
    debug: (event, fields) => events.push({ level: 'debug', event, fields }),
    info: (event, fields) => events.push({ level: 'info', event, fields }),
    warn: (event, fields) => events.push({ level: 'warn', event, fields }),
    error: (event, fields) => events.push({ level: 'error', event, fields }),
  }
}

function createDependencies(options: {
  emailService?: ContactEmailService
  verifier?: TurnstileVerifier
  moderation?: ModerationService
  events?: Array<{ level: string; event: string; fields?: LogFields }>
} = {}) {
  const calls: Array<{ method: string; contact: ContactMessage }> = []
  const emailService: ContactEmailService = options.emailService ?? {
    sendOperatorNotification: async (contact) => {
      calls.push({ method: 'operator', contact })
    },
    sendReceivedConfirmation: async (contact) => {
      calls.push({ method: 'receipt', contact })
    },
  }

  return {
    calls,
    dependencies: {
      emailService,
      verifier: options.verifier ?? { verify: async () => true },
      moderation: options.moderation ?? { checkContact: async () => ({ allowed: true }), checkChat: async () => ({ allowed: true }) } as ModerationService,
      expectedHostname: 'portfolio.example',
      requestId: 'request-1',
      logger: createLogger(options.events),
    },
  }
}

describe('submitContactMessage', () => {
  it('verifies the contact then sends the operator notification before the receipt', async () => {
    const verified: Array<{ token: string; hostname: string }> = []
    const deliveryOrder: string[] = []
    const logEvents: Array<{ level: string; event: string; fields?: LogFields }> = []
    const { dependencies } = createDependencies({
      events: logEvents,
      emailService: {
        sendOperatorNotification: async () => { deliveryOrder.push('operator') },
        sendReceivedConfirmation: async () => { deliveryOrder.push('receipt') },
      },
      verifier: {
        verify: async (token, hostname) => {
          verified.push({ token, hostname })
          deliveryOrder.push('turnstile')
          return true
        },
      },
    })

    const result = await submitContactMessage(validInput, dependencies)

    expect(result).toEqual({ ok: true, receiptStatus: 'sent' })
    expect(deliveryOrder).toEqual(['turnstile', 'operator', 'receipt'])
    expect(verified).toEqual([{ token: 'test-turnstile-token', hostname: 'portfolio.example' }])
    expect(logEvents).toEqual([
      {
        level: 'info',
        event: 'contact.operator_notification_sent',
        fields: { requestId: 'request-1', templateId: 'contact-notification' },
      },
      {
        level: 'info',
        event: 'contact.receipt_sent',
        fields: { requestId: 'request-1', templateId: 'contact-receipt' },
      },
    ])
  })

  it('fails the submission when the operator notification fails and does not send a receipt', async () => {
    let receiptSent = false
    const { dependencies } = createDependencies({
      emailService: {
        sendOperatorNotification: async () => { throw new Error('SMTP unavailable') },
        sendReceivedConfirmation: async () => { receiptSent = true },
      },
    })

    await expect(submitContactMessage(validInput, dependencies)).rejects.toThrow('SMTP unavailable')
    expect(receiptSent).toBe(false)
  })

  it('accepts the contact and logs a privacy-safe warning when only the receipt fails', async () => {
    const events: Array<{ level: string; event: string; fields?: LogFields }> = []
    const { dependencies } = createDependencies({
      events,
      emailService: {
        sendOperatorNotification: async () => {},
        sendReceivedConfirmation: async () => { throw new Error('SMTP response included ada@example.com') },
      },
    })

    const result = await submitContactMessage(validInput, dependencies)

    expect(result).toEqual({ ok: true, receiptStatus: 'failed' })
    expect(events).toEqual([
      {
        level: 'info',
        event: 'contact.operator_notification_sent',
        fields: { requestId: 'request-1', templateId: 'contact-notification' },
      },
      {
        level: 'warn',
        event: 'contact.receipt_failed',
        fields: { requestId: 'request-1', templateId: 'contact-receipt' },
      },
    ])
    expect(JSON.stringify(events)).not.toContain('ada@example.com')
    expect(JSON.stringify(events)).not.toContain(validInput.message)
  })

  it('does not send either email when Turnstile rejects the token', async () => {
    const { calls, dependencies } = createDependencies({
      verifier: { verify: async () => false },
    })

    const result = await submitContactMessage(validInput, dependencies)

    expect(result).toEqual({ ok: false, reason: 'turnstile' })
    expect(calls).toHaveLength(0)
  })

  it('rejects spam after Turnstile and before sending any email', async () => {
    const { calls, dependencies } = createDependencies({
      moderation: { checkContact: async () => ({ allowed: false }), checkChat: async () => ({ allowed: true }) } as ModerationService,
    })
    await expect(submitContactMessage(validInput, dependencies)).resolves.toEqual({ ok: false, reason: 'moderation' })
    expect(calls).toHaveLength(0)
  })

  it('fails closed when moderation is unavailable', async () => {
    const { calls, dependencies } = createDependencies({
      moderation: { checkContact: async () => ({ unavailable: true }), checkChat: async () => ({ allowed: true }) } as ModerationService,
    })
    await expect(submitContactMessage(validInput, dependencies)).resolves.toEqual({ ok: false, reason: 'moderation_unavailable' })
    expect(calls).toHaveLength(0)
  })

  it('fails closed when the submission has no Turnstile token', async () => {
    const { calls, dependencies } = createDependencies()

    const result = await submitContactMessage({ ...validInput, turnstileToken: undefined }, dependencies)

    expect(result).toEqual({ ok: false, reason: 'turnstile' })
    expect(calls).toHaveLength(0)
  })

  it('accepts honeypot submissions without verifying or sending either email', async () => {
    let verifyCount = 0
    const { calls, dependencies } = createDependencies({
      verifier: {
        verify: async () => {
          verifyCount += 1
          return true
        },
      },
    })

    const result = await submitContactMessage({ ...validInput, website: 'https://bot.example' }, dependencies)

    expect(result).toEqual({ ok: true, suppressed: true })
    expect(verifyCount).toBe(0)
    expect(calls).toHaveLength(0)
  })
})
