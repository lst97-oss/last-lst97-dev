import {
  CHAT_CONTACT_TEMPLATES,
  type ChatContactFieldValues,
  type ChatContactSubmission,
  type ChatContactTemplate,
  parseChatContactFields,
  validateChatContactDraft,
} from '../../../lib/chat-contact'
import type { ChatContextSigner } from '../../chat/context-signer'
import type { ChatContactActionRequest, ChatContactEvent } from '../../chat/events'
import type { ChatConversationContext, ChatWorkflowContext } from '../../chat/types'
import type { ModerationService } from '../../moderation/service'
import type { ModerationDiagnosticsObserver } from '../../moderation/types'
import type {
  ChatDiagnosticsCapture,
  ChatDiagnosticsSink,
  ChatModelCallDiagnostic,
} from '../../observability/chat-diagnostics'
import { createChatDiagnosticsCapture } from '../../observability/chat-diagnostics'
import type { ChatContactRefinementResult } from './refinement'
import type { ChatContactEmailSubmissionResult } from './submission'

export type ChatContactWorkflowResult =
  | { ok: true; event: ChatContactEvent }
  | { ok: false; reason: 'invalid_context' | 'invalid_transition' | 'invalid_review' }

type ContactReportRefiner = {
  refine(
    submission: ChatContactSubmission,
    observer?: (call: ChatModelCallDiagnostic) => void,
  ): Promise<ChatContactRefinementResult>
}

type WorkflowOutcome = 'complete' | 'blocked' | 'unavailable'
type OutcomeRecorder = (outcome: WorkflowOutcome) => void
type FillingWorkflow = Extract<ChatWorkflowContext, { mode: 'contact'; phase: 'filling' }>
type ReviewWorkflow = Extract<ChatWorkflowContext, { mode: 'contact'; phase: 'review' }>
type SubmitFormAction = Extract<ChatContactActionRequest, { action: 'submit_form' }>
type ConfirmSendAction = Extract<ChatContactActionRequest, { action: 'confirm_send' }>

