import { cn } from 'cn'
import { pixelButtonVariants } from '@/components/site/os-ui'
import type { ChatContactTemplate } from '@/lib/chat-contact'
import { CHAT_CONTACT_TEMPLATES } from '@/lib/chat-contact'

export function ChatContactConfirmationPhase({
  pending,
  hasContextToken,
  onStart,
  onDecline,
}: {
  pending: boolean
  hasContextToken: boolean
  onStart: () => void
  onDecline: () => void
}) {
  return (
    <div className="os-chat-contact-card">
      <p>
        Starting clears the current conversation. Jev will screen this new contact session without the earlier chat
        context, and none of those earlier messages will be included in your email.
      </p>
      <div className="os-chat-contact-actions">
        <button
          className={cn(pixelButtonVariants({ tone: 'coral' }))}
          disabled={pending || !hasContextToken}
          onClick={onStart}
          type="button"
        >
          START CONTACT SESSION
        </button>
        <button
          className={cn(pixelButtonVariants())}
          disabled={pending || !hasContextToken}
          onClick={onDecline}
          type="button"
        >
          KEEP CHATTING
        </button>
      </div>
    </div>
  )
}

export function ChatContactTemplateSelectionPhase({
  pending,
  hasContextToken,
  onChoose,
}: {
  pending: boolean
  hasContextToken: boolean
  onChoose: (template: ChatContactTemplate) => void
}) {
  return (
    <div className="os-chat-contact-card">
      <p>
        Select one template. It stays locked for this session; choosing a different one requires discarding this request
        and starting again.
      </p>
      <div className="os-chat-contact-template-grid" role="group" aria-label="Contact templates">
        {(Object.keys(CHAT_CONTACT_TEMPLATES) as ChatContactTemplate[]).map((template) => (
          <button
            key={template}
            className="os-chat-contact-template"
            disabled={pending || !hasContextToken}
            onClick={() => onChoose(template)}
            type="button"
          >
            <strong>{CHAT_CONTACT_TEMPLATES[template].label}</strong>
            <span>{CHAT_CONTACT_TEMPLATES[template].description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
