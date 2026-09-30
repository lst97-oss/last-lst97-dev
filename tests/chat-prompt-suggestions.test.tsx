import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChatPromptSuggestions } from '../src/components/site/chat/chat-prompt-suggestions'
import type { ChatConversationViewModel } from '../src/components/site/chat/chat-types'

function conversation(overrides: Partial<ChatConversationViewModel> = {}): ChatConversationViewModel {
  return {
    message: '',
    completedTurns: 0,
    turnLimitReached: false,
    turnstileResetCount: 0,
    turnstileToken: null,
    actions: {
      setMessage: () => {},
      sendMessage: async () => {},
      reset: () => {},
      setTurnstileToken: () => {},
    },
    ...overrides,
  } as ChatConversationViewModel
}

describe('ChatPromptSuggestions', () => {
  it('renders one example per chat tool, expanded on the first turn', () => {
    const html = renderToStaticMarkup(<ChatPromptSuggestions conversation={conversation()} pending={false} />)

    expect(html).toContain('aria-expanded="true"')
    // Every registered source is represented, so a visitor can see what the chat can do.
    for (const label of [
      'OWNED CATALOGUE',
      'PROJECT COUNT',
      'CODING TIME',
      'WAKATIME SHARE',
      'THIS SITE',
      'CHANGELOG',
      'SITE MAP',
      'KNOWLEDGE',
    ])
      expect(html).toContain(label)
  })

  it('uses prompts the real router recognises, not placeholder filler', () => {
    const html = renderToStaticMarkup(<ChatPromptSuggestions conversation={conversation()} pending={false} />)

    // These phrasings drive site_content, list_owned_projects, and coding_history.
    expect(html).toContain('What is the latest project published on this site?')
    expect(html).toContain('What is the latest entry in this site changelog?')
    expect(html).toContain('What can I do on this site?')
    expect(html).toContain('How many projects do you have in total?')
  })

  it('addresses the visitor in the second person, since the subject is Nelson', () => {
    const html = renderToStaticMarkup(<ChatPromptSuggestions conversation={conversation()} pending={false} />)

    // The chat's scope policy reads "you/your" as Nelson, so a first-person
    // example would be answered as though the visitor were asking about himself.
    expect(html).toContain('How much time have you spent on the canto-101 project?')
    expect(html).toContain('What is your WakaTime activity for the last 7 days?')
    expect(html).not.toContain('have I spent')
    expect(html).not.toContain('my WakaTime')
  })

  it('collapses once a turn has completed but stays reopenable', () => {
    const html = renderToStaticMarkup(
      <ChatPromptSuggestions conversation={conversation({ completedTurns: 1 })} pending={false} />,
    )

    expect(html).toContain('os-chat-suggestions--closed')
    // The toggle survives, so the panel is not a one-way door.
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('os-chat-suggestion')
  })

  it('collapses the moment a send starts, not when the reply lands', () => {
    // pending flips synchronously on submit, before the request resolves, so the
    // panel is gone the moment the visitor commits to a turn.
    const sending = renderToStaticMarkup(
      <ChatPromptSuggestions conversation={conversation()} pending={true} />,
    )

    expect(sending).toContain('os-chat-suggestions--closed')
    expect(sending).toContain('aria-expanded="false"')
    // A turn in flight also disables the chips so no second turn is queued.
    expect(sending).toContain('disabled')
  })

  it('hides entirely once the turn limit is reached', () => {
    const html = renderToStaticMarkup(
      <ChatPromptSuggestions conversation={conversation({ turnLimitReached: true })} pending={false} />,
    )

    expect(html).toBe('')
  })
})
