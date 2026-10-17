import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { CHAT_PROMPT_GROUPS } from '../src/components/site/chat/chat-prompt-groups'
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
  it('renders one tab per question group, expanded on the first turn', () => {
    const html = renderToStaticMarkup(<ChatPromptSuggestions conversation={conversation()} pending={false} />)

    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('data-active')
    for (const group of CHAT_PROMPT_GROUPS) expect(html).toContain(group.label)
    // Only the active group's prompts mount; the rest live behind their tabs.
    for (const example of CHAT_PROMPT_GROUPS[0]!.prompts) expect(html).toContain(example.prompt)
  })

  it('groups prompts by the corpora the chat actually indexes', () => {
    expect(CHAT_PROMPT_GROUPS.map((group) => group.label)).toEqual([
      'ABOUT',
      'PROJECTS',
      'WRITING',
      'TECHNICAL',
      'CODING',
      'SITE',
      'SERVICES',
    ])

    const prompts = CHAT_PROMPT_GROUPS.flatMap((group) => group.prompts)
    expect(new Set(prompts.map((example) => example.prompt)).size).toBe(prompts.length)
    for (const example of prompts) {
      expect(example.source.length).toBeGreaterThan(0)
      expect(example.prompt.length).toBeGreaterThan(10)
    }

    // One representative prompt per corpus, pinned so a reword cannot silently
    // drop a source from the panel.
    for (const expected of [
      'What is your professional background and tech stack?',
      'Show me all your projects.',
      'How does the G-NAF address autocomplete route broad-prefix queries?',
      'Do you think code is cheap?',
      'How do you make a deployment safe when the API and database release separately?',
      'What is your all-time language breakdown?',
      'What is the latest changelog entry?',
      'What is the Go Support Plan?',
    ])
      expect(prompts.some((example) => example.prompt === expected)).toBe(true)
  })

  it('addresses the visitor in the second person, since the subject is Nelson', () => {
    // The chat's scope policy reads "you/your" as Nelson, so a first-person
    // example would be answered as though the visitor were asking about himself.
    // The single exception is the site-orientation question, which asks what the
    // visitor can do here.
    const firstPersonAboutNelson = /\b(?:my|have I)\b|\bI (?:spent|worked|built|coded|studied|graduated)\b/
    for (const example of CHAT_PROMPT_GROUPS.flatMap((group) => group.prompts)) {
      if (example.prompt === 'What can I do on this site?') continue
      expect(example.prompt).not.toMatch(firstPersonAboutNelson)
    }
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
    const sending = renderToStaticMarkup(<ChatPromptSuggestions conversation={conversation()} pending={true} />)

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
