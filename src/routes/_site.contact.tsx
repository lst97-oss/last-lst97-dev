import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { getTurnstileSiteKeyServerFn } from '../server/contact/server-functions'
import { TurnstileChallenge } from '../components/site/turnstile-challenge'

export const Route = createFileRoute('/_site/contact')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () => ({ meta: [{ title: 'Contact — LAST//OS' }, { name: 'description', content: 'Send a message to the operator.' }] }),
  component: ContactPage,
})

type FormState = { name: string; email: string; message: string; website: string }

const initialForm: FormState = { name: '', email: '', message: '', website: '' }

function ContactPage() {
  const siteKey = Route.useLoaderData()
  const [form, setForm] = useState<FormState>(initialForm)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetCount, setTurnstileResetCount] = useState(0)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const response = await fetch('/api/site/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? 'Could not send the message.')
      setStatus('sent')
      setForm(initialForm)
      setTurnstileToken(null)
    } catch (requestError) {
      setStatus('error')
      setError(requestError instanceof Error ? requestError.message : 'Could not send the message.')
      setTurnstileToken(null)
      setTurnstileResetCount((count) => count + 1)
    }
  }

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="page-stack narrow-page">
      <WindowFrame title="send-message.exe" icon="@">
        <div className="page-heading"><div><p className="eyebrow"><PixelIcon glyph="@" /> CONTACT / OUTBOUND</p><h1>Open a channel.</h1><p className="lead-copy">Have a project, question, or good link? Send it over.</p></div></div>
        {status === 'sent' ? (
          <div className="success-panel" role="status"><span className="success-mark">✓</span><h2>Message delivered.</h2><p>Thanks for reaching out. The operator will get back to you soon.</p><button className="pixel-button" onClick={() => setStatus('idle')} type="button">SEND ANOTHER</button></div>
        ) : (
          <form className="contact-form" onSubmit={submit}>
            <div className="form-grid">
              <label><span>YOUR NAME</span><input maxLength={80} onChange={(event) => update('name', event.target.value)} required value={form.name} /></label>
              <label><span>EMAIL ADDRESS</span><input maxLength={254} onChange={(event) => update('email', event.target.value)} required type="email" value={form.email} /></label>
            </div>
            <label><span>MESSAGE</span><textarea maxLength={4_000} minLength={10} onChange={(event) => update('message', event.target.value)} required rows={7} value={form.message} /></label>
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
            <label className="honeypot" aria-hidden="true"><span>WEBSITE</span><input autoComplete="off" tabIndex={-1} onChange={(event) => update('website', event.target.value)} value={form.website} /></label>
            {status === 'error' ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="form-actions"><p className="form-note">Messages are sent directly to the operator’s inbox.</p><button className="pixel-button primary" disabled={status === 'sending' || !siteKey || !turnstileToken} type="submit">{status === 'sending' ? 'SENDING...' : 'TRANSMIT MESSAGE →'}</button></div>
          </form>
        )}
      </WindowFrame>
    </div>
  )
}
