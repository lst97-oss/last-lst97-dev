import { cn } from 'cn'
import { Trash2 } from 'lucide-react'
import { pixelButtonVariants } from '@/components/site/os-ui'

export function ChatContactDeliveredPhase({
  pending,
  hasContextToken,
  onStartBlankChat,
}: {
  pending: boolean
  hasContextToken: boolean
  onStartBlankChat: () => void
}) {
  return (
    <div className="os-chat-contact-card">
      <p>
        The contact session is complete. It will stay in contact mode until you start a new blank chat or discard it.
      </p>
      <button
        className={cn(pixelButtonVariants({ tone: 'coral' }))}
        disabled={pending || !hasContextToken}
        onClick={onStartBlankChat}
        type="button"
      >
        START NEW BLANK CHAT
      </button>
    </div>
  )
}

export function ChatContactDiscardActions({
  pending,
  hasContextToken,
  discardConfirmation,
  onDiscard,
  onSetDiscardConfirmation,
}: {
  pending: boolean
  hasContextToken: boolean
  discardConfirmation: boolean
  onDiscard: () => void
  onSetDiscardConfirmation: (confirmed: boolean) => void
}) {
  return (
    <div className="os-chat-contact-discard">
      {discardConfirmation ? (
        <p role="alert">This clears the whole contact request and starts a blank chat. This cannot be undone.</p>
      ) : null}
      <div className="os-chat-contact-actions">
        {discardConfirmation ? (
          <button
            className={cn(pixelButtonVariants())}
            disabled={pending}
            onClick={() => onSetDiscardConfirmation(false)}
            type="button"
          >
            KEEP THIS REQUEST
          </button>
        ) : null}
        <button
          className={cn(pixelButtonVariants(), 'os-chat-contact-discard-button text-error')}
          disabled={pending || !hasContextToken}
          onClick={onDiscard}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" strokeWidth={2.5} />
          {discardConfirmation ? 'CONFIRM DISCARD' : 'DISCARD CONTACT REQUEST'}
        </button>
      </div>
    </div>
  )
}
