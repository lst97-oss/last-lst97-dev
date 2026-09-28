import { createFileRoute, Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { cn } from 'cn'

import { Eyebrow, PageStack, pixelButtonVariants } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'
import { osStore } from '@/lib/os-store'
import { createPageMeta, SITE_AUTHOR } from '@/lib/seo/site-seo'

const ABOUT_WINDOW_ID = 'about-the-operator.exe'

export const Route = createFileRoute('/_site/about')({
  head: () =>
    createPageMeta({
      pathname: '/about',
      title: 'About',
      description:
        'Meet Nelson, a Hong Kong-born, Melbourne-based developer building practical web apps and open-source tools with React, TypeScript, and Next.js.',
      image: '/assets/me-pixel-art.webp',
      imageAlt: 'Pixel-art portrait of Nelson',
      type: 'profile',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: SITE_AUTHOR.name,
          url: SITE_AUTHOR.url,
          sameAs: [...SITE_AUTHOR.sameAs],
          jobTitle: 'Full-stack developer',
          knowsAbout: ['React', 'TypeScript', 'Next.js', 'System architecture'],
        },
      },
    }),
  component: AboutPage,
})

function AboutPage() {
  const windowMode = useStore(osStore, (state) => state.windowModes[ABOUT_WINDOW_ID] ?? 'normal')
  const isMaximized = windowMode === 'maximized'

  return (
    <PageStack>
      <WindowFrame title={ABOUT_WINDOW_ID} icon="☺" className="about-window" windowId={ABOUT_WINDOW_ID}>
        <Eyebrow><PixelIcon glyph="●" /> PROFILE / PUBLIC</Eyebrow>
        <h1>Hi, I’m Nelson.<br /><span>I build useful tools.</span></h1>
        <div className="about-layout mt-7 grid items-start gap-7 lg:grid-cols-5">
          <div className="about-copy lg:col-span-3">
            <p className="lead-copy mb-0 max-w-xl text-lg font-bold text-foreground">Melbourne-based developer building practical web apps and open-source tools.</p>
            {isMaximized ? (
              <div className="about-full-bio mt-4 max-w-xl">
                <p className="mb-3.5 leading-relaxed">I’m a full-stack developer based in Melbourne, Australia, building modern web applications and open-source tools that solve practical problems.</p>
                <p className="mb-3.5 leading-relaxed">My work focuses on React, TypeScript, and Next.js, with backend experience in C# and databases. I’m interested in system architecture and turning ideas into useful, well-crafted software for the developer community.</p>
                <p className="mb-3.5 leading-relaxed">Ask me about full-stack development, system architecture, or my programming journey. I’m open to thoughtful collaborations and open-source work.</p>
              </div>
            ) : null}
          </div>
          <div className={cn('fact-panel self-start border-3 border-border bg-success-muted p-5 shadow-os lg:col-span-2', isMaximized && 'has-avatar')}>
            <div className={cn('fact-panel-heading mb-4 flex items-center gap-5', isMaximized && 'has-avatar')}>
              {isMaximized ? (
                <img
                  alt="Pixel-art portrait of Nelson"
                  className="fact-panel-avatar size-39 shrink-0 rounded-full border-4 border-border bg-card object-cover shadow-os-coral"
                  style={{ imageRendering: 'pixelated', objectPosition: 'center 22%' }}
                  decoding="async"
                  height={640}
                  src="/assets/me-pixel-art.webp"
                  width={640}
                />
              ) : null}
              <Eyebrow className="mb-0 text-base">CURRENT FOCUS</Eyebrow>
            </div>
            <ul className="pixel-list m-0 mb-6 flex list-none flex-col gap-2.5 p-0 text-xs font-extrabold">
              <li><PixelIcon glyph="◆" className="mr-2 text-foreground" /> React, TypeScript &amp; Next.js</li>
              <li><PixelIcon glyph="◆" className="mr-2 text-foreground" /> Full-stack web apps</li>
              <li><PixelIcon glyph="◆" className="mr-2 text-foreground" /> Open-source tools</li>
            </ul>
            <Link className={cn(pixelButtonVariants())} to="/contact">SAY HELLO <span>→</span></Link>
          </div>
        </div>
        {isMaximized ? (
          <div className="about-expanded mt-8 grid gap-4 border-t-2 border-dashed border-muted-foreground pt-7 sm:grid-cols-2" id="about-expanded-profile">
            <section className="about-detail-card border-2 border-border bg-info-muted p-5 shadow-os-sm">
              <Eyebrow>BACKGROUND</Eyebrow>
              <h2 className="mb-3 text-3xl leading-tight">From Hong Kong to Melbourne.</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">I’m originally from Hong Kong and now call Melbourne home. I graduated with a Bachelor of Computer Science from Deakin University in 2023, after earlier studies in information technology and automotive technology.</p>
            </section>
            <section className="about-detail-card border-2 border-border bg-warning-muted p-5 shadow-os-sm">
              <Eyebrow>HOW I BUILD</Eyebrow>
              <h2 className="mb-3 text-3xl leading-tight">Practical, end-to-end software.</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">I enjoy shaping useful products from interface through to backend. My experience spans web apps and APIs, database design, authentication, and cloud deployment, with C# experience alongside my React and TypeScript work.</p>
            </section>
            <section className="about-detail-card about-detail-card-wide col-span-full border-2 border-border bg-error-muted p-5 shadow-os-sm">
              <Eyebrow>OPEN-SOURCE WORK</Eyebrow>
              <h2 className="mb-3 text-3xl leading-tight">Tools made to solve real problems.</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">Projects such as GNAF Autocomplete and SmartPlay HK OSS reflect my interest in useful, community-minded software. My path also includes customer service, hospitality, and automotive work, which shaped how I think about communication and practical problem-solving.</p>
              <Link className="text-link mt-1 inline-flex text-xs font-black tracking-wider text-accent" to="/projects">EXPLORE MY PROJECTS <span>→</span></Link>
            </section>
          </div>
        ) : (
          <p className="about-expand-hint m-0 mt-6 text-xs leading-relaxed font-black tracking-widest text-muted-foreground">MAXIMIZE THIS WINDOW FOR MY BACKGROUND &amp; PROJECTS</p>
        )}
      </WindowFrame>
    </PageStack>
  )
}