function contactModeContext(workflow: ChatWorkflowContext): ChatConversationContext {
  return { messages: [], topicAnchors: [], workflow }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSubmission(template: ChatContactTemplate, value: unknown): ChatContactSubmission | undefined {
  if (!isRecord(value) || value.template !== template) return undefined
  const validation = validateChatContactDraft(template, value.fields)
  return validation.ok ? validation.submission : undefined
}

function emptyNormalContext(): ChatConversationContext {
  return { messages: [], topicAnchors: [], workflow: { mode: 'normal', phase: 'conversation' } }
}

function errorForModeration(reason: string | undefined, contextToken: string): ChatContactEvent {
  if (reason === 'out_of_scope') {
    return {
      type: 'contact_out_of_scope',
      text: 'This does not fit the selected template. Please revise the request and retry in this contact session.',
      contextToken,
    }
  }
  if (reason === 'unsafe') {
    return {
      type: 'contact_blocked',
      text: 'This request could not be accepted. Remove secrets, credentials, access tokens, cookies, and private learner data, then retry. Report suspected security issues through the contact page.',
      contextToken,
    }
  }
  return {
    type: 'contact_blocked',
    text: 'Jev could not safely classify this request. Please revise it and retry in this contact session.',
    contextToken,
  }
}

function proofFields(submission: ChatContactSubmission): ChatContactFieldValues {
  return Object.fromEntries(Object.entries(submission.fields)) as ChatContactFieldValues
}

function deliveryErrorText(reason: 'turnstile' | 'turnstile_unavailable' | 'duplicate' | 'delivery'): string {
  switch (reason) {
    case 'turnstile':
      return 'Complete the security check, then send this reviewed request again.'
    case 'turnstile_unavailable':
      return 'The security check is temporarily unavailable. Please retry.'
    case 'duplicate':
      return 'This reviewed request was already submitted. Edit and review it again to create a new approval.'
    case 'delivery':
      return 'The email could not be delivered. Edit and review the request before trying again.'
  }
}

export function createChatContactWorkflow(dependencies: {
  contextSigner: ChatContextSigner
  moderation: Pick<ModerationService, 'checkContactWorkflow'>
  refiner: ContactReportRefiner
  submitContact(input: {
    submission: ChatContactSubmission
    originalSubmission: ChatContactSubmission
    turnstileToken: string
    approvalId: string
    expectedHostname: string
    requestId: string
  }): Promise<ChatContactEmailSubmissionResult>
  diagnosticsSink?: ChatDiagnosticsSink
}) {
  function createDiagnosticsCapture(): ChatDiagnosticsCapture | undefined {
    if (!dependencies.diagnosticsSink) return undefined
    return createChatDiagnosticsCapture(
      { traceId: crypto.randomUUID(), message: '', history: [] },
      dependencies.diagnosticsSink,
    )
  }

  async function submitForm(
    input: SubmitFormAction,
    state: FillingWorkflow,
    observer: ModerationDiagnosticsObserver | undefined,
    diagnostics: ChatDiagnosticsCapture | undefined,
    recordOutcome: OutcomeRecorder,
  ): Promise<ChatContactWorkflowResult> {
    const template = state.template
    const parsedFields = parseChatContactFields(template, input.fields)
    if (!parsedFields.ok) {
      return {
        ok: true,
        event: {
          type: 'contact_form_incomplete',
          template,
          missingFields: [],
          invalidFields: parsedFields.invalidFields,
          contextToken: input.contextToken,
        },
      }
    }

    const checked = await dependencies.moderation.checkContactWorkflow?.(
      {
        phase: 'form',
        template,
        message: 'The user submitted the selected contact form.',
        fields: parsedFields.fields,
      },
      observer,
    )
    if (!checked || 'unavailable' in checked) {
      recordOutcome('unavailable')
      return {
        ok: true,
        event: {
          type: 'contact_unavailable',
          text: 'Message screening is temporarily unavailable. Your contact session is unchanged; please retry.',
          contextToken: input.contextToken,
        },
      }
    }
    if (!checked.allowed) {
      recordOutcome('blocked')
      return { ok: true, event: errorForModeration(checked.reason, input.contextToken) }
    }

    const validation = validateChatContactDraft(template, parsedFields.fields)
    if (!validation.ok) {
      return {
        ok: true,
        event: {
          type: 'contact_form_incomplete',
          template,
          missingFields: validation.missingFields,
          invalidFields: validation.invalidFields,
          contextToken: input.contextToken,
        },
      }
    }

    let refinement: ChatContactRefinementResult
    try {
      refinement = await dependencies.refiner.refine(validation.submission, diagnostics?.addModelCall)
    } catch {
      refinement = { ok: false, reason: 'unavailable' }
    }
    if (!refinement.ok) {
      recordOutcome('unavailable')
      return {
        ok: true,
        event: {
          type: 'contact_unavailable',
          text: 'The report refinement service is temporarily unavailable. Your original text is unchanged; please retry.',
          contextToken: input.contextToken,
        },
      }
    }
    if (
      refinement.submission.template !== template ||
      !validateChatContactDraft(template, refinement.submission.fields).ok
    ) {
      recordOutcome('unavailable')
      return {
        ok: true,
        event: {
          type: 'contact_unavailable',
          text: 'The report could not be prepared safely. Your contact session is unchanged; please retry.',
          contextToken: input.contextToken,
        },
      }
    }

    const createProof = dependencies.contextSigner.createContactReviewProof
    if (!createProof) {
      recordOutcome('unavailable')
      return {
        ok: true,
        event: {
          type: 'contact_unavailable',
          text: 'Review approval is temporarily unavailable. Please retry.',
          contextToken: input.contextToken,
        },
      }
    }

    const approvalId = crypto.randomUUID()
    const draftProof = await createProof(
      template,
      proofFields(refinement.submission),
      proofFields(validation.submission),
    )
    const contextToken = await dependencies.contextSigner.sign(
      contactModeContext({
        mode: 'contact',
        phase: 'review',
        template,
        reviewApproval: { id: approvalId, draftProof },
      }),
    )
    return {
      ok: true,
      event: {
        type: 'contact_review',
        template,
        originalSubmission: validation.submission,
        refinedSubmission: refinement.submission,
        contextToken,
      },
    }
  }

  async function confirmSend(
    input: ConfirmSendAction,
    state: ReviewWorkflow,
    recordOutcome: OutcomeRecorder,
  ): Promise<ChatContactWorkflowResult> {
    const template = state.template
    const refinedSubmission = parseSubmission(template, input.refinedSubmission)
    const originalSubmission = parseSubmission(template, input.originalSubmission)
    const verifyProof = dependencies.contextSigner.verifyContactReviewProof
    if (
      !refinedSubmission ||
      !originalSubmission ||
      !verifyProof ||
      !(await verifyProof(
        template,
        proofFields(refinedSubmission),
        state.reviewApproval.draftProof,
        proofFields(originalSubmission),
      ))
    ) {
      recordOutcome('blocked')
      return { ok: false, reason: 'invalid_review' }
    }

    let delivery: ChatContactEmailSubmissionResult
    try {
      delivery = await dependencies.submitContact({
        submission: refinedSubmission,
        originalSubmission,
        turnstileToken: input.turnstileToken,
        approvalId: state.reviewApproval.id,
        expectedHostname: input.expectedHostname,
        requestId: input.requestId,
      })
    } catch {
      delivery = { ok: false, reason: 'delivery' }
    }
    if (!delivery.ok) {
      return {
        ok: true,
        event: {
          type: 'contact_send_error',
          reason: delivery.reason,
          text: deliveryErrorText(delivery.reason),
          contextToken: input.contextToken,
        },
      }
    }

    const contextToken = await dependencies.contextSigner.sign(
      contactModeContext({ mode: 'contact', phase: 'delivered', template }),
    )
    return {
      ok: true,
      event: { type: 'contact_delivery', template, receiptStatus: delivery.receiptStatus, contextToken },
    }
  }

  return {
    async handle(input: ChatContactActionRequest): Promise<ChatContactWorkflowResult> {
      const diagnostics = createDiagnosticsCapture()
      const observer = diagnostics
        ? {
            onModelCall: diagnostics.addModelCall,
            onJevDecision: diagnostics.addJevDecision,
          }
        : undefined
      let outcome: 'complete' | 'blocked' | 'unavailable' = 'complete'

      try {
        const context = await dependencies.contextSigner.verify(input.contextToken)
        if (!context) {
          outcome = 'blocked'
          return { ok: false, reason: 'invalid_context' }
        }
        const state = context.workflow ?? { mode: 'normal', phase: 'conversation' }

        if (input.action === 'start_contact') {
          if (state.mode !== 'normal' || state.phase !== 'contact_confirmation') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          const workflow: ChatWorkflowContext = { mode: 'contact', phase: 'template_selection' }
          const contextToken = await dependencies.contextSigner.sign(contactModeContext(workflow))
          return {
            ok: true,
            event: {
              type: 'contact_started',
              text: 'Contact session started. This is a fresh chat; your earlier conversation has been cleared and will not be included.',
              contextToken,
            },
          }
        }

        if (input.action === 'decline_contact') {
          if (state.mode !== 'normal' || state.phase !== 'contact_confirmation') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          const contextToken = await dependencies.contextSigner.sign({
            messages: context.messages,
            topicAnchors: context.topicAnchors,
            projectListState: context.projectListState,
            workflow: { mode: 'normal', phase: 'conversation' },
          })
          return {
            ok: true,
            event: {
              type: 'contact_declined',
              text: 'Okay. Your earlier chat is unchanged. Send a new message whenever you are ready to continue.',
              contextToken,
            },
          }
        }

        if (input.action === 'select_template') {
          if (state.mode !== 'contact' || state.phase !== 'template_selection') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          const checked = await dependencies.moderation.checkContactWorkflow?.(
            {
              phase: 'template',
              template: input.template,
              message: `The user selected the ${CHAT_CONTACT_TEMPLATES[input.template].label} template.`,
              fields: {},
            },
            observer,
          )
          if (!checked || 'unavailable' in checked) {
            outcome = 'unavailable'
            return {
              ok: true,
              event: {
                type: 'contact_unavailable',
                text: 'Template screening is temporarily unavailable. Please retry.',
                contextToken: input.contextToken,
              },
            }
          }
          if (!checked.allowed) {
            outcome = 'blocked'
            return { ok: true, event: errorForModeration(checked.reason, input.contextToken) }
          }
          const contextToken = await dependencies.contextSigner.sign(
            contactModeContext({ mode: 'contact', phase: 'filling', template: input.template }),
          )
          return { ok: true, event: { type: 'contact_template_selected', template: input.template, contextToken } }
        }

        if (input.action === 'submit_form') {
          if (state.mode !== 'contact' || state.phase !== 'filling') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          return await submitForm(input, state, observer, diagnostics, (nextOutcome) => {
            outcome = nextOutcome
          })
        }

        if (input.action === 'edit_form') {
          if (state.mode !== 'contact' || state.phase !== 'review') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          const contextToken = await dependencies.contextSigner.sign(
            contactModeContext({ mode: 'contact', phase: 'filling', template: state.template }),
          )
          return { ok: true, event: { type: 'contact_editing', template: state.template, contextToken } }
        }

        if (input.action === 'confirm_send') {
          if (state.mode !== 'contact' || state.phase !== 'review') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          return await confirmSend(input, state, (nextOutcome) => {
            outcome = nextOutcome
          })
        }

        if (input.action === 'discard_contact') {
          if (state.mode !== 'contact' || state.phase === 'delivered' || input.confirmed !== true) {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          const contextToken = await dependencies.contextSigner.sign(emptyNormalContext())
          return {
            ok: true,
            event: {
              type: 'contact_discarded',
              text: 'The contact request has been cleared. This is a blank chat.',
              contextToken,
            },
          }
        }

        if (input.action === 'start_new_chat') {
          if (state.mode !== 'contact' || state.phase !== 'delivered') {
            outcome = 'blocked'
            return { ok: false, reason: 'invalid_transition' }
          }
          const contextToken = await dependencies.contextSigner.sign(emptyNormalContext())
          return { ok: true, event: { type: 'contact_new_chat', text: 'Started a new blank chat.', contextToken } }
        }

        outcome = 'blocked'
        return { ok: false, reason: 'invalid_transition' }
      } catch {
        outcome = 'unavailable'
        return {
          ok: true,
          event: {
            type: 'contact_unavailable',
            text: 'The contact workflow is temporarily unavailable. Your request has not been sent.',
            contextToken: input.contextToken,
          },
        }
      } finally {
        diagnostics?.finish({ outcome })
      }
    },
  }
}
