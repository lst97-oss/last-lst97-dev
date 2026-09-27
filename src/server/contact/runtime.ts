import { createContactEmailService } from '../email/service'
import { createGmailEmailSender } from '../email/nodemailer-sender'
import type { ChatContactSubmission } from '../../lib/chat-contact'
import type { ChatContactEmailService, EmailSender } from '../email/types'
import { requiredServerEnv } from '../env'
import { logger } from '../observability/logger'
import { submitContactMessage } from './service'
import { createTurnstileVerifier } from './turnstile-verifier'
import type { TurnstileVerifier } from './types'
import { getModerationService } from '../moderation/runtime'
import { submitChatContactEmail as deliverChatContactEmail } from './chat-submission'
import { createChatContactApprovalStore } from './chat-approval-store'

let emailSender: ReturnType<typeof createGmailEmailSender> | undefined
let contactEmailService: ChatContactEmailService | undefined
let turnstileVerifier: TurnstileVerifier | undefined
let contactApprovalStore: ReturnType<typeof createChatContactApprovalStore> | undefined

const lazyEmailSender: EmailSender = {
  send(email) {
    emailSender ??= createGmailEmailSender()
    return emailSender.send(email)
  },
}

function getContactEmailService(): ChatContactEmailService {
  contactEmailService ??= createContactEmailService(lazyEmailSender, {
    contactRecipient: requiredServerEnv('CONTACT_TO'),
  })
  return contactEmailService
}

const lazyContactEmailService: ChatContactEmailService = {
  sendOperatorNotification(contact) {
    return getContactEmailService().sendOperatorNotification(contact)
  },
  sendReceivedConfirmation(contact) {
    return getContactEmailService().sendReceivedConfirmation(contact)
  },
  sendChatContactNotification(contact, originalReport) {
    return getContactEmailService().sendChatContactNotification(contact, originalReport)
  },
  sendChatContactReceipt(contact) {
    return getContactEmailService().sendChatContactReceipt(contact)
  },
}

const lazyTurnstileVerifier: TurnstileVerifier = {
  verify(token, expectedHostname) {
    turnstileVerifier ??= createTurnstileVerifier({
      secret: requiredServerEnv('TURNSTILE_SECRET_KEY'),
    })
    return turnstileVerifier.verify(token, expectedHostname)
  },
}

export function submitContact(input: unknown, expectedHostname: string, requestId: string) {
  return submitContactMessage(input, {
    emailService: lazyContactEmailService,
    verifier: lazyTurnstileVerifier,
    moderation: getModerationService(),
    expectedHostname,
    requestId,
    logger,
  })
}

export function submitChatContact(input: {
  submission: ChatContactSubmission
  originalSubmission?: ChatContactSubmission
  turnstileToken: string
  approvalId: string
  expectedHostname: string
  requestId: string
}) {
  contactApprovalStore ??= createChatContactApprovalStore()
  return deliverChatContactEmail(input.submission, input.turnstileToken, input.approvalId, {
    emailService: lazyContactEmailService,
    verifier: lazyTurnstileVerifier,
    claimApproval: (approvalId) => contactApprovalStore!.claim(approvalId),
    expectedHostname: input.expectedHostname,
    requestId: input.requestId,
    logger,
    ...(input.originalSubmission ? { originalReport: input.originalSubmission } : {}),
  })
}
