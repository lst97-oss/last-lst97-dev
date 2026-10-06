import { createFileRoute, Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { AtSign, Briefcase, MessageCircle, Users } from 'lucide-react'
import { ContactMessageForm } from '@/components/site/contact/contact-message-form'
import { Eyebrow, PageHeading, PageStack, pixelButtonVariants } from '@/components/site/os-ui'
import { WindowFrame } from '@/components/site/window-frame'
import { createPageMeta } from '@/lib/seo/site-seo'
import { getTurnstileSiteKeyServerFn } from '@/server/contact/server-functions'

const CONTACT_SOCIALS = [
  // Closest project tones to the brand fills: LinkedIn deep blue → info,
  // Facebook bright blue → os-violet, Threads black → os-ink. The label color
  // rides as an inline style because `text-foreground` from the base button
  // and the token `text-*` sit at equal specificity — stylesheet order, not
  // class order, would decide the winner.
  {
    label: 'LINKEDIN',
    href: 'https://www.linkedin.com/in/lst97',
    Icon: Briefcase,
    className: '',
    style: { color: '#ffffff', backgroundColor: '#0a66c2' } as const,
  },
  {
    label: 'THREADS',
    href: 'https://www.threads.com/@lst97_',
    Icon: AtSign,
    className: 'bg-os-ink',
    style: { color: 'var(--os-cream)' } as const,
  },
  {
    label: 'FACEBOOK',
    href: 'https://www.facebook.com/lst097',
    Icon: Users,
    className: 'bg-os-violet',
    style: { color: 'var(--os-ink)' } as const,
  },
  {
    label: 'DISCORD',
    href: 'https://discord.gg/Ju5GVGEccv',
    Icon: MessageCircle,
    className: 'bg-info',
    style: { color: 'var(--info-foreground)' } as const,
  },
] as const
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
            <Link className={cn(pixelButtonVariants(), 'mt-1 no-underline')} to="/chat">
              START A CHAT <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
        <nav aria-label="Social profiles" className="contact-socials mt-6 flex flex-wrap gap-3">
          {CONTACT_SOCIALS.map(({ label, href, Icon, className, style }) => (
            <a
              className={cn(pixelButtonVariants(), 'no-underline', className)}
              href={href}
              key={label}
              rel="me noopener noreferrer"
              style={style}
              target="_blank"
            >
              <Icon aria-hidden="true" className="size-3.5 self-center" strokeWidth={2.5} />
              {label}
            </a>
          ))}
        </nav>
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
      </WindowFrame>
    </PageStack>
  )
}
