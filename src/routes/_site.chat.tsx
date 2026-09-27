import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'

import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { ChatPipelineDiagram } from '../components/site/chat-pipeline-diagram'
import { ChatContextStack } from '../components/site/chat-context-stack'
import { ChatCitations } from '../components/site/chat-citations'
import { ChatMessageText } from '../components/site/chat-message-text'
import { useSiteHealthStatus } from '../components/site/site-health-provider'
import { TurnstileChallenge } from '../components/site/turnstile-challenge'
import type { ChatMessage } from '../server/chat/types'
import type { PublicCitation } from '../server/knowledge/retrieve'
import { chatStatusLabel, parseEventFrame, splitEventFrames } from '../server/chat/events'
import type { ChatContactAction, ChatContactEvent } from '../server/chat/events'
import { siteHealthLabel } from '../lib/site-health'
import { getChatPrivacyNotice } from '../lib/chat-privacy-notice'
import { CHAT_TURN_LIMIT_MESSAGE, isChatTurnLimitReached, MAX_CHAT_TURNS, nextCompletedChatTurnCount } from '../lib/chat-limits'
import { CHAT_CONTACT_TEMPLATES, createChatContactDraftSchema, createChatContactFieldSchema, createEmptyChatContactFields, type ChatContactField, type ChatContactFieldValues, type ChatContactTemplate } from '../lib/chat-contact'
import { getTurnstileSiteKeyServerFn } from '../server/contact/server-functions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import { Spinner } from '@/components/ui/spinner'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ChatViewMessage extends ChatMessage {
  citations?: PublicCitation[]
  knowledgeUnavailable?: boolean
}

type ChatContactUiState =
  | { phase: 'confirmation' }
  | { phase: 'template_selection' }
  | { phase: 'filling'; template: ChatContactTemplate }
  | { phase: 'review'; template: ChatContactTemplate }
  | { phase: 'delivered'; template: ChatContactTemplate }

type ChatContactReview = Extract<ChatContactEvent, { type: 'contact_review' }>

const WELCOME_MESSAGE = 'I’m Nelson’s portfolio assistant. Ask about his background, projects, open-source contributions, goals, or coding activity. I can search verified information from this site and explain what I can help with; I’m not a general-purpose assistant.'

export const Route = createFileRoute('/_site/chat')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () => ({ meta: [{ title: 'Chat — LAST//OS' }, { name: 'description', content: 'Start a conversation with the personal assistant.' }] }),
  component: ChatPage,
})

