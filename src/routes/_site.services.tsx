import { createFileRoute, Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Bug, ClipboardCheck, Database, Globe, PanelsTopLeft, PlugZap, Rocket } from 'lucide-react'
import { Eyebrow, PageHeading, PageStack, pixelButtonVariants, Tag, TagRow } from '@/components/site/os-ui'
import { PixelGridGradient } from '@/components/site/pixel-grid-gradient'
import { PixelIcon } from '@/components/site/pixel-icon'
import { ServiceAddOnTable } from '@/components/site/services/addons'
import { ServiceInfoPanel } from '@/components/site/services/info-panel'
import { ServicePackageCard } from '@/components/site/services/package-card'
import { ServiceProcessSteps } from '@/components/site/services/process-steps'
import { WindowFrame } from '@/components/site/window-frame'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createServicesStructuredData } from '@/lib/content/structured-data'
import { createPageMeta } from '@/lib/seo/site-seo'
import {
  SERVICE_LOCATION_NOTE,
  SERVICE_OVERVIEW,
  SERVICE_PACKAGES,
  SERVICE_PRICING_NOTE,
  SERVICE_QUOTE_CTA_BUTTON,
  SERVICE_QUOTE_CTA_NOTE,
  SERVICE_QUOTE_CTA_TAB_HINT,
  SERVICE_QUOTE_HEADING,
  SERVICE_SECTION_HEADING,
  SERVICE_SUPPORT_CONSULTATION_NOTE,
  SERVICE_SUPPORT_CONSULTATION_PLANS,
  SERVICE_SUPPORT_CONSULTATION_RATE,
  SERVICE_SUPPORT_CUSTOM_PLANS,
  SERVICE_SUPPORT_OVERVIEW,
  SERVICE_SUPPORT_PRICING_NOTE,
  SERVICE_SUPPORT_PROCESS,
  SERVICE_SUPPORT_SCOPE_NOTE,
  SERVICE_SUPPORT_SECTION_HEADING,
  SERVICE_SUPPORT_STANDARD_PLANS,
  SERVICE_SUPPORT_STANDARD_PRICE,
  SERVICE_SUPPORT_STANDARD_SUMMARY,
  SERVICE_TECHNOLOGIES,
  SERVICE_TECHNOLOGY_NOTE,
  SERVICE_TERMS,
} from '@/lib/services/packages'

const SERVICES_WINDOW_ID = 'website-services.exe'

const SUPPORT_PLAN_ICONS: Record<string, LucideIcon> = {
  'production-readiness-review': ClipboardCheck,
  'deployment-support': Rocket,
  'bug-fixes': Bug,
  'domain-dns-hosting': Globe,
  'small-features': PanelsTopLeft,
  'cms-api-integration': PlugZap,
  'database-backend': Database,
}

export const Route = createFileRoute('/_site/services')({
  head: () =>
    createPageMeta({
      // The public path, not the /_site route id: `canonicalUrl` builds the
      // canonical and og:url from this value.
      pathname: '/services',
      title: 'Website Services',
      description:
        'Professional website design and development for small businesses: packages from A$1,000, a clear seven-stage process, and fixed-price quotations.',
      structuredData: createServicesStructuredData(),
    }),
  component: ServicesPage,
})

