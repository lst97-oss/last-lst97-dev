import type { ChatContactSubmission } from '../../lib/chat-contact'
import { createGmailEmailSender } from '../email/nodemailer-sender'
import { createContactEmailService } from '../email/service'
import type { ChatContactEmailService, EmailSender } from '../email/types'
import { requiredServerEnv } from '../env'
import { getModerationService } from '../moderation/runtime'
import { logger } from '../observability/logger'
import { createChatContactApprovalStore } from './chat/approval-store'
import { submitChatContactEmail as deliverChatContactEmail } from './chat/submission'
import { submitContactMessage } from './service'
import { createTurnstileVerifier } from './turnstile-verifier'
import type { TurnstileVerifier } from './types'

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

function getChatContactApprovalStore() {
  contactApprovalStore ??= createChatContactApprovalStore()
  return contactApprovalStore
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
  const approvalStore = getChatContactApprovalStore()
  return deliverChatContactEmail(input.submission, input.turnstileToken, input.approvalId, {
    emailService: lazyContactEmailService,
    verifier: lazyTurnstileVerifier,
    claimApproval: (approvalId) => approvalStore.claim(approvalId),
    expectedHostname: input.expectedHostname,
    requestId: input.requestId,
    logger,
    ...(input.originalSubmission ? { originalReport: input.originalSubmission } : {}),
  })
}
