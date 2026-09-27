import { getChatPrivacyNotice } from '../../../lib/chat-privacy-notice'
import { siteHealthLabel } from '../../../lib/site-health'
import { PixelIcon } from '../pixel-icon'
import { useSiteHealthStatus } from '../site-health-provider'
import { WindowFrame } from '../window-frame'
import { ChatComposer } from './chat-composer'
import { ChatContactPanel } from './chat-contact-panel'
import { ChatHelpDialog } from './chat-help-dialog'
import { ChatTranscript } from './chat-transcript'
import { useChatSession } from './use-chat-session'

interface ChatPageProps {
  siteKey?: string | null
}

export function ChatPage({ siteKey }: ChatPageProps) {
  const healthStatus = useSiteHealthStatus()
  const session = useChatSession()
  const privacyNotice = getChatPrivacyNotice(session.contact.state?.phase ?? 'normal')

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
            <ChatHelpDialog privacyNotice={privacyNotice} />
          </div>
        </div>

        <ChatTranscript
          messages={session.conversation.history}
          pending={session.status.pending}
          toolStatus={session.status.toolStatus}
        />
        <ChatContactPanel workflow={session.contact} pending={session.status.pending} siteKey={siteKey} />
        {session.status.error ? <div className="os-chat-error-slot"><p className="form-error" role="alert">{session.status.error}</p></div> : null}
        {!session.contact.state ? (
          <ChatComposer conversation={session.conversation} pending={session.status.pending} siteKey={siteKey} />
        ) : null}
        <div className="os-chat-notices">
          <p className="form-note">AI can make mistakes or hallucinate. Verify important information with reliable sources.</p>
        </div>
      </WindowFrame>
    </div>
  )
}
