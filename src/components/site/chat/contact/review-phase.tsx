import { cn } from 'cn'
import type { ChatContactReview } from '@/components/site/chat/chat-types'
import { pixelButtonVariants } from '@/components/site/os-ui'
import { TurnstileChallenge } from '@/components/site/turnstile-challenge'
import type { ChatContactTemplate } from '@/lib/chat-contact'
import { CHAT_CONTACT_TEMPLATES } from '@/lib/chat-contact'

/**
 * Every refined template names itself in the review copy, because a quotation
 * and a support request are commercial asks rather than bug reports. Keyed by
 * template and exhaustively typed, so the next template cannot silently fall
 * through to "report" — the same reasoning behind REPORT_TITLE in the PDF
 * renderer.
 */
const REVIEW_KIND: Record<Exclude<ChatContactTemplate, 'email'>, string> = {
  bug_report: 'report',
  feature_request: 'feature request',
  quotation: 'quotation request',
  support_plan: 'support plan request',
}

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
  const reviewKind = template === 'email' ? 'message' : REVIEW_KIND[template]
  // `refined` is false when the clarity pass could not produce usable JSON and
  // the visitor's own words were carried through. Saying "refined version"
  // then would describe something that never happened.
  const wasRefined = template === 'email' ? false : review.refined

  return (
    <div className="os-chat-contact-card os-chat-contact-review">
      <p className="form-note">
        {template === 'email'
          ? 'Check every detail. This email will be sent as written.'
          : wasRefined
            ? `This is the refined version of your ${reviewKind}. Please check every detail before sending. The email will use this version; your original ${reviewKind} will be attached as a PDF.`
            : `This is your ${reviewKind} exactly as you wrote it. The clarity pass could not prepare a cleaner version, so nothing has been changed. Please check every detail before sending.`}
      </p>
      <dl className="os-chat-contact-review-meta">
        {review.refinedSubmission.fields.name ? (
          <>
            <dt>Name</dt>
            <dd>{review.refinedSubmission.fields.name}</dd>
          </>
        ) : null}
        <dt>Reply email</dt>
        <dd>{review.refinedSubmission.fields.email}</dd>
      </dl>
      <h3>
        {template === 'email'
          ? 'Email content (as written)'
          : wasRefined
            ? `Refined version of your ${reviewKind}`
            : `Your ${reviewKind} as written`}
      </h3>
      <div className="os-chat-contact-review-fields">
        {contactDefinitions
          .filter((field) => field.key !== 'name' && field.key !== 'email')
          .map((field) => {
            const refinedFields = review.refinedSubmission.fields as Record<string, string>
            return (
              <article key={field.key}>
                <h4>{field.label}</h4>
                <p>{refinedFields[field.key]?.trim() || 'Not provided'}</p>
              </article>
            )
          })}
      </div>
      {template !== 'email' && wasRefined ? (
        <details className="os-chat-contact-original">
          <summary>Show original text attached as original-report.pdf</summary>
          <div className="os-chat-contact-review-fields">
            {contactDefinitions
              .filter((field) => field.key !== 'name' && field.key !== 'email')
              .map((field) => {
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
      ) : null}
      {template === 'email' ? (
        <p className="os-chat-contact-example">
          Email messages are sent as written and do not have a report PDF attachment.
        </p>
      ) : null}
      <div className="turnstile-field os-chat-contact-turnstile" role="group" aria-labelledby="contact-turnstile-label">
        <span className="turnstile-label sr-only" id="contact-turnstile-label">
          Security check before sending email
        </span>
        {siteKey ? (
          <TurnstileChallenge
            action="contact"
            siteKey={siteKey}
            resetCount={turnstileResetCount}
            onToken={onSetTurnstileToken}
          />
        ) : (
          <p className="turnstile-unavailable" role="status">
            The security check is not configured yet.
          </p>
        )}
      </div>
      <div className="os-chat-contact-actions">
        <button className={cn(pixelButtonVariants())} disabled={pending} onClick={onEdit} type="button">
          EDIT REQUEST
        </button>
        <button
          className={cn(pixelButtonVariants({ tone: 'coral' }))}
          disabled={pending || !siteKey || !turnstileToken || !hasContextToken}
          onClick={onConfirmSend}
          type="button"
        >
          SEND EMAIL
        </button>
      </div>
    </div>
  )
}
