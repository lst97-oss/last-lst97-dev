import { cn } from 'cn'
import { useId, useState } from 'react'
import type { ChatConversationViewModel } from '@/components/site/chat/chat-types'

/**
 * One clickable example per chat tool. Every prompt here is a phrase the real
 * routing recognises, so clicking one both teaches the shape of a good question
 * and exercises a genuine source rather than a decorative sample. Keep the wording
 * aligned with the Jev routing descriptions in
 * `src/server/moderation/typesafe-classifier/prompts.ts`.
 */
const SUGGESTIONS = [
  {
    tool: 'OWNED CATALOGUE',
    prompt: 'Show me all your projects.',
  },
  {
    tool: 'PROJECT COUNT',
    prompt: 'How many projects do you have in total?',
  },
  {
    tool: 'CODING TIME',
    prompt: 'How much time have you spent on the canto-101 project?',
  },
  {
    tool: 'WAKATIME SHARE',
    prompt: 'What is your WakaTime activity for the last 7 days?',
  },
  {
    tool: 'THIS SITE',
    prompt: 'What is the latest project published on this site?',
  },
  {
    tool: 'CHANGELOG',
    prompt: 'What is the latest entry in this site changelog?',
  },
  {
    tool: 'SITE MAP',
    prompt: 'What can I do on this site?',
  },
  {
    tool: 'KNOWLEDGE',
    prompt: 'What is your background and tech stack?',
  },
] as const

interface ChatPromptSuggestionsProps {
  conversation: ChatConversationViewModel
  pending: boolean
}

/**
 * A collapsible list of tool-shaped example questions, expanded by default and
 * collapsed automatically once the first turn lands so it stops competing with
 * the transcript. The visitor can reopen it at any time.
 *
 * Selecting an example fills the composer instead of sending, so it can be read
 * and edited first; the signed context and turn counter are untouched.
 *
 * Desktop only: `chat.css` hides the panel below 900px, where a stacked grid of
 * eight chips would crowd the composer.
 */
export function ChatPromptSuggestions({ conversation, pending }: ChatPromptSuggestionsProps) {
  const { completedTurns, turnLimitReached } = conversation
  const { setMessage } = conversation.actions
  // `manual` is the visitor's own toggle; `null` means "follow the conversation".
  // Deriving the default from props matters: an effect-only collapse renders one
  // frame of the open panel after a turn starts, and never runs during SSR.
  const [manual, setManual] = useState<boolean | null>(null)
  const listId = useId()
  const disabled = pending || turnLimitReached
  // A turn in flight means the visitor has moved on to the conversation, so the
  // panel stays shut for as long as the request runs. This is derived, not an
  // effect: `pending` flips synchronously on submit, so the panel closes in the
  // same commit that disables the chips — no frame of stale open panel after a
  // send, for the send button and the Enter key alike — and the rule holds
  // during SSR, where an effect never runs at all. `pending` outranks the
  // visitor's toggle so an explicitly reopened panel still collapses for the
  // turn in flight; once the reply lands the toggle decides again, so the
  // panel is not a one-way door.
  const open = pending ? false : (manual ?? completedTurns === 0)

  if (turnLimitReached) return null

  return (
    <div className={cn('os-chat-suggestions', !open && 'os-chat-suggestions--closed')}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        className="os-chat-suggestions-summary"
        onClick={() => setManual(!open)}
        type="button"
      >
        <span className="os-chat-suggestions-label">TRY A TOOL</span>
        <span aria-hidden="true" className="os-chat-suggestions-chevron">
          {open ? '−' : '+'}
        </span>
      </button>
      <ul className="os-chat-suggestions-list" id={listId}>
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.tool}>
            <button
              className="os-chat-suggestion"
              disabled={disabled}
              onClick={() => setMessage(suggestion.prompt)}
              type="button"
            >
              <span className="os-chat-suggestion-tool">{suggestion.tool}</span>
              <span className="os-chat-suggestion-prompt">{suggestion.prompt}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
