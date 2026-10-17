import { cn } from 'cn'
import { useId, useState } from 'react'
import { CHAT_PROMPT_GROUPS } from '@/components/site/chat/chat-prompt-groups'
import type { ChatConversationViewModel } from '@/components/site/chat/chat-types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ChatPromptSuggestionsProps {
  conversation: ChatConversationViewModel
  pending: boolean
}

/**
 * A collapsible, grouped list of example questions, expanded by default and
 * collapsed automatically once the first turn lands so it stops competing with
 * the transcript. The visitor can reopen it at any time.
 *
 * Groups are `Tabs` (Base UI) over the corpora the chat actually indexes, so a
 * visitor can aim at projects, writing, technical answers, coding activity, the
 * site, or the commercial offer without reading a list of every tool; the
 * primitive owns roving focus and arrow-key navigation, and `chat.css` owns the
 * pixel styling.
 *
 * Selecting an example fills the composer instead of sending, so it can be read
 * and edited first; the signed context and turn counter are untouched.
 *
 * Desktop only: `chat.css` hides the panel below 900px, where tabs and chips
 * would crowd the composer.
 */
export function ChatPromptSuggestions({ conversation, pending }: ChatPromptSuggestionsProps) {
  const { completedTurns, turnLimitReached } = conversation
  const { setMessage } = conversation.actions
  // `manual` is the visitor's own toggle; `null` means "follow the conversation".
  // Deriving the default from props matters: an effect-only collapse renders one
  // frame of the open panel after a turn starts, and never runs during SSR.
  const [manual, setManual] = useState<boolean | null>(null)
  const bodyId = useId()
  const disabled = pending || turnLimitReached
  // A turn in flight means the visitor has moved on to the conversation. This is
  // derived, not an effect: `pending` flips synchronously on submit, so the panel
  // closes in the same commit that disables the chips, and the rule holds during
  // SSR. `pending` outranks the visitor's toggle, so the panel is not a one-way
  // door.
  const open = pending ? false : (manual ?? completedTurns === 0)

  if (turnLimitReached) return null

  return (
    <div className={cn('os-chat-suggestions', !open && 'os-chat-suggestions--closed')}>
      <button
        aria-controls={bodyId}
        aria-expanded={open}
        className="os-chat-suggestions-summary"
        onClick={() => setManual(!open)}
        type="button"
      >
        <span className="os-chat-suggestions-label">TRY A QUESTION</span>
        <span aria-hidden="true" className="os-chat-suggestions-chevron">
          {open ? '−' : '+'}
        </span>
      </button>
      <div className="os-chat-suggestions-body" id={bodyId}>
        <Tabs defaultValue={CHAT_PROMPT_GROUPS[0]!.id}>
          <TabsList aria-label="Example question groups" className="os-chat-suggestions-tablist">
            {CHAT_PROMPT_GROUPS.map((group) => (
              <TabsTrigger className="os-chat-suggestions-tab" key={group.id} value={group.id}>
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CHAT_PROMPT_GROUPS.map((group) => (
            <TabsContent className="os-chat-suggestions-panel" key={group.id} value={group.id}>
              <ul className="os-chat-suggestions-list">
                {group.prompts.map((example) => (
                  <li key={example.prompt}>
                    <button
                      className="os-chat-suggestion"
                      disabled={disabled}
                      onClick={() => setMessage(example.prompt)}
                      type="button"
                    >
                      <span className="os-chat-suggestion-tool">{example.source}</span>
                      <span className="os-chat-suggestion-prompt">{example.prompt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
