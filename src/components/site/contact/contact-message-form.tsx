import { useForm } from '@tanstack/react-form'
import { cn } from 'cn'
import { type ChangeEvent, useRef, useState } from 'react'
import { z } from 'zod'
import { BrowserCapabilityBoundary } from '@/components/site/browser-capability-boundary'
import { formErrorClass, pixelButtonVariants } from '@/components/site/os-ui'
import { TurnstileChallenge } from '@/components/site/turnstile-challenge'
import { CONTACT_BROWSER_REQUIREMENTS } from '@/lib/browser-capabilities'
import { contactResponseSchema } from '@/server/contact/contract'
import { contactSchema } from '@/server/contact/validation'

type ContactFormValues = {
  name: string
  email: string
  message: string
  website: string
}

const initialForm: ContactFormValues = { name: '', email: '', message: '', website: '' }

/**
 * The server enforces this cap in `contactSchema`; sharing one constant keeps
 * the visible counter and the enforced limit from ever disagreeing.
 */
const CONTACT_MESSAGE_MAX_LENGTH = 4_000

// Field-level validator for the honeypot. The shared schema gives this field a
// default, which widens its input type beyond the form value, so this mirrors
// that rule without the default (same pattern as the chat contact fields).
const websiteSchema = z.string().trim().max(200, 'Keep this field under 200 characters.')

export function ContactMessageForm({ siteKey }: { siteKey: string | null }) {
  return (
    <BrowserCapabilityBoundary feature="Contact form" requirements={CONTACT_BROWSER_REQUIREMENTS}>
      <ContactMessageFormContent siteKey={siteKey} />
    </BrowserCapabilityBoundary>
  )
}

