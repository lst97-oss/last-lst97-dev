import type { Dispatch } from 'react'

import type { ChatContactField, ChatContactFieldValues, ChatContactTemplate } from '../../../lib/chat-contact'
import type { ChatContactAction, ChatContactActionResponse } from '../../../server/chat/events'
import { chatContactActionResponseSchema } from '../../../server/chat/events'
import type { ChatSessionAction, ChatSessionState } from './chat-session-state'
import type { ChatContactWorkflowViewModel } from './chat-types'

interface UseChatContactWorkflowOptions {
  state: ChatSessionState
  dispatch: Dispatch<ChatSessionAction>
}

export function useChatContactWorkflow({
  state,
  dispatch,
}: UseChatContactWorkflowOptions): ChatContactWorkflowViewModel {
  const { contact, conversation } = state
  const contextToken = conversation.contextToken

  async function postAction(action: ChatContactAction) {
    dispatch({ type: 'status/set-pending', pending: true })
    dispatch({ type: 'status/clear-error' })
    dispatch({
      type: 'status/set-tool',
      toolStatus: action.action === 'confirm_send' ? 'SENDING REVIEWED EMAIL…' : 'SCREENING CONTACT REQUEST…',
    })
    try {
      const response = await fetch('/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action),
      })
      const parsed = chatContactActionResponseSchema.safeParse(await response.json().catch(() => null))
      const data: ChatContactActionResponse | null = parsed.success ? parsed.data : null
      if (!response.ok || !data?.event) {
        if (response.status === 400 && data?.error?.includes('expired')) {
          dispatch({
            type: 'conversation/reset',
            message: 'That contact session expired. Start a fresh conversation and I’ll be ready.',
          })
        }
        throw new Error(data?.error ?? 'The contact workflow is temporarily unavailable.')
      }
      dispatch({ type: 'contact/event', event: data.event })
    } catch (requestError) {
      dispatch({
        type: 'status/set-error',
        error:
          requestError instanceof Error ? requestError.message : 'The contact workflow is temporarily unavailable.',
      })
    } finally {
      dispatch({ type: 'status/set-pending', pending: false })
      dispatch({ type: 'status/set-tool', toolStatus: null })
    }
  }

  function clearFieldError(field: ChatContactField) {
    dispatch({ type: 'contact/clear-field-error', field })
  }

  function startContact() {
    if (!contextToken || contact.state?.phase !== 'confirmation') return
    void postAction({ action: 'start_contact', contextToken })
  }

  function declineContact() {
    if (!contextToken || contact.state?.phase !== 'confirmation') return
    void postAction({ action: 'decline_contact', contextToken })
  }

  function submitForm(fields: ChatContactFieldValues) {
    if (!contextToken || contact.state?.phase !== 'filling') return
    // Screening spends model calls, so an unverified submission never leaves the
    // browser. The server rejects a missing token with 403 regardless.
    if (!contact.screeningTurnstileToken) {
      dispatch({ type: 'status/set-error', error: 'Complete the security check to screen your request.' })
      return
    }
    dispatch({ type: 'contact/set-field-errors', fieldErrors: { missingFields: [], invalidFields: [] } })
    void postAction({ action: 'submit_form', contextToken, fields, turnstileToken: contact.screeningTurnstileToken })
  }

  function chooseTemplate(template: ChatContactTemplate) {
    if (!contextToken || contact.state?.phase !== 'template_selection') return
    void postAction({ action: 'select_template', contextToken, template })
  }

  function editReview() {
    if (!contextToken || contact.state?.phase !== 'review') return
    void postAction({ action: 'edit_form', contextToken })
  }

  function confirmSend() {
    if (!contextToken || contact.state?.phase !== 'review' || !contact.review || !contact.turnstileToken) return
    void postAction({
      action: 'confirm_send',
      contextToken,
      refinedSubmission: contact.review.refinedSubmission,
      originalSubmission: contact.review.originalSubmission,
      turnstileToken: contact.turnstileToken,
    })
  }

  function discard() {
    if (!contextToken || !contact.state || contact.state.phase === 'delivered') return
    if (!contact.discardConfirmation) {
      dispatch({ type: 'contact/set-discard-confirmation', confirmed: true })
      return
    }
    dispatch({ type: 'contact/set-discard-confirmation', confirmed: false })
    void postAction({ action: 'discard_contact', contextToken, confirmed: true })
  }

  function startBlankChat() {
    if (!contextToken || contact.state?.phase !== 'delivered') return
    void postAction({ action: 'start_new_chat', contextToken })
  }

  return {
    ...contact,
    hasContextToken: Boolean(contextToken),
    actions: {
      clearFieldError,
      submitForm,
      startContact,
      declineContact,
      chooseTemplate,
      editReview,
      confirmSend,
      discard,
      startBlankChat,
      setTurnstileToken: (token) => dispatch({ type: 'contact/set-turnstile-token', token }),
      setScreeningTurnstileToken: (token) => dispatch({ type: 'contact/set-screening-turnstile-token', token }),
      setDiscardConfirmation: (confirmed) => dispatch({ type: 'contact/set-discard-confirmation', confirmed }),
    },
  }
}