function ServicesPage() {
  return (
    <PageStack>
      <WindowFrame
        title={SERVICES_WINDOW_ID}
        icon="▦"
        className="services-window"
        windowId={SERVICES_WINDOW_ID}
        scrollable
      >
        <img
          alt="Pixel-art illustration of a ship carrying website panels over ocean waves."
          className="mb-7 block h-auto w-full"
          decoding="async"
          fetchPriority="high"
          height="575"
          loading="eager"
          src="/assets/services/web-that-ship.webp"
          width="1150"
        />

        <PageHeading
          icon="▦"
          eyebrow="SERVICES / WEBSITE BUILD"
          title="Websites that ship."
          lead="Responsive, maintainable, fast, and easy to manage — designed and developed for small businesses, independent professionals, and growing brands."
        />

        {/*
         * Rendered unconditionally. Gating any of this on the window mode is the
         * documented thin-content defect on this site (see the same guard in
         * _site.about.tsx and _site.contact.tsx): the copy would then reach crawlers
         * only as empty markup.
         */}
        <section className="services-overview">
          <Eyebrow className="px-2 py-1">OVERVIEW</Eyebrow>
          <p className="lead-copy mb-3">{SERVICE_OVERVIEW}</p>
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">{SERVICE_PRICING_NOTE}</p>
          <p className="m-0 mt-3 border-3 border-border bg-info-muted p-4 leading-relaxed shadow-os-sm">
            <Globe aria-hidden className="mr-2 inline-block size-4 align-[-2px]" />
            {SERVICE_LOCATION_NOTE}
          </p>
        </section>

        {/*
         * Two panels, one per kind of offering: a build package answers "how
         * much for a new website", an hourly support engagement answers "my
         * site will not deploy". Interleaving them made the page longer than
         * either audience needed.
         *
         * Both panels stay mounted (`keepMounted`) and are hidden with CSS. Base UI
         * unmounts an inactive panel by default, which would leave the support
         * copy out of the server HTML — the exact thin-content defect the
         * unconditional render above exists to prevent.
         */}
        <Tabs className="mt-8" defaultValue="packages">
          {/* `activateOnFocus` restores Radix's automatic activation, where
              arrowing onto a tab selected it. Base UI defaults to manual
              activation, so without this the arrow keys only move focus. */}
          <TabsList className="services-tabs-list" variant="line" activateOnFocus>
            <TabsTrigger className="services-tab" value="packages">
              WEBSITE PACKAGES
            </TabsTrigger>
            <TabsTrigger className="services-tab" value="support">
              SUPPORT PLAN
            </TabsTrigger>
          </TabsList>

          <TabsContent className="services-tab-panel mt-8" keepMounted value="packages">
            <section className="mt-8">
              <Eyebrow className="px-2 py-1">PACKAGES</Eyebrow>
              <h2>{SERVICE_SECTION_HEADING}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Website packages">
                {SERVICE_PACKAGES.map((pkg) => (
                  <ServicePackageCard key={pkg.slug} pkg={pkg} />
                ))}
              </div>
              <div className="mt-4 flex flex-col items-start justify-between gap-4 border-3 border-border bg-info-muted p-5 shadow-os-sm sm:flex-row sm:items-center">
                <p className="m-0 max-w-2xl leading-relaxed">
                  Have a project in mind? Share the basics and I’ll prepare a fixed-price scope before development
                  begins.
                </p>
                <Link className={pixelButtonVariants({ tone: 'coral' })} to="/contact">
                  REQUEST A QUOTE <span>→</span>
                </Link>
              </div>
            </section>

            <section className="mt-8">
              <Eyebrow className="px-2 py-1">OPTIONAL ADD-ONS</Eyebrow>
              <h2>Add to any package.</h2>
              <p className="mb-4 leading-relaxed text-muted-foreground">
                Additional functionality can be added to any suitable package.
              </p>
              <ServiceAddOnTable />
            </section>

            <section className="mt-8">
              <img
                alt="Pixel-art illustration of a website moving from project planning through design to launch across devices."
                className="mx-auto mb-5 block h-auto w-full max-w-2xl"
                decoding="async"
                height="767"
                loading="lazy"
                src="/assets/services/workflow.webp"
                width="1150"
              />
              <Eyebrow className="px-2 py-1">PROCESS</Eyebrow>
              <h2>How the work runs.</h2>
              <ServiceProcessSteps />
            </section>

            <section className="mt-8">
              <Eyebrow className="px-2 py-1">TECHNOLOGY</Eyebrow>
              <h2>Selected per project.</h2>
              <TagRow className="mb-4">
                {SERVICE_TECHNOLOGIES.map((technology) => (
                  <Tag key={technology}>{technology}</Tag>
                ))}
              </TagRow>
              <p className="m-0 leading-relaxed text-muted-foreground">{SERVICE_TECHNOLOGY_NOTE}</p>
            </section>

            <section className="mt-8">
              <Eyebrow className="px-2 py-1">TERMS &amp; SUPPORT</Eyebrow>
              <h2>The details, up front.</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {SERVICE_TERMS.map((section) => (
                  <ServiceInfoPanel key={section.id} section={section} />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent className="services-tab-panel mt-8" keepMounted value="support">
            <section className="mt-8">
              <Eyebrow className="px-2 py-1">TECHNICAL SUPPORT</Eyebrow>
              <h2>{SERVICE_SUPPORT_SECTION_HEADING}</h2>
              <p className="mb-4 leading-relaxed text-muted-foreground">{SERVICE_SUPPORT_OVERVIEW}</p>
              <div className="flex flex-col gap-4" aria-label="Technical support pricing">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
                  <section className="border-3 border-border bg-card p-5 shadow-os-sm">
                    <Eyebrow className="mb-2">STANDALONE OR FIRST STEP</Eyebrow>
                    <h3 className="m-0 text-3xl leading-tight tracking-tight text-os-ink">
                      From{' '}
                      <span className="inline-flex items-center gap-1.5 border-2 border-border bg-secondary px-3 py-2 text-3xl leading-tight tracking-tight font-black whitespace-nowrap text-os-ink">
                        {SERVICE_SUPPORT_CONSULTATION_RATE}
                      </span>{' '}
                      / hour
                    </h3>
                    <p className="m-0 mt-3 text-lg font-black">Technical Consultation</p>
                    <p className="m-0 mt-2 text-sm leading-relaxed text-muted-foreground">
                      {SERVICE_SUPPORT_CONSULTATION_NOTE}
                    </p>
                    <details className="mt-4 border-t-2 border-border pt-3">
                      <summary className="cursor-pointer text-xs font-black tracking-widest text-accent">
                        WHAT A CONSULTATION CAN COVER
                      </summary>
                      <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm leading-relaxed">
                        {(SERVICE_SUPPORT_CONSULTATION_PLANS[0]?.items ?? []).map((item) => (
                          <li key={item}>
                            <PixelIcon glyph="◆" className="mr-2 text-foreground" /> {item}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </section>

                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center justify-self-center self-center text-3xl font-black text-accent"
                  >
                    +
                  </span>

                  <section className="border-3 border-border bg-card p-5 shadow-os-sm">
                    <Eyebrow className="mb-2">OPTIONAL IMPLEMENTATION</Eyebrow>
                    <h3 className="m-0 text-3xl leading-tight tracking-tight text-os-ink">
                      From{' '}
                      <span className="inline-flex items-center gap-1.5 border-2 border-border bg-secondary px-3 py-2 text-3xl leading-tight tracking-tight font-black whitespace-nowrap text-os-ink">
                        {SERVICE_SUPPORT_STANDARD_PRICE}
                      </span>
                    </h3>
                    <p className="mt-3 mb-4 text-sm leading-relaxed">{SERVICE_SUPPORT_STANDARD_SUMMARY}</p>
                    <a className="text-xs font-black tracking-wider text-accent" href="#support-inclusions">
                      SEE WHAT MAY BE INCLUDED <span aria-hidden="true">↓</span>
                    </a>
                  </section>
                </div>

                <section className="border-3 border-border bg-warning-muted p-5 shadow-os-sm">
                  <Eyebrow className="mb-2">MAJOR CHANGES</Eyebrow>
                  <h3 className="m-0 border-b-2 border-border pb-2 text-2xl leading-tight tracking-tight">
                    Custom Quote
                  </h3>
                  {SERVICE_SUPPORT_CUSTOM_PLANS.map((engagement) => (
                    <div key={engagement.slug}>
                      <p className="mt-3 mb-2 text-sm leading-relaxed">{engagement.bestFor}</p>
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm leading-relaxed sm:grid sm:grid-cols-2 sm:gap-x-5">
                        {engagement.items.map((item) => (
                          <li key={item}>
                            <PixelIcon glyph="◆" className="mr-2 text-foreground" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="mt-4">
                    <Link className={pixelButtonVariants({ tone: 'coral' })} to="/chat">
                      SCOPE A MIGRATION <span>→</span>
                    </Link>
                  </div>
                </section>
              </div>

              <section className="mt-8" id="support-inclusions">
                <img
                  alt="Pixel-art illustration of website support, with deployment, repair, security, and backend tools."
                  className="mx-auto mb-5 block h-auto w-full max-w-2xl"
                  decoding="async"
                  height="767"
                  loading="lazy"
                  src="/assets/services/standard-engagement.webp"
                  width="1150"
                />
                <Eyebrow className="px-2 py-1">A$100 STANDARD ENGAGEMENT</Eyebrow>
                <h3 className="mt-2 mb-4 text-2xl leading-tight">What the A$100 may include.</h3>
                <div className="grid gap-x-8 gap-y-6 md:grid-cols-2" aria-label="A$100 support inclusions">
                  {SERVICE_SUPPORT_STANDARD_PLANS.map((engagement) => {
                    const Icon = SUPPORT_PLAN_ICONS[engagement.slug]

                    return (
                      <div key={engagement.slug}>
                        <h4 className="m-0 mb-2 flex items-center gap-2 text-base font-black">
                          <Icon aria-hidden="true" className="size-5 shrink-0 text-accent" />
                          {engagement.name}
                        </h4>
                        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm leading-relaxed">
                          {engagement.items.map((item) => (
                            <li key={item}>
                              <PixelIcon glyph="◆" className="mr-2 text-foreground" /> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
              <p className="mb-0 mt-4 text-xs leading-relaxed text-muted-foreground">{SERVICE_SUPPORT_PRICING_NOTE}</p>
              <div className="mt-4 border-3 border-border bg-warning-muted p-5 shadow-os-sm">
                <h3 className="mt-0 text-sm">Scope</h3>
                <p className="mb-0 text-sm leading-relaxed">{SERVICE_SUPPORT_SCOPE_NOTE}</p>
              </div>
            </section>

            <section className="mt-8">
              <Eyebrow className="px-2 py-1">HOW SUPPORT WORKS</Eyebrow>
              <h2>Consultation to handover.</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {SERVICE_SUPPORT_PROCESS.map((step) => (
                  <ServiceInfoPanel key={step.id} section={step} />
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="mt-8">
          <PixelGridGradient className="border-3 border-border bg-card p-5 shadow-os-sm">
            <Eyebrow className="px-2 py-1">REQUEST A QUOTE</Eyebrow>
            <h2>{SERVICE_QUOTE_HEADING}</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">{SERVICE_QUOTE_CTA_NOTE}</p>
            <Link className={pixelButtonVariants({ tone: 'coral' })} to="/chat">
              {SERVICE_QUOTE_CTA_BUTTON} <span>→</span>
            </Link>
            <p className="mb-0 mt-3 text-xs leading-relaxed text-muted-foreground">{SERVICE_QUOTE_CTA_TAB_HINT}</p>
            <div className="mt-4 flex flex-wrap gap-5">
              <Link className="text-xs font-black tracking-wider text-accent" to="/projects">
                SEE PAST WORK <span>→</span>
              </Link>
              <Link className="text-xs font-black tracking-wider text-accent" to="/chat">
                ASK A QUESTION FIRST <span>→</span>
              </Link>
            </div>
          </PixelGridGradient>
        </section>
      </WindowFrame>
    </PageStack>
  )
}
