import type { ChatContactUiState, ChatContactWorkflowViewModel } from '@/components/site/chat/chat-types'
import {
  ChatContactConfirmationPhase,
  ChatContactDeliveredPhase,
  ChatContactDiscardActions,
  ChatContactFormPhase,
  ChatContactReviewPhase,
  ChatContactTemplateSelectionPhase,
} from '@/components/site/chat/contact'
import { Eyebrow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { CHAT_CONTACT_TEMPLATES } from '@/lib/chat-contact'

interface ChatContactPanelProps {
  workflow: ChatContactWorkflowViewModel
  pending: boolean
  siteKey?: string | null
}

export function ChatContactPanel({ workflow, pending, siteKey }: ChatContactPanelProps) {
  const { state } = workflow
  if (!state) return null

  return (
    <section className="os-chat-contact-panel grid gap-3" aria-labelledby="chat-contact-panel-title">
      <div className="os-chat-contact-panel-heading border-3 border-border bg-primary p-4 shadow-os-sm">
        <Eyebrow className="m-0 mb-2">
          <PixelIcon glyph="@" /> CONTACT / {state.phase.replaceAll('_', ' ').toUpperCase()}
        </Eyebrow>
        <h2 id="chat-contact-panel-title" className="m-0 text-2xl leading-snug text-foreground">
          {getContactHeading(state)}
        </h2>
      </div>
      <ContactPhaseContent workflow={workflow} state={state} pending={pending} siteKey={siteKey} />
      {state.phase !== 'confirmation' && state.phase !== 'delivered' ? (
        <ChatContactDiscardActions
          pending={pending}
          hasContextToken={workflow.hasContextToken}
          discardConfirmation={workflow.discardConfirmation}
          onDiscard={workflow.actions.discard}
          onSetDiscardConfirmation={workflow.actions.setDiscardConfirmation}
        />
      ) : null}
    </section>
  )
}

function ContactPhaseContent({
  state,
  workflow,
  pending,
  siteKey,
}: {
  state: ChatContactUiState
  workflow: ChatContactWorkflowViewModel
  pending: boolean
  siteKey?: string | null
}) {
  switch (state.phase) {
    case 'confirmation':
      return (
        <ChatContactConfirmationPhase
          pending={pending}
          hasContextToken={workflow.hasContextToken}
          onStart={workflow.actions.startContact}
          onDecline={workflow.actions.declineContact}
        />
      )
    case 'template_selection':
      return (
        <ChatContactTemplateSelectionPhase
          pending={pending}
          hasContextToken={workflow.hasContextToken}
          onChoose={workflow.actions.chooseTemplate}
        />
      )
    case 'filling':
      return (
        <ChatContactFormPhase
          siteKey={siteKey}
          turnstileToken={workflow.screeningTurnstileToken}
          turnstileResetCount={workflow.screeningTurnstileResetCount}
          onSetTurnstileToken={workflow.actions.setScreeningTurnstileToken}
          initialValues={workflow.draft}
          onFieldChange={workflow.actions.clearFieldError}
          onSubmit={workflow.actions.submitForm}
          pending={pending}
          serverErrors={workflow.fieldErrors}
          template={state.template}
          canSubmit={workflow.hasContextToken}
        />
      )
    case 'review':
      return workflow.review ? (
        <ChatContactReviewPhase
          template={state.template}
          review={workflow.review}
          pending={pending}
          siteKey={siteKey}
          turnstileResetCount={workflow.turnstileResetCount}
          turnstileToken={workflow.turnstileToken}
          hasContextToken={workflow.hasContextToken}
          onSetTurnstileToken={workflow.actions.setTurnstileToken}
          onEdit={workflow.actions.editReview}
          onConfirmSend={workflow.actions.confirmSend}
        />
      ) : null
    case 'delivered':
      return (
        <ChatContactDeliveredPhase
          pending={pending}
          hasContextToken={workflow.hasContextToken}
          onStartBlankChat={workflow.actions.startBlankChat}
        />
      )
  }
}

function getContactHeading(state: ChatContactUiState): string {
  switch (state.phase) {
    case 'confirmation':
      return 'Start a fresh contact session?'
    case 'template_selection':
      return 'Choose a contact template'
    case 'filling':
      return `Complete the ${CHAT_CONTACT_TEMPLATES[state.template].label.toLowerCase()}`
    case 'review':
      return 'Review before sending'
    case 'delivered':
      return 'Contact email sent'
  }
}
