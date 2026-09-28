import { cn } from 'cn'
import { ChatComposer } from '@/components/site/chat/chat-composer'
import { ChatContactPanel } from '@/components/site/chat/chat-contact-panel'
import { ChatHelpDialog } from '@/components/site/chat/chat-help-dialog'
import { ChatTranscript } from '@/components/site/chat/chat-transcript'
import { useChatSession } from '@/components/site/chat/use-chat-session'
import { CountBadge, formErrorClass, PageHeading, PageStack } from '@/components/site/os-ui'
import { useSiteHealthStatus } from '@/components/site/site-health-provider'
import { WindowFrame } from '@/components/site/window-frame'
import { getChatPrivacyNotice } from '@/lib/chat-privacy-notice'
import { siteHealthLabel } from '@/lib/site-health'

interface ChatPageProps {
  siteKey?: string | null
}

export function ChatPage({ siteKey }: ChatPageProps) {
  const healthStatus = useSiteHealthStatus()
  const session = useChatSession()
  const privacyNotice = getChatPrivacyNotice(session.contact.state?.phase ?? 'normal')

  return (
    <PageStack>
      <WindowFrame title="assistant.shell" icon=">" className="chat-window">
        <PageHeading
          icon=">"
          eyebrow="CHAT / LIVE"
          title="Ask the operator’s assistant."
          badge={(
            <div className="chat-heading-tools mt-4 flex flex-wrap items-center gap-2.5">
              <CountBadge data-health={healthStatus} role="status" aria-live="polite">
                <span aria-hidden="true" className="size-2 rounded-full bg-foreground group-data-[health=checking]:bg-warning group-data-[health=offline]:bg-error" />
                {siteHealthLabel(healthStatus)}
              </CountBadge>
              <ChatHelpDialog privacyNotice={privacyNotice} />
            </div>
          )}
        />

        <ChatTranscript
          messages={session.conversation.history}
          pending={session.status.pending}
          toolStatus={session.status.toolStatus}
        />
        <ChatContactPanel workflow={session.contact} pending={session.status.pending} siteKey={siteKey} />
        {session.status.error ? <div className="os-chat-error-slot mt-4"><p className={cn(formErrorClass)} role="alert">{session.status.error}</p></div> : null}
        {!session.contact.state ? (
          <ChatComposer conversation={session.conversation} pending={session.status.pending} siteKey={siteKey} />
        ) : null}
        <div className="os-chat-notices">
          <p className="form-note">AI can make mistakes or hallucinate. Verify important information with reliable sources.</p>
        </div>
      </WindowFrame>
    </PageStack>
  )
}
