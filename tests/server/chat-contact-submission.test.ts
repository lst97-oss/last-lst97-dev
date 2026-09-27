import { describe, expect, it } from 'bun:test'

import { submitChatContactEmail } from '../../src/server/contact/chat/submission'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'
import type { ChatContactEmailService } from '../../src/server/email/types'
import type { Logger, LogFields } from '../../src/server/observability/logger'

const submission: ChatContactSubmission = {
  template: 'email',
  fields: { name: 'Ada', email: 'ada@example.com', message: 'Please contact me about the portfolio.' },
}

function createDependencies(options: {
  tokenAccepted?: boolean
  claimAccepted?: boolean
  notificationError?: Error
  receiptError?: Error
} = {}) {
  const order: string[] = []
  const logs: Array<{ level: string; event: string; fields?: LogFields }> = []
  const emailService: ChatContactEmailService = {
    sendOperatorNotification: async () => {},
    sendReceivedConfirmation: async () => {},
    sendChatContactNotification: async () => {
      order.push('operator')
      if (options.notificationError) throw options.notificationError
    },
    sendChatContactReceipt: async () => {
      order.push('receipt')
      if (options.receiptError) throw options.receiptError
    },
  }
  const logger: Logger = {
    debug: (event, fields) => logs.push({ level: 'debug', event, fields }),
    info: (event, fields) => logs.push({ level: 'info', event, fields }),
    warn: (event, fields) => logs.push({ level: 'warn', event, fields }),
    error: (event, fields) => logs.push({ level: 'error', event, fields }),
  }
  return {
    order,
    logs,
    dependencies: {
      emailService,
      verifier: { verify: async (token: string, hostname: string) => {
        order.push(`turnstile:${token}:${hostname}`)
        return options.tokenAccepted ?? true
      } },
      claimApproval: async () => {
        order.push('claim')
        return options.claimAccepted ?? true
      },
      expectedHostname: 'portfolio.example',
      requestId: 'request-1',
      logger,
    },
  }
}

describe('chat contact email submission', () => {
  it('verifies Turnstile, claims the approval once, then sends notification and receipt', async () => {
    const { order, dependencies } = createDependencies()
    const result = await submitChatContactEmail(submission, 'turnstile-token', 'approval-1', dependencies)

    expect(result).toEqual({ ok: true, receiptStatus: 'sent' })
    expect(order).toEqual(['turnstile:turnstile-token:portfolio.example', 'claim', 'operator', 'receipt'])
  })

  it('does not send again when an approval claim has already been consumed', async () => {
    const { order, dependencies } = createDependencies({ claimAccepted: false })
    const result = await submitChatContactEmail(submission, 'turnstile-token', 'approval-1', dependencies)

    expect(result).toEqual({ ok: false, reason: 'duplicate' })
    expect(order).toEqual(['turnstile:turnstile-token:portfolio.example', 'claim'])
  })

  it('does not claim or send when Turnstile rejects the token', async () => {
    const { order, dependencies } = createDependencies({ tokenAccepted: false })
    const result = await submitChatContactEmail(submission, 'bad-token', 'approval-1', dependencies)

    expect(result).toEqual({ ok: false, reason: 'turnstile' })
    expect(order).toEqual(['turnstile:bad-token:portfolio.example'])
  })

  it('accepts operator delivery when the short receipt fails without logging contact content', async () => {
    const { order, logs, dependencies } = createDependencies({ receiptError: new Error('ada@example.com private message') })
    const result = await submitChatContactEmail(submission, 'turnstile-token', 'approval-1', dependencies)

    expect(result).toEqual({ ok: true, receiptStatus: 'failed' })
    expect(order).toEqual(['turnstile:turnstile-token:portfolio.example', 'claim', 'operator', 'receipt'])
    expect(JSON.stringify(logs)).not.toContain('ada@example.com')
    expect(JSON.stringify(logs)).not.toContain(submission.fields.message)
  })

  it('fails safely when operator notification fails after consuming the approval', async () => {
    const { order, dependencies } = createDependencies({ notificationError: new Error('SMTP error includes ada@example.com') })
    const result = await submitChatContactEmail(submission, 'turnstile-token', 'approval-1', dependencies)

    expect(result).toEqual({ ok: false, reason: 'delivery' })
    expect(order).toEqual(['turnstile:turnstile-token:portfolio.example', 'claim', 'operator'])
  })
})
