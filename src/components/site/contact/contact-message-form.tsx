import { useForm } from '@tanstack/react-form'
import { type ChangeEvent, useRef, useState } from 'react'
import { z } from 'zod'

import { contactSchema } from '../../../server/contact/validation'
import { TurnstileChallenge } from '../turnstile-challenge'

type ContactFormValues = {
  name: string
  email: string
  message: string
  website: string
}

const initialForm: ContactFormValues = { name: '', email: '', message: '', website: '' }

// Field-level validator for the honeypot. The shared schema gives this field a
// default, which widens its input type beyond the form value, so this mirrors
// that rule without the default (same pattern as the chat contact fields).
const websiteSchema = z.string().trim().max(200, 'Keep this field under 200 characters.')

export function ContactMessageForm({ siteKey }: { siteKey: string | null }) {
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
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? 'Could not send the message.')
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
      <div className="success-panel" role="status">
        <span className="success-mark">✓</span>
        <h2>Message delivered.</h2>
        <p>Thanks for reaching out. The operator will get back to you soon.</p>
        <button className="pixel-button" onClick={() => setStatus('idle')} type="button">SEND ANOTHER</button>
      </div>
    )
  }

  return (
    <form
      className="contact-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="form-grid">
        <form.Field name="name" validators={{ onChange: contactSchema.shape.name }}>
          {(fieldApi) => {
            const errorText = fieldErrorText(fieldApi.state.meta.errors)
            return (
              <label htmlFor="contact-name">
                <span>YOUR NAME</span>
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
                {errorText ? <p className="form-error" id="contact-name-error" role="alert">{errorText}</p> : null}
              </label>
            )
          }}
        </form.Field>
        <form.Field name="email" validators={{ onChange: contactSchema.shape.email }}>
          {(fieldApi) => {
            const errorText = fieldErrorText(fieldApi.state.meta.errors)
            return (
              <label htmlFor="contact-email">
                <span>EMAIL ADDRESS</span>
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
                {errorText ? <p className="form-error" id="contact-email-error" role="alert">{errorText}</p> : null}
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
              <span>MESSAGE</span>
              <textarea
                aria-describedby={errorText ? 'contact-message-error' : undefined}
                aria-invalid={Boolean(errorText)}
                id="contact-message"
                maxLength={4_000}
                onBlur={fieldApi.handleBlur}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => fieldApi.handleChange(event.target.value)}
                required
                rows={7}
                value={fieldApi.state.value}
              />
              {errorText ? <p className="form-error" id="contact-message-error" role="alert">{errorText}</p> : null}
            </label>
          )
        }}
      </form.Field>
      <div className="turnstile-field" role="group" aria-labelledby="contact-form-turnstile-label">
        <span className="turnstile-label sr-only" id="contact-form-turnstile-label">Security check before sending contact message</span>
        {siteKey ? (
          <TurnstileChallenge
            action="contact"
            siteKey={siteKey}
            resetCount={turnstileResetCount}
            onToken={setTurnstileToken}
          />
        ) : (
          <p className="turnstile-unavailable" role="status">The security check is not configured yet.</p>
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
      {status === 'error' ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="form-actions"><p className="form-note">Messages are sent directly to the operator’s inbox.</p><button className="pixel-button primary" disabled={status === 'sending' || !siteKey || !turnstileToken} type="submit">{status === 'sending' ? 'SENDING...' : 'TRANSMIT MESSAGE →'}</button></div>
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
