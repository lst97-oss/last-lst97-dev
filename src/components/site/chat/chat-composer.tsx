import { cn } from 'cn'
import type { ChatConversationViewModel } from '@/components/site/chat/chat-types'
import { pixelButtonVariants } from '@/components/site/os-ui'
import { TurnstileChallenge } from '@/components/site/turnstile-challenge'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { CHAT_TURN_LIMIT_MESSAGE, MAX_CHAT_TURNS } from '@/lib/chat-limits'

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
          <button className={cn(pixelButtonVariants({ tone: 'coral' }), 'os-chat-new-button min-h-9 px-3 py-2 text-xs')} onClick={reset} type="button">
            CLEAR CHAT / START NEW
          </button>
        ) : null}
      </div>
      <form className="os-chat-form" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="chat-message">Message</label>
        <InputGroup className="os-chat-input-group h-auto min-h-11 w-auto min-w-0 flex-1 rounded-none border-3 border-border bg-card shadow-os-sm">
          <InputGroupAddon align="inline-start" className="pl-3 text-accent">
            <span aria-hidden="true" className="text-xl leading-none font-black">&gt;</span>
          </InputGroupAddon>
          <InputGroupInput
            id="chat-message"
            disabled={pending || turnLimitReached}
            maxLength={2_000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a question..."
            value={message}
            className="!px-4 font-mono text-base text-foreground placeholder:text-muted-foreground/70 sm:text-sm"
          />
        </InputGroup>
        <button className={cn(pixelButtonVariants({ tone: 'coral' }), 'os-chat-send shrink-0')} disabled={pending || turnLimitReached || !message.trim() || !siteKey || !turnstileToken} type="submit">SEND ↵</button>
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
