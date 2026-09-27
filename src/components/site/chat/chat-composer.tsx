import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { CHAT_TURN_LIMIT_MESSAGE, MAX_CHAT_TURNS } from '../../../lib/chat-limits'
import { TurnstileChallenge } from '../turnstile-challenge'
import type { ChatConversationViewModel } from './chat-types'

interface ChatComposerProps {
  conversation: ChatConversationViewModel
  pending: boolean
  siteKey?: string | null
}

export function ChatComposer({ conversation, pending, siteKey }: ChatComposerProps) {
  const { message, completedTurns, turnLimitReached, turnstileResetCount, turnstileToken } = conversation
  const { reset, sendMessage, setMessage, setTurnstileToken } = conversation.actions

  return (
    <>
      <div className="os-chat-turn-meta" aria-live="polite">
        <span>TURN {String(completedTurns).padStart(2, '0')} / {MAX_CHAT_TURNS}</span>
        {turnLimitReached ? (
          <button className="pixel-button primary os-chat-new-button" onClick={reset} type="button">
            CLEAR CHAT / START NEW
          </button>
        ) : null}
      </div>
      <form className="os-chat-form" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="chat-message">Message</label>
        <InputGroup className="os-chat-input-group h-auto min-h-[46px] w-auto min-w-0 flex-1 rounded-none border-[3px] border-[var(--os-ink)] bg-[var(--os-paper)] shadow-[4px_4px_0_var(--os-ink)]">
          <InputGroupAddon align="inline-start" className="pl-3 text-[var(--os-coral)]">
            <span aria-hidden="true" className="text-[20px] leading-none font-black">&gt;</span>
          </InputGroupAddon>
          <InputGroupInput
            id="chat-message"
            disabled={pending || turnLimitReached}
            maxLength={2_000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a question..."
            value={message}
            className="!px-4 font-mono text-[16px] text-[var(--os-ink)] placeholder:text-[var(--os-ink-soft)]/70 sm:text-[14px]"
          />
        </InputGroup>
        <button className="pixel-button primary os-chat-send shrink-0" disabled={pending || turnLimitReached || !message.trim() || !siteKey || !turnstileToken} type="submit">SEND ↵</button>
      </form>
      {!turnLimitReached ? (
        <div className="turnstile-field os-chat-chat-turnstile" role="group" aria-labelledby="chat-turnstile-label">
          <span className="turnstile-label sr-only" id="chat-turnstile-label">Security check for chat messages</span>
          {siteKey ? <TurnstileChallenge action="chat_message" siteKey={siteKey} resetCount={turnstileResetCount} onToken={setTurnstileToken} />
            : <p className="turnstile-unavailable" role="status">The security check is not configured yet.</p>}
        </div>
      ) : null}
      {turnLimitReached ? <p className="os-chat-limit-note" role="status">{CHAT_TURN_LIMIT_MESSAGE}</p> : null}
    </>
  )
}
