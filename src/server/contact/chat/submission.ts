import type { ChatContactSubmission } from '../../../lib/chat-contact'
import type { ChatContactEmailService } from '../../email/types'
import type { Logger } from '../../observability/logger'
import type { TurnstileVerifier } from '../types'

export interface ChatContactEmailSubmissionDependencies {
  emailService: ChatContactEmailService
  verifier: TurnstileVerifier
  claimApproval(approvalId: string): Promise<boolean>
  expectedHostname: string
  requestId: string
  logger: Logger
  originalReport?: ChatContactSubmission
}

export type ChatContactEmailSubmissionResult =
  | { ok: true; receiptStatus: 'sent' | 'failed' }
  | { ok: false; reason: 'turnstile' | 'turnstile_unavailable' | 'duplicate' | 'delivery' }

function approvalClaimFailureCategory(error: unknown): string {
  let current: unknown = error
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== 'object' || current === null) break
    const record = current as { code?: unknown; cause?: unknown }
    if (typeof record.code === 'string') {
      if (record.code === '42P01') return 'approval_table_missing'
      if (record.code === '42501') return 'database_permission_denied'
      if (
        record.code.startsWith('08') ||
        ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(record.code)
      ) {
        return 'database_connection_failed'
      }
    }
    current = record.cause
  }
  return 'database_error'
}

export async function submitChatContactEmail(
  contact: ChatContactSubmission,
  turnstileToken: string,
  approvalId: string,
  dependencies: ChatContactEmailSubmissionDependencies,
): Promise<ChatContactEmailSubmissionResult> {
  const token = turnstileToken.trim()
  if (!token || token.length > 2_048) return { ok: false, reason: 'turnstile' }

  let verified: boolean
  try {
    verified = await dependencies.verifier.verify(token, dependencies.expectedHostname)
  } catch {
    return { ok: false, reason: 'turnstile_unavailable' }
  }
  if (!verified) return { ok: false, reason: 'turnstile' }

  let claimed: boolean
  try {
    claimed = await dependencies.claimApproval(approvalId)
  } catch (error) {
    dependencies.logger.error('chat_contact.approval_claim_failed', {
      requestId: dependencies.requestId,
      failureCategory: approvalClaimFailureCategory(error),
    })
    return { ok: false, reason: 'delivery' }
  }
  if (!claimed) return { ok: false, reason: 'duplicate' }

  try {
    await dependencies.emailService.sendChatContactNotification(contact, dependencies.originalReport)
    dependencies.logger.info('chat_contact.operator_notification_sent', {
      requestId: dependencies.requestId,
      templateId: 'chat-contact-notification',
    })
  } catch {
    dependencies.logger.error('chat_contact.operator_notification_failed', {
      requestId: dependencies.requestId,
      failureCategory: 'email_delivery',
    })
    return { ok: false, reason: 'delivery' }
  }

  try {
    await dependencies.emailService.sendChatContactReceipt(contact)
    dependencies.logger.info('chat_contact.receipt_sent', {
      requestId: dependencies.requestId,
      templateId: 'chat-contact-receipt',
    })
    return { ok: true, receiptStatus: 'sent' }
  } catch {
    dependencies.logger.warn('chat_contact.receipt_failed', {
      requestId: dependencies.requestId,
      templateId: 'chat-contact-receipt',
    })
    return { ok: true, receiptStatus: 'failed' }
  }
}
