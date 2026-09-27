import { parseContactInput } from './validation'
import type { TurnstileVerifier } from './types'
import type { ContactEmailService } from '../email/types'
import type { Logger } from '../observability/logger'
import type { ModerationService } from '../moderation/service'

export interface ContactSubmissionDependencies {
  emailService: ContactEmailService
  verifier: TurnstileVerifier
  moderation: ModerationService
  expectedHostname: string
  requestId: string
  logger: Logger
}

export type ContactSubmissionResult =
  | { ok: true; receiptStatus: 'sent' | 'failed' }
  | { ok: true; suppressed: true }
  | { ok: false; issues: string[] }
  | { ok: false; reason: 'turnstile' }
  | { ok: false; reason: 'moderation' | 'moderation_unavailable' }

export async function submitContactMessage(
  input: unknown,
  dependencies: ContactSubmissionDependencies,
): Promise<ContactSubmissionResult> {
  const parsed = parseContactInput(input)
  if (!parsed.ok) {
    return parsed
  }
  if ('honeypot' in parsed) {
    return { ok: true, suppressed: true }
  }

  const token = readTurnstileToken(input)
  if (!token || !(await dependencies.verifier.verify(token, dependencies.expectedHostname))) {
    return { ok: false, reason: 'turnstile' }
  }

  const moderation = await dependencies.moderation.checkContact(parsed.value.message)
  if ('unavailable' in moderation) return { ok: false, reason: 'moderation_unavailable' }
  if (!moderation.allowed) return { ok: false, reason: 'moderation' }

  await dependencies.emailService.sendOperatorNotification(parsed.value)
  dependencies.logger.info('contact.operator_notification_sent', {
    requestId: dependencies.requestId,
    templateId: 'contact-notification',
  })

  try {
    await dependencies.emailService.sendReceivedConfirmation(parsed.value)
    dependencies.logger.info('contact.receipt_sent', {
      requestId: dependencies.requestId,
      templateId: 'contact-receipt',
    })
    return { ok: true, receiptStatus: 'sent' }
  } catch {
    dependencies.logger.warn('contact.receipt_failed', {
      requestId: dependencies.requestId,
      templateId: 'contact-receipt',
    })
    return { ok: true, receiptStatus: 'failed' }
  }
}

function readTurnstileToken(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null || !('turnstileToken' in input)) {
    return undefined
  }

  const token = input.turnstileToken
  if (typeof token !== 'string' || token.length > 2_048 || !token.trim()) {
    return undefined
  }

  return token.trim()
}
