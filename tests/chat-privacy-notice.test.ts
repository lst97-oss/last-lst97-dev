import { describe, expect, it } from 'bun:test'

import { getChatPrivacyNotice } from '../src/lib/chat-privacy-notice'

describe('chat privacy notice', () => {
  it('shows the normal-chat disclosure while ordinary messages are collected', () => {
    const expected =
      'Jev screens messages. Cloudflare checks each send; OpenRouter generates replies. Chat content and visit details may go to private Discord diagnostics.'

    expect(getChatPrivacyNotice('normal')).toBe(expected)
    expect(getChatPrivacyNotice('confirmation')).toBe(expected)
  })

  it('shows only the contact disclosure while contact details are collected', () => {
    expect(getChatPrivacyNotice('template_selection')).toBe(
      'Jev screens contact text; Cloudflare checks the send. If sent, it goes to Nelson; OpenRouter refines bug and feature reports, with the original attached. Don’t include secrets or private learner data.',
    )
    expect(getChatPrivacyNotice('filling')).toBe(getChatPrivacyNotice('template_selection'))
    expect(getChatPrivacyNotice('review')).toBe(getChatPrivacyNotice('template_selection'))
  })

  it('hides the privacy notice after contact collection is complete', () => {
    expect(getChatPrivacyNotice('delivered')).toBeUndefined()
  })
})