function ChatPage() {
  const siteKey = Route.useLoaderData()
  const healthStatus = useSiteHealthStatus()
  const [history, setHistory] = useState<ChatViewMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ])
  const [completedTurns, setCompletedTurns] = useState(0)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [contextToken, setContextToken] = useState<string | undefined>()
  const [contactState, setContactState] = useState<ChatContactUiState | null>(null)
  const [contactDraft, setContactDraft] = useState<ChatContactFieldValues>({})
  const [contactFieldErrors, setContactFieldErrors] = useState<{ missingFields: ChatContactField[]; invalidFields: ChatContactField[] }>({ missingFields: [], invalidFields: [] })
  const [contactReview, setContactReview] = useState<ChatContactReview | null>(null)
  const [chatTurnstileToken, setChatTurnstileToken] = useState<string | null>(null)
  const [chatTurnstileResetCount, setChatTurnstileResetCount] = useState(0)
  const [contactTurnstileToken, setContactTurnstileToken] = useState<string | null>(null)
  const [contactTurnstileResetCount, setContactTurnstileResetCount] = useState(0)
  const [discardConfirmation, setDiscardConfirmation] = useState(false)
  const turnLimitReached = isChatTurnLimitReached(completedTurns)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  function resetConversation(message: string) {
    setContextToken(undefined)
    setCompletedTurns(0)
    setMessage('')
    setError('')
    setToolStatus(null)
    setContactState(null)
    setContactDraft({})
    setContactFieldErrors({ missingFields: [], invalidFields: [] })
    setContactReview(null)
    setChatTurnstileToken(null)
    setChatTurnstileResetCount((count) => count + 1)
    setContactTurnstileToken(null)
    setDiscardConfirmation(false)
    setHistory([{ role: 'assistant', content: message }])
  }

  function patchDraft(patch: (draft: ChatViewMessage) => ChatViewMessage) {
    setHistory((current) => {
      if (current.length === 0) return current
      const next = [...current]
      next[next.length - 1] = patch(next[next.length - 1] as ChatViewMessage)
      return next
    })
  }

  function removeDraft() {
    setHistory((current) => {
      const last = current[current.length - 1] as ChatViewMessage | undefined
      if (!last || last.role !== 'assistant' || last.content || last.citations || last.knowledgeUnavailable) return current
      return current.slice(0, -1)
    })
  }

  function failDraft(message: string) {
    if (message.includes('expired')) {
      resetConversation('That conversation expired. Start a fresh conversation and I’ll be ready.')
      return
    }
    setError(message)
  }

  function appendContactNotice(text: string) {
    setHistory((current) => [...current, { role: 'assistant', content: text }])
  }

  function applyContactEvent(event: ChatContactEvent) {
    if ('contextToken' in event && event.contextToken) setContextToken(event.contextToken)
    setError('')

    switch (event.type) {
      case 'contact_confirmation':
        setHistory((current) => {
          const next = [...current]
          if (next.at(-1)?.role === 'assistant' && !next.at(-1)?.content) next.pop()
          if (next.at(-1)?.role === 'user') next.pop()
          return [...next, { role: 'assistant', content: event.text }]
        })
        setContactState({ phase: 'confirmation' })
        setContactDraft({})
        setContactReview(null)
        break
      case 'contact_declined':
        setContactState(null)
        setContactDraft({})
        setContactReview(null)
        appendContactNotice(event.text)
        break
      case 'contact_started':
        setHistory([{ role: 'assistant', content: event.text }])
        setCompletedTurns(0)
        setContactState({ phase: 'template_selection' })
        setContactDraft({})
        setContactFieldErrors({ missingFields: [], invalidFields: [] })
        setContactReview(null)
        setDiscardConfirmation(false)
        break
      case 'contact_template_selected':
        setContactState({ phase: 'filling', template: event.template })
        setContactDraft(createEmptyChatContactFields(event.template))
        setContactFieldErrors({ missingFields: [], invalidFields: [] })
        appendContactNotice(`${CHAT_CONTACT_TEMPLATES[event.template].label} selected. This template stays locked for this contact session.`)
        break
      case 'contact_form_incomplete':
        setContactFieldErrors({ missingFields: event.missingFields, invalidFields: event.invalidFields })
        break
      case 'contact_out_of_scope':
      case 'contact_blocked':
      case 'contact_unavailable':
      case 'contact_send_error':
        appendContactNotice(event.text)
        if (event.type === 'contact_send_error') {
          setContactTurnstileToken(null)
          setContactTurnstileResetCount((count) => count + 1)
        }
        break
      case 'contact_review':
        setContactReview(event)
        setContactState({ phase: 'review', template: event.template })
        setContactFieldErrors({ missingFields: [], invalidFields: [] })
        setContactTurnstileToken(null)
        setContactTurnstileResetCount((count) => count + 1)
        break
      case 'contact_editing': {
        const originalFields = contactReview?.originalSubmission.fields as ChatContactFieldValues | undefined
        setContactDraft(originalFields ?? createEmptyChatContactFields(event.template))
        setContactState({ phase: 'filling', template: event.template })
        setContactFieldErrors({ missingFields: [], invalidFields: [] })
        setContactTurnstileToken(null)
        break
      }
      case 'contact_delivery':
        setContactState({ phase: 'delivered', template: event.template })
        appendContactNotice(event.receiptStatus === 'sent'
          ? 'Your email has been sent. A short receipt was sent to your reply address.'
          : 'Your email has been sent. The owner notification was delivered, but the receipt email could not be sent.')
        break
      case 'contact_discarded':
      case 'contact_new_chat':
        resetConversation(event.text)
        setContextToken(event.contextToken)
        break
      default:
    }
  }

  async function postContactAction(action: ChatContactAction) {
    setPending(true)
    setError('')
    setToolStatus(action.action === 'confirm_send' ? 'SENDING REVIEWED EMAIL…' : 'SCREENING CONTACT REQUEST…')
    try {
      const response = await fetch('/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action),
      })
      const data = (await response.json().catch(() => null)) as { error?: string; event?: ChatContactEvent } | null
      if (!response.ok || !data?.event) {
        if (response.status === 400 && data?.error?.includes('expired')) {
          resetConversation('That contact session expired. Start a fresh conversation and I’ll be ready.')
        }
        throw new Error(data?.error ?? 'The contact workflow is temporarily unavailable.')
      }
      applyContactEvent(data.event)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The contact workflow is temporarily unavailable.')
    } finally {
      setPending(false)
      setToolStatus(null)
    }
  }

  function clearContactFieldError(field: ChatContactField) {
    setContactFieldErrors((current) => ({
      missingFields: current.missingFields.filter((item) => item !== field),
      invalidFields: current.invalidFields.filter((item) => item !== field),
    }))
  }

  function submitContactForm(fields: ChatContactFieldValues) {
    if (!contextToken || contactState?.phase !== 'filling') return
    setContactFieldErrors({ missingFields: [], invalidFields: [] })
    void postContactAction({ action: 'submit_form', contextToken, fields })
  }

  function chooseContactTemplate(template: ChatContactTemplate) {
    if (!contextToken || contactState?.phase !== 'template_selection') return
    void postContactAction({ action: 'select_template', contextToken, template })
  }

  function editContactReview() {
    if (!contextToken || contactState?.phase !== 'review') return
    void postContactAction({ action: 'edit_form', contextToken })
  }

  function confirmContactSend() {
    if (!contextToken || contactState?.phase !== 'review' || !contactReview || !contactTurnstileToken) return
    void postContactAction({
      action: 'confirm_send',
      contextToken,
      refinedSubmission: contactReview.refinedSubmission,
      originalSubmission: contactReview.originalSubmission,
      turnstileToken: contactTurnstileToken,
    })
  }

  function discardContact() {
    if (!contextToken || !contactState || contactState.phase === 'delivered') return
    if (!discardConfirmation) {
      setDiscardConfirmation(true)
      return
    }
    setDiscardConfirmation(false)
    void postContactAction({ action: 'discard_contact', contextToken, confirmed: true })
  }

  function startBlankChat() {
    if (!contextToken || contactState?.phase !== 'delivered') return
    void postContactAction({ action: 'start_new_chat', contextToken })
  }

  async function readStream(response: Response) {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('The assistant is offline right now.')
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { frames, rest } = splitEventFrames(buffer)
        buffer = rest
        for (const frame of frames) {
          const parsed = parseEventFrame(frame)
          if (!parsed) continue
          const data = parsed.data as Record<string, unknown>
          switch (parsed.name) {
            case 'status': {
              const label = chatStatusLabel(data.status)
              if (label) setToolStatus(label)
              break
            }
            case 'token':
              patchDraft((draft) => ({ ...draft, content: `${draft.content}${String(data.delta ?? '')}` }))
              break
            case 'tool_start':
              setToolStatus(String(data.label ?? 'WORKING…'))
              break
            case 'tool_result':
              // Hold the last tool label until the first token arrives: with
              // multi-step agent loops the status would otherwise flash blank
              // between consecutive tool calls.
              break
            case 'citations':
              patchDraft((draft) => ({ ...draft, citations: data.citations as PublicCitation[] }))
              break
            case 'knowledge_note':
              patchDraft((draft) => ({ ...draft, knowledgeUnavailable: true }))
              break
            case 'done':
              setContextToken(data.contextToken as string | undefined)
              setCompletedTurns((current) => nextCompletedChatTurnCount(current))
              setToolStatus(null)
              break
            case 'contact_confirmation':
              applyContactEvent(data as unknown as Extract<ChatContactEvent, { type: 'contact_confirmation' }>)
              setToolStatus(null)
              break
            case 'error':
              removeDraft()
              if (data.code === 'turn_limit') setCompletedTurns(MAX_CHAT_TURNS)
              failDraft(String(data.message ?? 'The assistant is offline right now.'))
              break
            default:
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextMessage = message.trim()
    if (!nextMessage || pending || turnLimitReached) return
    if (!chatTurnstileToken) {
      setError('Complete the security check before sending your message.')
      return
    }
    const submittedTurnstileToken = chatTurnstileToken

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError('')
    setToolStatus(null)
    setHistory((current) => [...current, { role: 'user', content: nextMessage }])
    setPending(true)

    try {
      const response = await fetch('/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({ message: nextMessage, contextToken, turnstileToken: submittedTurnstileToken }),
        signal: controller.signal,
      })
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('text/event-stream')) {
        setMessage('')
        setHistory((current) => [...current, { role: 'assistant', content: '' }])
        await readStream(response)
        return
      }
      const data = (await response.json().catch(() => null)) as {
        reply?: string
        error?: string
        contextToken?: string
        citations?: PublicCitation[]
        knowledgeUnavailable?: boolean
        code?: string
      } | null
      if (!response.ok || !data?.reply) {
        if (data?.code === 'turn_limit') setCompletedTurns(MAX_CHAT_TURNS)
        if (data?.code === 'turnstile_invalid' || data?.code === 'turnstile_unavailable' || response.status === 429) {
          setMessage(nextMessage)
          setHistory((current) => {
            const last = current.at(-1)
            return last?.role === 'user' && last.content === nextMessage ? current.slice(0, -1) : current
          })
        }
        if (response.status === 400 && data?.error?.includes('expired')) {
          resetConversation('That conversation expired. Start a fresh conversation and I’ll be ready.')
        }
        throw new Error(data?.error ?? 'The assistant is offline right now.')
      }
      setMessage('')
      setHistory((current) => [...current, {
        role: 'assistant',
        content: data.reply as string,
        ...(data.citations ? { citations: data.citations } : {}),
        ...(data.knowledgeUnavailable ? { knowledgeUnavailable: true } : {}),
      }])
      setContextToken(data.contextToken)
      setCompletedTurns((current) => nextCompletedChatTurnCount(current))
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      removeDraft()
      setError(requestError instanceof Error ? requestError.message : 'The assistant is offline right now.')
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setChatTurnstileToken(null)
        setChatTurnstileResetCount((count) => count + 1)
        setPending(false)
        setToolStatus(null)
      }
    }
  }

  const activeTemplate = contactState && 'template' in contactState ? contactState.template : undefined
  const privacyNotice = getChatPrivacyNotice(contactState?.phase ?? 'normal')
  const contactConfiguration = activeTemplate ? CHAT_CONTACT_TEMPLATES[activeTemplate] : undefined
  const contactDefinitions = contactConfiguration?.fields ?? []
  const contactPanel = contactState ? (
    <section className="os-chat-contact-panel" aria-labelledby="chat-contact-panel-title" role="region">
      <div className="os-chat-contact-panel-heading">
        <p className="eyebrow"><PixelIcon glyph="@" /> CONTACT / {contactState.phase.replaceAll('_', ' ').toUpperCase()}</p>
        <h2 id="chat-contact-panel-title">
          {contactState.phase === 'confirmation' ? 'Start a fresh contact session?'
            : contactState.phase === 'template_selection' ? 'Choose a contact template'
              : contactState.phase === 'filling' ? `Complete the ${CHAT_CONTACT_TEMPLATES[contactState.template].label.toLowerCase()}`
                : contactState.phase === 'review' ? 'Review before sending'
                  : 'Contact email sent'}
        </h2>
      </div>

      {contactState.phase === 'confirmation' ? (
        <div className="os-chat-contact-card">
          <p>Starting clears the current conversation. Jev will screen this new contact session without the earlier chat context, and none of those earlier messages will be included in your email.</p>
          <div className="os-chat-contact-actions">
            <button className="pixel-button primary" disabled={pending || !contextToken} onClick={() => contextToken && void postContactAction({ action: 'start_contact', contextToken })} type="button">START CONTACT SESSION</button>
            <button className="pixel-button" disabled={pending || !contextToken} onClick={() => contextToken && void postContactAction({ action: 'decline_contact', contextToken })} type="button">KEEP CHATTING</button>
          </div>
        </div>
      ) : null}

      {contactState.phase === 'template_selection' ? (
        <div className="os-chat-contact-card">
          <p>Select one template. It stays locked for this session; choosing a different one requires discarding this request and starting again.</p>
          <div className="os-chat-contact-template-grid" role="group" aria-label="Contact templates">
            {(Object.keys(CHAT_CONTACT_TEMPLATES) as ChatContactTemplate[]).map((template) => (
              <button
                key={template}
                className="os-chat-contact-template"
                disabled={pending || !contextToken}
                onClick={() => chooseContactTemplate(template)}
                type="button"
              >
                <strong>{CHAT_CONTACT_TEMPLATES[template].label}</strong>
                <span>{CHAT_CONTACT_TEMPLATES[template].description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {contactState.phase === 'filling' ? (
        <ChatContactFormCard
          initialValues={contactDraft}
          onFieldChange={clearContactFieldError}
          onSubmit={submitContactForm}
          pending={pending}
          serverErrors={contactFieldErrors}
          template={contactState.template}
          canSubmit={Boolean(contextToken)}
        />
      ) : null}

      {contactState.phase === 'review' && contactReview ? (
        <div className="os-chat-contact-card os-chat-contact-review">
          <p className="form-note">{contactState.template === 'email'
            ? 'Check every detail. This email will be sent as written.'
            : 'This is the refined version of your report. Please check every detail before sending. The email will use this version; your original report will be attached as a PDF.'}</p>
          <dl className="os-chat-contact-review-meta">
            {contactReview.refinedSubmission.fields.name ? <><dt>Name</dt><dd>{contactReview.refinedSubmission.fields.name}</dd></> : null}
            <dt>Reply email</dt><dd>{contactReview.refinedSubmission.fields.email}</dd>
          </dl>
          <h3>{contactState.template === 'email' ? 'Email content (as written)' : 'Refined version of your report'}</h3>
          <div className="os-chat-contact-review-fields">
            {contactDefinitions.filter((field) => field.key !== 'name' && field.key !== 'email').map((field) => {
              const refinedFields = contactReview.refinedSubmission.fields as Record<string, string>
              return (
                <article key={field.key}>
                  <h4>{field.label}</h4>
                  <p>{refinedFields[field.key]?.trim() || 'Not provided'}</p>
                </article>
              )
            })}
          </div>
          {contactState.template !== 'email' ? (
            <details className="os-chat-contact-original">
              <summary>Show original text attached as original-report.pdf</summary>
              <div className="os-chat-contact-review-fields">
                {contactDefinitions.filter((field) => field.key !== 'name' && field.key !== 'email').map((field) => {
                  const originalFields = contactReview.originalSubmission.fields as Record<string, string>
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
            {siteKey ? <TurnstileChallenge action="contact" siteKey={siteKey} resetCount={contactTurnstileResetCount} onToken={setContactTurnstileToken} />
              : <p className="turnstile-unavailable" role="status">The security check is not configured yet.</p>}
          </div>
          <div className="os-chat-contact-actions">
            <button className="pixel-button" disabled={pending} onClick={editContactReview} type="button">EDIT REQUEST</button>
            <button className="pixel-button primary" disabled={pending || !siteKey || !contactTurnstileToken || !contextToken} onClick={confirmContactSend} type="button">SEND EMAIL</button>
          </div>
        </div>
      ) : null}

      {contactState.phase === 'delivered' ? (
        <div className="os-chat-contact-card">
          <p>The contact session is complete. It will stay in contact mode until you start a new blank chat or discard it.</p>
          <button className="pixel-button primary" disabled={pending || !contextToken} onClick={startBlankChat} type="button">START NEW BLANK CHAT</button>
        </div>
      ) : null}

      {contactState.phase !== 'confirmation' && contactState.phase !== 'delivered' ? (
        <div className="os-chat-contact-discard">
          {discardConfirmation ? <p role="alert">This clears the whole contact request and starts a blank chat. This cannot be undone.</p> : null}
          <div className="os-chat-contact-actions">
            {discardConfirmation ? <button className="pixel-button" disabled={pending} onClick={() => setDiscardConfirmation(false)} type="button">KEEP THIS REQUEST</button> : null}
            <button className={discardConfirmation ? 'pixel-button danger' : 'pixel-button'} disabled={pending || !contextToken} onClick={discardContact} type="button">
              {discardConfirmation ? 'CONFIRM DISCARD' : 'DISCARD CONTACT REQUEST'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  ) : null

  return (
    <div className="page-stack narrow-page">
      <WindowFrame title="assistant.shell" icon=">" className="chat-window">
        <div className="page-heading">
          <div>
            <p className="eyebrow"><PixelIcon glyph=">" /> CHAT / LIVE</p>
            <h1>Ask the operator’s assistant.</h1>
          </div>
          <div className="chat-heading-tools">
            <span className="online-badge" data-health={healthStatus} role="status" aria-live="polite">
              <span /> {siteHealthLabel(healthStatus)}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <button aria-label="How this chat works" className="chat-help-button" type="button">?</button>
              </DialogTrigger>
              <DialogContent className="chat-pipeline-dialog">
                <DialogHeader>
                  <p className="eyebrow"><PixelIcon glyph="?" /> SYSTEM / PIPELINE</p>
                  <DialogTitle>How your question is processed</DialogTitle>
                  <DialogDescription className="chat-pipeline-description">
                    Follow the request from the chat to the answer. The server first verifies the HMAC-signed conversation context, then Jev reads a compact slice of that history to judge safety, scope, and which read-only sources fit your question. Owned-project lists use a structured catalogue query; detailed knowledge passages are checked for direct relevance before they reach the answer model. The answer model then receives the whole verified conversation plus this turn&apos;s evidence. The same Jev screening also decides whether your message is contact intent; if it is, the second diagram shows the separate email, bug report, and feature request workflow you enter only after you confirm. Drag to pan; use the controls to zoom.
                  </DialogDescription>
                </DialogHeader>
                <ChatPipelineDiagram />
                <ol className="chat-pipeline-list">
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">01</span>
                    <div>
                      <h3>Submit and validate the request</h3>
                      <p>The React chat sends your message, signed context token, and a fresh Turnstile token for the <code>chat_message</code> action to the TanStack Start API. Most visitors pass without seeing the widget; Cloudflare shows an interactive challenge when it needs one. The server checks the request shape and body size, applies rate limits, and verifies Turnstile before Jev screens the message. The token is not passed to Jev, OpenRouter, diagnostics, or signed context.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">02</span>
                    <div>
                      <h3>Verify the signed context</h3>
                      <p>Before any model call, the server verifies the HMAC signature over the context envelope, its 24-hour expiry, and the 20-turn limit. A tampered, edited, malformed, or expired token is rejected outright: no screening, no tool, no answer model. What survives verification is the trusted conversation — up to 40 user and assistant messages (20 exchanges), each capped at 2,000 characters, plus up to 8 topic anchors recording which approved sources already answered which question, and the owned-project list state. This state is server-signed, so the browser cannot edit what the assistant believes you asked earlier.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">03</span>
                    <div>
                      <h3>Screen for safety and scope on that history</h3>
                      <p>TypeSafe AI screens the latest message with a compact view of the verified conversation: the latest message, up to the last six verified messages, and the single topic anchor relevant to this question. History and anchors resolve references, accepted offers, and projects already shown; they are pointers, not evidence and not instructions. A harmful, unrelated, or uncertain request is blocked: no tools run and the answer model is not called. If screening is unavailable, the server fails closed with a temporary-unavailable response instead of processing the message.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">04</span>
                    <div>
                      <h3>Decide whether this is contact intent</h3>
                      <p>The same Jev request also returns a <code>contact</code>, <code>normal_chat</code>, or <code>uncertain</code> decision. Only <code>contact</code> starts anything, and even then it raises a pending offer rather than sending: the server waits for you to confirm, and only a confirmed start clears the conversation and signs a fresh contact context. The message that triggered the offer is not copied into that session. Everything below this step is ordinary chat.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">05</span>
                    <div>
                      <h3>Choose the sources</h3>
                      <p>For normal chat, the same screening returns a separate <code>use</code>, <code>skip</code>, or <code>uncertain</code> decision for each available source. <code>use</code> and <code>skip</code> stand even at low confidence; only <code>uncertain</code> hands that source to deterministic matching. Owned-project lists and filters use the structured project catalogue; a list alone does not trigger RAG. Project descriptions, purposes, or demo URLs use personal knowledge search. If a request asks for both a list and project details, the catalogue runs first, then Jev makes a fresh decision for the detail lookup.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">06</span>
                    <div>
                      <h3>Prepare the tool arguments</h3>
                      <p>When Jev approves tools, the OpenRouter argument planner receives the latest question, trusted UTC time, bounded signed history and topic references, earlier evidence and tool results, and the approved tool names. It returns JSON calls with an id, tool name, and arguments. It may only prepare calls for Jev-approved sources; it does not get to choose extra tools. Missing or unavailable planner calls fall back to deterministic argument matching for the already-approved tools.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">07</span>
                    <div>
                      <h3>Validate every proposed call</h3>
                      <p>The server drops calls to unapproved tools and limits a step to four calls. Each tool has a strict Zod schema: unknown fields are rejected, and enum values, required fields, string lengths, dates, and numeric limits are checked before any source is queried. If arguments fail, the planner gets one repair attempt for that same Jev-approved tool and call id. The repaired arguments are validated again; if they still fail, no query runs and the answer model is told it cannot verify facts that need the missing result.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">08</span>
                    <div>
                      <h3>Tool argument shapes and examples</h3>
                      <p>The planner returns one call per needed operation. Each call carries an id, an approved tool name, and only that tool’s arguments. These examples show the JSON shape; real dates and search text come from the user’s question and trusted current time.</p>
                      <div className="chat-pipeline-argument-grid">
                        <section className="chat-pipeline-argument">
                          <h4>Personal knowledge</h4>
                          <p><code>{'{ query }'}</code> — required focused query, 1–2,000 characters. RAG embeds it, searches Postgres/pgvector, and reranks matches. Jev checks each ranked passage for direct support; irrelevant or uncertain passages are discarded, and only accepted passages (up to three) reach the answer context.</p>
                          <pre><code>{'{"id":"1","name":"search_knowledge","arguments":{"query":"Nelson education"}}'}</code></pre>
                        </section>
                        <section className="chat-pipeline-argument">
                          <h4>Owned project catalogue</h4>
                          <p>Direct structured database query; no embedding or RAG. Optional filters include <code>query</code>, <code>languages</code>, <code>kinds</code> (web, mobile, desktop, API, CLI, library, and more), visibility, topics, created/updated dates, stars, forks, and WakaTime time. Results are capped at ten. Time filters accept <code>all_time</code>, <code>last_year</code>, <code>last_30_days</code>, <code>last_7_days</code>, or explicit dates.</p>
                          <pre><code>{'{"id":"1","name":"list_owned_projects","arguments":{"languages":["Python"],"kinds":["web_app"],"sort_by":"updated","sort_direction":"desc","limit":10}}'}</code></pre>
                        </section>
                        <section className="chat-pipeline-argument">
                          <h4>WakaTime public share</h4>
                          <p><code>{'{ category, range }'}</code> — category is <code>activity</code>, <code>languages</code>, <code>editors</code>, <code>operating_systems</code>, or <code>categories</code>. Range is <code>last_7_days</code>, <code>last_30_days</code>, <code>last_year</code>, or <code>all_time</code>; operating-system shares require <code>all_time</code>.</p>
                          <pre><code>{'{"id":"1","name":"coding_stats","arguments":{"category":"activity","range":"last_7_days"}}'}</code></pre>
                        </section>
                        <section className="chat-pipeline-argument">
                          <h4>WakaTime history database</h4>
                          <p><code>{'{ op, from, to, project? }'}</code> — both dates are required in <code>YYYY-MM-DD</code> form. Operations are <code>summary</code>, <code>by_project</code>, <code>by_language</code>, <code>project_time</code>, <code>daily</code>, or <code>streaks</code>. <code>project</code> is required for <code>project_time</code>.</p>
                          <pre><code>{'{"id":"1","name":"coding_history","arguments":{"op":"project_time","from":"YYYY-MM-DD","to":"YYYY-MM-DD","project":"project name"}}'}</code></pre>
                        </section>
                        <section className="chat-pipeline-argument">
                          <h4>Published Payload content</h4>
                          <p><code>{'{ op, slug?, limit?, page? }'}</code> — operation is <code>list_projects</code>, <code>get_project</code>, <code>list_posts</code>, or <code>get_post</code>. Get operations require a slug; post lists accept a limit of 1–20 and page of 1–100.</p>
                          <pre><code>{'{"id":"1","name":"site_content","arguments":{"op":"list_posts","limit":5,"page":1}}'}</code></pre>
                        </section>
                      </div>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">09</span>
                    <div>
                      <h3>Run and collect source results</h3>
                      <p>Calls run through the server-owned tool runner with timeouts and bounded, formatted outputs. The owned-project catalogue returns short filtered records directly from its structured table; it does not run through vector search. Raw database rows and unrestricted CMS records are not sent to the model. Successful knowledge evidence, catalogue results, and public citations are collected; empty, rejected, timed-out, or unavailable lookups are tracked so the assistant can avoid claiming it verified missing data.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">10</span>
                    <div>
                      <h3>Build the answer context from the whole conversation</h3>
                      <p>The configured OpenRouter answer model receives one system frame (base prompt, trusted UTC clock, accepted evidence, bounded tool output, scope and security policy), then the <strong>entire verified chat history</strong> in order, then your latest message. Nothing between the chat window and the model is summarised or dropped, so the answer can use earlier turns to resolve what “it”, “that project”, or “more” refers to. The full history still cannot replace fresh source evidence or prove that a category is complete.</p>
                    </div>
                  </li>
                  <li className="chat-pipeline-step">
                    <span className="chat-pipeline-number">11</span>
                    <div>
                      <h3>Stream the reply and re-sign the context</h3>
                      <p>The answer streams back to the chat, with source citations when available. When the turn completes, the server re-signs the conversation — prior messages, this question, the reply, updated topic anchors, and the owned-project list state — into a new context token and returns it with the reply. That token is what carries history into the next turn, and it is re-verified before the next screening decision.</p>
                    </div>
                  </li>
                </ol>
                <ChatContextStack />
                <section className="chat-pipeline-contact" aria-labelledby="chat-pipeline-contact-title">
                  <p className="eyebrow"><PixelIcon glyph="@" /> CONTACT / SEPARATE WORKFLOW</p>
                  <h3 id="chat-pipeline-contact-title">When you choose to contact Nelson</h3>
                  <p className="chat-pipeline-contact-intro">Jev screens contact intent in normal chat. Only your confirmation starts the separate, context-cleared contact session.</p>
                  <div className="chat-pipeline-contact-grid">
                    <article className="chat-pipeline-contact-card" data-tone="teal">
                      <p className="chat-pipeline-contact-kicker">START FRESH</p>
                      <h4>Confirm the contact session</h4>
                      <ul>
                        <li>Nothing changes until you confirm. Keeping the conversation restores the same chat.</li>
                        <li>Starting contact clears the earlier conversation. Those messages are not included in the request.</li>
                        <li>Jev screens Email, Bug report, or Feature request and locks your choice. Switching requires a confirmed discard and restart.</li>
                      </ul>
                    </article>
                    <article className="chat-pipeline-contact-card" data-tone="yellow">
                      <p className="chat-pipeline-contact-kicker">COMPLETE AND REVIEW</p>
                      <h4>Screen each request</h4>
                      <ul>
                        <li>Contact-specific Jev decisions screen every input. Server validation checks required fields, email syntax, and size limits. Unsafe, off-topic, uncertain, or incomplete input cannot advance.</li>
                        <li>Email is sent as written. Bug and feature reports get a meaning-preserving OpenRouter refinement without your name, reply address, or chat history. Review both versions and edit to screen again.</li>
                      </ul>
                    </article>
                    <article className="chat-pipeline-contact-card" data-tone="coral">
                      <p className="chat-pipeline-contact-kicker">SEND SAFELY</p>
                      <h4>Confirm the reviewed version</h4>
                      <ul>
                        <li>Send Email rechecks the separate contact Turnstile token and applies chat and contact rate limits. A one-time Postgres claim must succeed before SMTP; a missing table, failed claim, or duplicate keeps the review open and prevents sending.</li>
                        <li>Bug and feature emails use refined fields and attach the original report PDF. The Email template is sent as written without a PDF. A receipt goes to your reply address; receipt failure does not undo owner delivery.</li>
                        <li>After delivery, start a new blank chat to return to normal conversation.</li>
                      </ul>
                    </article>
                  </div>
                  <p className="chat-pipeline-contact-privacy" role="note">Contact text and form values stay out of application logs and Discord diagnostics. Diagnostics keep only request IDs, status and decision labels, and model metadata.</p>
                </section>
                <p className="chat-pipeline-footnote">The workflow uses TypeScript, React, TanStack Start, server-sent events, TypeSafe AI, Postgres/pgvector, SiliconFlow, Payload CMS, WakaTime, and OpenRouter. Enabled services and model settings can change.</p>
                {privacyNotice ? <p className="chat-pipeline-privacy" role="note">{privacyNotice}</p> : null}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor" scrollPreviousItemPeek={48}>
          <MessageScroller className="os-chat-scroller h-[460px] border-[3px] border-[var(--os-ink)] bg-[#20202b]">
            <MessageScrollerViewport aria-label="Conversation with the assistant" className="os-chat-viewport">
              <MessageScrollerContent aria-busy={pending} className="os-chat-content gap-6 p-6">
                {history.map((item, index) => {
                  const isUser = item.role === 'user'
                  return (
                    <MessageScrollerItem
                      key={`${item.role}-${index}`}
                      messageId={`chat-${index}-${item.role}`}
                      scrollAnchor={isUser}
                    >
                      <Message align={isUser ? 'end' : 'start'}>
                        <MessageAvatar className="overflow-visible rounded-none bg-transparent">
                          <Avatar className="size-8 rounded-none border-2 border-[var(--os-ink)] shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                            <AvatarFallback
                              className={
                                isUser
                                  ? 'rounded-none bg-[var(--os-yellow)] text-[10px] font-black text-[var(--os-ink)]'
                                  : 'rounded-none bg-[var(--os-teal)] text-[10px] font-black text-[var(--os-ink)]'
                              }
                            >
                              {isUser ? 'YOU' : 'SYS'}
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                        <MessageContent>
                          <MessageHeader
                            className={
                              isUser
                                ? 'px-0 text-[10px] font-black tracking-[0.12em] text-[var(--os-yellow)]'
                                : 'px-0 text-[10px] font-black tracking-[0.12em] text-[var(--os-teal)]'
                            }
                          >
                            {isUser ? 'YOU' : 'OPERATOR.SYS'} · {String(index + 1).padStart(2, '0')}
                          </MessageHeader>
                          <Bubble align={isUser ? 'end' : 'start'} variant={isUser ? 'default' : 'ghost'}>
                            <BubbleContent
                              className={
                                isUser
                                  ? 'rounded-none border-[3px] border-[var(--os-ink)] bg-[var(--os-yellow)] px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--os-ink)] shadow-[4px_4px_0_rgba(0,0,0,0.5)]'
                                  : 'rounded-none bg-transparent px-0 py-0 font-mono text-[13px] leading-relaxed text-[var(--os-paper)]'
                              }
                            >
                              {isUser ? item.content : <ChatMessageText text={item.content} />}
                            </BubbleContent>
                          </Bubble>
                          {item.role === 'assistant' && (item.knowledgeUnavailable || item.citations) ? (
                            <MessageFooter className="flex-col items-start gap-1 px-0">
                              {item.knowledgeUnavailable ? (
                                <p className="text-[9px] font-black tracking-[0.1em] text-[var(--os-yellow)]">
                                  PERSONAL KNOWLEDGE IS TEMPORARILY UNAVAILABLE.
                                </p>
                              ) : null}
                              {item.citations ? <ChatCitations citations={item.citations} /> : null}
                            </MessageFooter>
                          ) : null}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )
                })}
                {pending ? (
                  <MessageScrollerItem messageId="chat-pending">
                    <Message align="start">
                      <MessageAvatar className="overflow-visible rounded-none bg-transparent">
                        <Avatar className="size-8 rounded-none border-2 border-[var(--os-ink)] shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                          <AvatarFallback className="rounded-none bg-[var(--os-teal)] text-[10px] font-black text-[var(--os-ink)]">
                            SYS
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        {toolStatus ? (
                          <Marker role="status" className="text-[var(--os-teal)]">
                            <MarkerIcon>
                              <Spinner className="size-4 text-[var(--os-yellow)]" />
                            </MarkerIcon>
                            <MarkerContent className="font-mono text-[12px] font-bold tracking-wide">
                              {toolStatus}
                            </MarkerContent>
                          </Marker>
                        ) : (
                          <Marker role="status" className="text-[var(--os-teal)]">
                            <MarkerIcon>
                              <Spinner className="size-4 text-[var(--os-yellow)]" />
                            </MarkerIcon>
                            <MarkerContent className="font-mono text-[12px] font-bold tracking-wide">
                              thinking<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                            </MarkerContent>
                          </Marker>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton className="rounded-none border-[3px] border-[var(--os-ink)] bg-[var(--os-yellow)] text-[var(--os-ink)] shadow-[3px_3px_0_var(--os-ink)] hover:bg-[var(--os-coral)]" />
          </MessageScroller>
        </MessageScrollerProvider>

        {contactPanel}
        {error ? <div className="os-chat-error-slot"><p className="form-error" role="alert">{error}</p></div> : null}
        {!contactState ? (
          <>
            <div className="os-chat-turn-meta" aria-live="polite">
              <span>TURN {String(completedTurns).padStart(2, '0')} / {MAX_CHAT_TURNS}</span>
              {turnLimitReached ? (
                <button className="pixel-button primary os-chat-new-button" onClick={() => resetConversation(WELCOME_MESSAGE)} type="button">
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
                  className="!px-4 font-mono text-[14px] text-[var(--os-ink)] placeholder:text-[var(--os-ink-soft)]/70"
                />
              </InputGroup>
              <button className="pixel-button primary shrink-0" disabled={pending || turnLimitReached || !message.trim() || !siteKey || !chatTurnstileToken} type="submit">SEND ↵</button>
            </form>
            {!turnLimitReached ? (
              <div className="turnstile-field os-chat-chat-turnstile" role="group" aria-labelledby="chat-turnstile-label">
                <span className="turnstile-label sr-only" id="chat-turnstile-label">Security check for chat messages</span>
                {siteKey ? <TurnstileChallenge action="chat_message" siteKey={siteKey} resetCount={chatTurnstileResetCount} onToken={setChatTurnstileToken} />
                  : <p className="turnstile-unavailable" role="status">The security check is not configured yet.</p>}
              </div>
            ) : null}
            {turnLimitReached ? <p className="os-chat-limit-note" role="status">{CHAT_TURN_LIMIT_MESSAGE}</p> : null}
          </>
        ) : null}
        <div className="os-chat-notices">
          <p className="form-note">AI can make mistakes or hallucinate. Verify important information with reliable sources.</p>
        </div>
      </WindowFrame>
    </div>
  )
}

interface ChatContactFormCardProps {
  template: ChatContactTemplate
  initialValues: ChatContactFieldValues
  serverErrors: { missingFields: ChatContactField[]; invalidFields: ChatContactField[] }
  pending: boolean
  canSubmit: boolean
  onFieldChange: (field: ChatContactField) => void
  onSubmit: (fields: ChatContactFieldValues) => void
}

function ChatContactFormCard({
  template,
  initialValues,
  serverErrors,
  pending,
  canSubmit,
  onFieldChange,
  onSubmit,
}: ChatContactFormCardProps) {
  const configuration = CHAT_CONTACT_TEMPLATES[template]
  const schema = useMemo(() => createChatContactDraftSchema(template), [template])
  const fieldSchemas = useMemo(() => Object.fromEntries(configuration.fields.map((field) => [
    field.key,
    createChatContactFieldSchema(template, field.key),
  ])) as Partial<Record<ChatContactField, ReturnType<typeof createChatContactFieldSchema>>>, [configuration.fields, template])
  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      className="os-chat-contact-card os-chat-contact-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <p className="form-note">Fill in the required fields. Examples show the kind of detail that helps Nelson understand your request.</p>
      <form.Subscribe selector={(state) => !state.isValid}>
        {(schemaInvalid) => schemaInvalid || serverErrors.missingFields.length > 0 || serverErrors.invalidFields.length > 0
          ? <p className="form-error" role="alert">Some fields need your attention. Correct the highlighted fields and submit again.</p>
          : null}
      </form.Subscribe>
      <div className="os-chat-contact-fields">
        {configuration.fields.map((field) => {
          const fieldId = `chat-contact-${field.key}`
          const serverError = serverErrors.missingFields.includes(field.key)
            ? 'This field is required.'
            : serverErrors.invalidFields.includes(field.key)
              ? field.key === 'email' ? 'Enter a valid email address.' : `Keep this field under ${field.maxLength} characters.`
              : undefined
          const exampleId = `${fieldId}-example`
          const errorId = `${fieldId}-error`

          return (
            <form.Field
              key={field.key}
              name={field.key}
              validators={{ onChange: fieldSchemas[field.key] }}
            >
              {(fieldApi) => {
                const localError = getChatContactFormError(fieldApi.state.meta.errors)
                const errorText = serverError ?? localError
                const describedBy = [exampleId, errorText ? errorId : undefined].filter(Boolean).join(' ')
                const value = fieldApi.state.value ?? ''
                const common = {
                  id: fieldId,
                  'aria-describedby': describedBy,
                  'aria-invalid': Boolean(errorText),
                  disabled: pending,
                  maxLength: field.maxLength,
                  onBlur: fieldApi.handleBlur,
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    fieldApi.handleChange(event.target.value)
                    onFieldChange(field.key)
                  },
                  required: field.required,
                  value,
                }

                return (
                  <div className="os-chat-contact-field">
                    <label htmlFor={fieldId}>
                      <span>{field.label}{field.required ? ' *' : ''}</span>
                      {'multiline' in field && field.multiline ? (
                        <textarea
                          {...common}
                          rows={field.key === 'stepsToReproduce' || field.key === 'message' ? 5 : 4}
                        />
                      ) : (
                        <input
                          {...common}
                          type={field.key === 'email' ? 'email' : 'text'}
                        />
                      )}
                    </label>
                    <p className="os-chat-contact-example" id={exampleId}>Example: {field.example}</p>
                    {errorText ? <p className="form-error" id={errorId} role="alert">{errorText}</p> : null}
                  </div>
                )
              }}
            </form.Field>
          )
        })}
      </div>
      {'notice' in configuration ? (
        <div className="os-chat-contact-notice" role="note">
          <p>{configuration.notice}</p>
          {template === 'bug_report' ? <p>Suspected security issues should be reported privately through the <a href="/contact">contact page</a>.</p> : null}
        </div>
      ) : null}
      <div className="os-chat-contact-actions">
        <button className="pixel-button primary" disabled={pending || !canSubmit} type="submit">SCREEN AND REVIEW →</button>
      </div>
    </form>
  )
}

function getChatContactFormError(errors: unknown): string | undefined {
  const candidates = Array.isArray(errors) ? errors : [errors]
  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate
    if (typeof candidate === 'object' && candidate !== null && 'message' in candidate) {
      const message = (candidate as { message?: unknown }).message
      if (typeof message === 'string') return message
    }
  }
  return undefined
}
