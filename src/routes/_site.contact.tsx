import { createFileRoute, Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

import { ContactMessageForm } from '@/components/site/contact/contact-message-form'
import { Eyebrow, PageHeading, PageStack } from '@/components/site/os-ui'
import { WindowFrame } from '@/components/site/window-frame'
import { osStore } from '@/lib/os-store'
import { getTurnstileSiteKeyServerFn } from '@/server/contact/server-functions'

const CONTACT_WINDOW_ID = 'send-message.exe'

export const Route = createFileRoute('/_site/contact')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () => ({ meta: [{ title: 'Contact — LAST//OS' }, { name: 'description', content: 'Send a message to the operator.' }] }),
  component: ContactPage,
})

function ContactPage() {
  const siteKey = Route.useLoaderData()
  const windowMode = useStore(osStore, (state) => state.windowModes[CONTACT_WINDOW_ID] ?? 'normal')
  const isMaximized = windowMode === 'maximized'

  return (
    <PageStack>
      <WindowFrame title={CONTACT_WINDOW_ID} icon="@" className="contact-window" windowId={CONTACT_WINDOW_ID}>
        <PageHeading
          icon="@"
          eyebrow="CONTACT / OUTBOUND"
          title="Open a channel."
          lead="Have a project, question, or good link? Send it over."
        />
        <ContactMessageForm siteKey={siteKey} />
        {isMaximized ? (
          <div className="contact-expanded mt-8 grid gap-4 border-t-2 border-dashed border-border pt-7 sm:grid-cols-2" id="contact-expanded-info">
            <section className="border-2 border-border bg-success-muted p-5 shadow-os-sm">
              <Eyebrow>WHAT HAPPENS NEXT</Eyebrow>
              <h2 className="mb-3 text-3xl leading-tight">Straight to the inbox.</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">Your message is delivered directly to the operator, along with a security verification. Replies go to the email address you provide, so double-check it before transmitting.</p>
            </section>
            <section className="border-2 border-border bg-warning-muted p-5 shadow-os-sm">
              <Eyebrow>GOOD FIRST MESSAGES</Eyebrow>
              <h2 className="mb-3 text-3xl leading-tight">Context gets answers.</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">Project inquiries land best with a link and a timeline. Bug reports help most with steps to reproduce. Open-source ideas are welcome any time.</p>
            </section>
            <section className="border-2 border-border bg-info-muted p-5 shadow-os-sm sm:col-span-2">
              <Eyebrow>IN A HURRY?</Eyebrow>
              <h2 className="mb-3 text-3xl leading-tight">Try the assistant first.</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">For quick questions about the work, background, or projects, the on-site assistant answers instantly from verified site content.</p>
              <Link className="mt-1 inline-flex text-xs font-black tracking-wider text-accent" to="/chat">START A CHAT <span>→</span></Link>
            </section>
          </div>
        ) : (
          <p className="m-0 mt-6 text-xs leading-relaxed font-black tracking-widest text-muted-foreground">MAXIMIZE THIS WINDOW FOR SENDING TIPS &amp; ALTERNATIVES</p>
        )}
      </WindowFrame>
    </PageStack>
  )
}
