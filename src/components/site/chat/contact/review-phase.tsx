import type { ChatContactTemplate } from '../../../../lib/chat-contact'
import { CHAT_CONTACT_TEMPLATES } from '../../../../lib/chat-contact'
import { TurnstileChallenge } from '../../turnstile-challenge'
import type { ChatContactReview } from '../chat-types'

interface ChatContactReviewPhaseProps {
  template: ChatContactTemplate
  review: ChatContactReview
  pending: boolean
  siteKey?: string | null
  turnstileResetCount: number
  turnstileToken: string | null
  hasContextToken: boolean
  onSetTurnstileToken: (token: string | null) => void
  onEdit: () => void
  onConfirmSend: () => void
}

export function ChatContactReviewPhase({
  template,
  review,
  pending,
  siteKey,
  turnstileResetCount,
  turnstileToken,
  hasContextToken,
  onSetTurnstileToken,
  onEdit,
  onConfirmSend,
}: ChatContactReviewPhaseProps) {
  const contactDefinitions = CHAT_CONTACT_TEMPLATES[template].fields

  return (
    <div className="os-chat-contact-card os-chat-contact-review">
      <p className="form-note">{template === 'email'
        ? 'Check every detail. This email will be sent as written.'
        : 'This is the refined version of your report. Please check every detail before sending. The email will use this version; your original report will be attached as a PDF.'}</p>
      <dl className="os-chat-contact-review-meta">
        {review.refinedSubmission.fields.name ? <><dt>Name</dt><dd>{review.refinedSubmission.fields.name}</dd></> : null}
        <dt>Reply email</dt><dd>{review.refinedSubmission.fields.email}</dd>
      </dl>
      <h3>{template === 'email' ? 'Email content (as written)' : 'Refined version of your report'}</h3>
      <div className="os-chat-contact-review-fields">
        {contactDefinitions.filter((field) => field.key !== 'name' && field.key !== 'email').map((field) => {
          const refinedFields = review.refinedSubmission.fields as Record<string, string>
          return (
            <article key={field.key}>
              <h4>{field.label}</h4>
              <p>{refinedFields[field.key]?.trim() || 'Not provided'}</p>
            </article>
          )
        })}
      </div>
      {template !== 'email' ? (
        <details className="os-chat-contact-original">
          <summary>Show original text attached as original-report.pdf</summary>
          <div className="os-chat-contact-review-fields">
            {contactDefinitions.filter((field) => field.key !== 'name' && field.key !== 'email').map((field) => {
              const originalFields = review.originalSubmission.fields as Record<string, string>
              return (
                <article key={field.key}>
                  <h4>{field.label}</h4>
                  <p>{originalFields[field.key]?.trim() || 'Not provided'}</p>
                </article>
              )
            })}
          </div>
        </details>
      ) : <p className="os-chat-contact-example">Email messages are sent as written and do not have a report PDF attachment.</p>}
      <div className="turnstile-field os-chat-contact-turnstile" role="group" aria-labelledby="contact-turnstile-label">
        <span className="turnstile-label sr-only" id="contact-turnstile-label">Security check before sending email</span>
        {siteKey ? <TurnstileChallenge action="contact" siteKey={siteKey} resetCount={turnstileResetCount} onToken={onSetTurnstileToken} />
          : <p className="turnstile-unavailable" role="status">The security check is not configured yet.</p>}
      </div>
      <div className="os-chat-contact-actions">
        <button className="pixel-button" disabled={pending} onClick={onEdit} type="button">EDIT REQUEST</button>
        <button className="pixel-button primary" disabled={pending || !siteKey || !turnstileToken || !hasContextToken} onClick={onConfirmSend} type="button">SEND EMAIL</button>
      </div>
    </div>
  )
}
