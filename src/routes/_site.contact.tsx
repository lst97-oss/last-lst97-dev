import { createFileRoute, Link } from '@tanstack/react-router'

import { ContactMessageForm } from '@/components/site/contact/contact-message-form'
import { Eyebrow, PageHeading, PageStack } from '@/components/site/os-ui'
import { WindowFrame } from '@/components/site/window-frame'
import { createPageMeta } from '@/lib/seo/site-seo'
import { getTurnstileSiteKeyServerFn } from '@/server/contact/server-functions'

const CONTACT_WINDOW_ID = 'send-message.exe'

export const Route = createFileRoute('/_site/contact')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () =>
    createPageMeta({
      pathname: '/contact',
      title: 'Contact',
      description:
        'Send a message to Nelson about a project, question, collaboration, or open-source idea. Messages go straight to the inbox.',
    }),
  component: ContactPage,
})

function ContactPage() {
  const siteKey = Route.useLoaderData()

  return (
    <PageStack>
      <WindowFrame
        title={CONTACT_WINDOW_ID}
        icon="@"
        className="contact-window"
        windowId={CONTACT_WINDOW_ID}
        scrollable
      >
        <PageHeading
          icon="@"
          eyebrow="CONTACT / OUTBOUND"
          title="Open a channel."
          lead="Have a project, question, or good link? Send it over."
        />
        {/*
         * Always visible, so the recommendation to ask Zita first is read
         * before the visitor starts typing.
         */}
        <div className="contact-assistant-notice mt-2">
          <section className="border-2 border-border bg-info-muted p-5 shadow-os-sm">
            <Eyebrow>ASK THE ASSISTANT FIRST</Eyebrow>
            <h2 className="mb-3 text-3xl leading-tight">Ask before you write.</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              For questions about the work, background, projects, packages, pricing, or process, Zita answers instantly
              from verified site content, and starting there often saves a round trip.
            </p>
            <Link className="mt-1 inline-flex text-xs font-black tracking-wider text-accent" to="/chat">
              START A CHAT <span>→</span>
            </Link>
          </section>
        </div>
        <ContactMessageForm siteKey={siteKey} />
        {/*
         * Rendered unconditionally so crawlers read this copy from the server
         * HTML — gating it on `isMaximized` made the page's only substantive
         * text client-only, which OpenSEO's crawl reported as thin content.
         * `.contact-window.is-maximized` controls visibility in CSS.
         */}
        <div
          className="contact-expanded mt-8 grid gap-4 border-t-2 border-dashed border-border pt-7 sm:grid-cols-2"
          id="contact-expanded-info"
        >
          <section className="border-2 border-border bg-success-muted p-5 shadow-os-sm">
            <Eyebrow>WHAT HAPPENS NEXT</Eyebrow>
            <h2 className="mb-3 text-3xl leading-tight">Straight to the inbox.</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Your message is delivered directly to the operator, along with a security verification. Replies go to the
              email address you provide, so double-check it before transmitting.
            </p>
          </section>
          <section className="border-2 border-border bg-warning-muted p-5 shadow-os-sm">
            <Eyebrow>GOOD FIRST MESSAGES</Eyebrow>
            <h2 className="mb-3 text-3xl leading-tight">Context gets answers.</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Project inquiries land best with a link and a timeline. Bug reports help most with steps to reproduce.
              Open-source ideas are welcome any time. Requesting a website price? Start a chat and Jev can open a
              structured quotation request that collects the details a fixed price needs.
            </p>
          </section>
        </div>
        <p className="contact-expand-hint m-0 mt-6 text-xs leading-relaxed font-black tracking-widest text-muted-foreground">
          MAXIMIZE THIS WINDOW FOR SENDING TIPS &amp; ALTERNATIVES
        </p>
      </WindowFrame>
    </PageStack>
  )
}
