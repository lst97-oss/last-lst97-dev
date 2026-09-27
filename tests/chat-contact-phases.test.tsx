import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChatContactPanel } from '../src/components/site/chat/chat-contact-panel'
import { ChatContactConfirmationPhase } from '../src/components/site/chat/contact/start-phases'
import type { ChatContactWorkflowViewModel } from '../src/components/site/chat/chat-types'

describe('chat contact phases', () => {
  test('requires a context token before starting or declining contact mode', () => {
    const markup = renderToStaticMarkup(createElement(ChatContactConfirmationPhase, {
      pending: false,
      hasContextToken: false,
      onStart: () => undefined,
      onDecline: () => undefined,
    }))

    expect(markup).toContain('Starting clears the current conversation.')
    expect(markup).toContain('START CONTACT SESSION')
    expect(markup).toContain('KEEP CHATTING')
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  test('uses the section element role without a redundant explicit region role', () => {
    const noop = () => undefined
    const workflow: ChatContactWorkflowViewModel = {
      state: { phase: 'confirmation' },
      draft: {},
      fieldErrors: { missingFields: [], invalidFields: [] },
      review: null,
      turnstileToken: null,
      turnstileResetCount: 0,
      discardConfirmation: false,
      hasContextToken: true,
      actions: {
        clearFieldError: noop,
        submitForm: noop,
        startContact: noop,
        declineContact: noop,
        chooseTemplate: noop,
        editReview: noop,
        confirmSend: noop,
        discard: noop,
        startBlankChat: noop,
        setTurnstileToken: noop,
        setDiscardConfirmation: noop,
      },
    }
    const markup = renderToStaticMarkup(createElement(ChatContactPanel, { workflow, pending: false }))

    expect(markup).toContain('aria-labelledby="chat-contact-panel-title"')
    expect(markup).not.toContain('role="region"')
  })
})