function ContactMessageFormContent({ siteKey }: { siteKey: string | null }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetCount, setTurnstileResetCount] = useState(0)
  const isSubmittingRef = useRef(false)

  const form = useForm({
    defaultValues: initialForm,
    validators: { onSubmit: contactSchema as unknown as z.ZodType<unknown, ContactFormValues> },
    onSubmit: async ({ value }) => {
      if (isSubmittingRef.current) return
      isSubmittingRef.current = true

      setStatus('sending')
      setError('')
      try {
        const response = await fetch('/api/site/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...value, turnstileToken }),
        })
        if (!response.ok) {
          const parsed = contactResponseSchema.safeParse(await response.json().catch(() => null))
          throw new Error(parsed.success && parsed.data.error ? parsed.data.error : 'Could not send the message.')
        }
        setStatus('sent')
        form.reset()
        setTurnstileToken(null)
      } catch (requestError) {
        setStatus('error')
        setError(requestError instanceof Error ? requestError.message : 'Could not send the message.')
        setTurnstileToken(null)
        setTurnstileResetCount((count) => count + 1)
      } finally {
        isSubmittingRef.current = false
      }
    },
  })

  if (status === 'sent') {
    return (
      <div
        className="success-panel flex min-h-75 flex-col items-center justify-center gap-1.5 border-3 border-border bg-secondary p-6 text-center"
        role="status"
      >
        <span className="success-mark grid size-15 place-items-center border-3 border-border bg-primary text-3xl font-black">
          ✓
        </span>
        <h2 className="mb-0">Message delivered.</h2>
        <p className="m-0">Thanks for reaching out. The operator will get back to you soon.</p>
        <button className={cn(pixelButtonVariants())} onClick={() => setStatus('idle')} type="button">
          SEND ANOTHER
        </button>
      </div>
    )
  }

  return (
    <form
      className="contact-form mt-6 flex w-full flex-col gap-4.5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="form-grid grid grid-cols-1 gap-4.5">
        <form.Field name="name" validators={{ onChange: contactSchema.shape.name }}>
          {(fieldApi) => {
            const errorText = fieldErrorText(fieldApi.state.meta.errors)
            return (
              <label htmlFor="contact-name">
                <span className="mb-2 block text-xs font-black tracking-widest text-accent">YOUR NAME</span>
                <input
                  aria-describedby={errorText ? 'contact-name-error' : undefined}
                  aria-invalid={Boolean(errorText)}
                  id="contact-name"
                  maxLength={80}
                  onBlur={fieldApi.handleBlur}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => fieldApi.handleChange(event.target.value)}
                  required
                  value={fieldApi.state.value}
                />
                {errorText ? (
                  <p className={cn(formErrorClass)} id="contact-name-error" role="alert">
                    {errorText}
                  </p>
                ) : null}
              </label>
            )
          }}
        </form.Field>
        <form.Field name="email" validators={{ onChange: contactSchema.shape.email }}>
          {(fieldApi) => {
            const errorText = fieldErrorText(fieldApi.state.meta.errors)
            return (
              <label htmlFor="contact-email">
                <span className="mb-2 block text-xs font-black tracking-widest text-accent">EMAIL ADDRESS</span>
                <input
                  aria-describedby={errorText ? 'contact-email-error' : undefined}
                  aria-invalid={Boolean(errorText)}
                  id="contact-email"
                  maxLength={254}
                  onBlur={fieldApi.handleBlur}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => fieldApi.handleChange(event.target.value)}
                  required
                  type="email"
                  value={fieldApi.state.value}
                />
                {errorText ? (
                  <p className={cn(formErrorClass)} id="contact-email-error" role="alert">
                    {errorText}
                  </p>
                ) : null}
              </label>
            )
          }}
        </form.Field>
      </div>
      <form.Field name="message" validators={{ onChange: contactSchema.shape.message }}>
        {(fieldApi) => {
          const errorText = fieldErrorText(fieldApi.state.meta.errors)
          return (
            <label htmlFor="contact-message">
              <span className="mb-2 block text-xs font-black tracking-widest text-accent">MESSAGE</span>
              <textarea
                aria-describedby={[errorText ? 'contact-message-error' : undefined, 'contact-message-count']
                  .filter(Boolean)
                  .join(' ')}
                aria-invalid={Boolean(errorText)}
                id="contact-message"
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                onBlur={fieldApi.handleBlur}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => fieldApi.handleChange(event.target.value)}
                required
                rows={7}
                value={fieldApi.state.value}
              />
              <p
                className="contact-char-count m-0 mt-2 text-right text-xs text-muted-foreground"
                id="contact-message-count"
              >
                {fieldApi.state.value.length.toLocaleString('en-US')} /{' '}
                {CONTACT_MESSAGE_MAX_LENGTH.toLocaleString('en-US')}
              </p>
              {errorText ? (
                <p className={cn(formErrorClass)} id="contact-message-error" role="alert">
                  {errorText}
                </p>
              ) : null}
            </label>
          )
        }}
      </form.Field>
      <div className="turnstile-field" role="group" aria-labelledby="contact-form-turnstile-label">
        <span className="turnstile-label sr-only" id="contact-form-turnstile-label">
          Security check before sending contact message
        </span>
        {siteKey ? (
          <TurnstileChallenge
            action="contact"
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
      <form.Field name="website" validators={{ onChange: websiteSchema }}>
        {(fieldApi) => (
          <label className="honeypot" aria-hidden="true">
            <span>WEBSITE</span>
            <input
              autoComplete="off"
              tabIndex={-1}
              onChange={(event: ChangeEvent<HTMLInputElement>) => fieldApi.handleChange(event.target.value)}
              value={fieldApi.state.value}
            />
          </label>
        )}
      </form.Field>
      {status === 'error' ? (
        <p className={cn(formErrorClass)} role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions flex flex-wrap items-center gap-3">
        <p className="form-note m-0 text-xs text-muted-foreground">
          Messages are sent directly to the operator’s inbox.
        </p>
        <button
          className={cn(pixelButtonVariants({ tone: 'coral' }))}
          disabled={status === 'sending' || !siteKey || !turnstileToken}
          type="submit"
        >
          {status === 'sending' ? 'SENDING...' : 'TRANSMIT MESSAGE →'}
        </button>
      </div>
    </form>
  )
}

function fieldErrorText(errors: unknown): string | undefined {
  const candidates = Array.isArray(errors) ? errors : [errors]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate
    if (typeof candidate === 'object' && candidate !== null && 'message' in candidate) {
      const message = (candidate as { message?: unknown }).message
      if (typeof message === 'string' && message) return message
    }
  }
  return undefined
}
