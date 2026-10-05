import { cn } from 'cn'
import { Send } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import type { ChatConversationViewModel } from '@/components/site/chat/chat-types'
import { pixelButtonVariants } from '@/components/site/os-ui'
import { TurnstileChallenge } from '@/components/site/turnstile-challenge'
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { CHAT_TURN_LIMIT_MESSAGE, MAX_CHAT_TURNS } from '@/lib/chat-limits'

/**
 * Hard cap on the growable composer, in px. Past this the textarea scrolls on
 * its own themed bar instead of pushing the suggestions and notices off screen.
 * This constant is the single source of truth: the height and the cap are both
 * computed from `scrollHeight` in JS, because neither a percentage nor a `dvh`
 * cap can resolve inside the composer's flex row. `chat.css` owns only what the
 * script cannot (padding, wrapping, the bar).
 */
export const CHAT_INPUT_MAX_HEIGHT_PX = 160

interface ChatComposerProps {
  conversation: ChatConversationViewModel
  pending: boolean
  siteKey?: string | null
}

export function ChatComposer({ conversation, pending, siteKey }: ChatComposerProps) {
  const { message, completedTurns, turnLimitReached, turnstileResetCount, turnstileToken } = conversation
  const { reset, sendMessage, setMessage, setTurnstileToken } = conversation.actions
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)

  // Measure from zero so the box grows with the draft and shrinks when cleared.
  // `pending` is a dependency because a completed turn clears the draft. Size
  // the send button from the textarea itself: measuring the form also includes
  // the button, which makes it grow on the stacked mobile layout.
  useLayoutEffect(() => {
    const node = messageRef.current
    const send = sendRef.current
    if (!node || !send) return

    const clearInlineSize = () => {
      node.style.removeProperty('height')
      send.style.removeProperty('height')
      send.style.removeProperty('width')
    }

    const syncComposerSize = () => {
      // While `BootGate` holds the shell at `display: none` there is no layout
      // box, so `scrollHeight` and the rect both read zero. Drop the inline size
      // instead and let the `rows={1}` fallback paint; the observer below
      // re-syncs from real geometry when the shell is revealed. The test is a
      // zero layout box rather than `offsetParent`, which is also null for a
      // visible control inside a `position: fixed` window frame.
      if (node.offsetWidth === 0 && node.offsetHeight === 0) {
        clearInlineSize()
        return
      }

      node.style.height = 'auto'
      const nextHeight = `${Math.min(node.scrollHeight, CHAT_INPUT_MAX_HEIGHT_PX)}px`
      if (window.matchMedia('(max-width: 900px)').matches) {
        // The mobile layout stacks the button under a full-width control, so it
        // takes its natural size there.
        send.style.removeProperty('height')
        send.style.removeProperty('width')
      } else {
        const size = `${Math.round(node.getBoundingClientRect().height)}px`
        send.style.height = size
        send.style.width = size
      }
      // Only write on change. This runs from a ResizeObserver callback, and an
      // unconditional write re-triggers the observer on every frame.
      if (node.style.height !== nextHeight) node.style.height = nextHeight
    }

    syncComposerSize()

    // The boot gate reveals the shell from a passive effect — which runs after
    // this one — and can also fail open on the 8s timer in the document head.
    // Neither changes `message` or `pending`, so nothing else would re-measure.
    // Observing the textarea catches the reveal, and also the container or the
    // viewport changing width, which is why this replaces the window listener.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncComposerSize)
      return () => window.removeEventListener('resize', syncComposerSize)
    }
    const observer = new ResizeObserver(syncComposerSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [message, pending])

  return (
    <>
      <div className="os-chat-turn-meta" aria-live="polite">
        <span>
          TURN {String(completedTurns).padStart(2, '0')} / {MAX_CHAT_TURNS}
        </span>
        {turnLimitReached ? (
          <button
            className={cn(pixelButtonVariants({ tone: 'coral' }), 'os-chat-new-button min-h-9 px-3 py-2 text-xs')}
            onClick={reset}
            type="button"
          >
            CLEAR CHAT / START NEW
          </button>
        ) : null}
      </div>
      <form className="os-chat-form" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="chat-message">
          Message
        </label>
        <InputGroup className="os-chat-input-group h-auto min-h-11 w-auto min-w-0 flex-1 items-start rounded-none border-3 border-border bg-card shadow-os-sm">
          <InputGroupTextarea
            ref={messageRef}
            id="chat-message"
            aria-label="Message Zita"
            disabled={pending || turnLimitReached}
            maxLength={2_000}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              // A textarea stopped submitting the form on Enter by itself, so
              // restore the single-line affordance: Enter sends, Shift+Enter
              // inserts a newline. The submitter is named explicitly because
              // bare `requestSubmit()` skips the spec's disabled check, which
              // would let Enter send while the greyed-out SEND button still
              // says the turn is blocked (no Turnstile token, empty draft).
              if (event.key !== 'Enter' || event.shiftKey) return
              event.preventDefault()
              const form = event.currentTarget.form
              if (!form) return
              const submitter = form.querySelector<HTMLButtonElement>('button[type="submit"]')
              if (submitter?.disabled) return
              form.requestSubmit(submitter ?? undefined)
            }}
            placeholder="Type a question..."
            rows={1}
            value={message}
            className="os-chat-input min-h-0 max-h-40 font-mono text-base leading-6 text-foreground placeholder:text-muted-foreground/70 sm:text-sm"
            style={{ maxHeight: CHAT_INPUT_MAX_HEIGHT_PX }}
          />
        </InputGroup>
        <button
          ref={sendRef}
          aria-label="Send message"
          className={cn(pixelButtonVariants({ tone: 'coral' }), 'os-chat-send shrink-0 p-0')}
          disabled={pending || turnLimitReached || !message.trim() || !siteKey || !turnstileToken}
          title="Send message"
          type="submit"
        >
          <Send aria-hidden="true" className="os-chat-send-icon size-7" strokeWidth={2.5} />
          <span className="os-chat-send-label">SEND</span>
        </button>
      </form>

      {/* Enter sends and Shift+Enter inserts a newline. The hint sits outside
          `</form>` so the send button keeps the square geometry the layout
          effect measures, and `responsive.css` hides it below 650px. */}
      <p className="os-chat-key-hint">
        <Kbd>ENTER</Kbd> SEND
        <KbdGroup>
          <Kbd>SHIFT</Kbd>
          <span>+</span>
          <Kbd>ENTER</Kbd>
        </KbdGroup>
        NEW LINE
      </p>
      {!turnLimitReached ? (
        <div className="turnstile-field os-chat-chat-turnstile" role="group" aria-labelledby="chat-turnstile-label">
          <span className="turnstile-label sr-only" id="chat-turnstile-label">
            Security check for chat messages
          </span>
          {siteKey ? (
            <TurnstileChallenge
              action="chat_message"
              siteKey={siteKey}
              resetCount={turnstileResetCount}
              onToken={setTurnstileToken}
            />
          ) : (
            <p className="turnstile-unavailable" role="status">
              The security check is not configured yet.
            </p>
          )}
        </div>
      ) : null}
      {turnLimitReached ? (
        <p className="os-chat-limit-note" role="status">
          {CHAT_TURN_LIMIT_MESSAGE}
        </p>
      ) : null}
    </>
  )
}
