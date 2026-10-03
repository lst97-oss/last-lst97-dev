import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { homeWindowControls } from '@/components/site/home/constants'
import { Eyebrow, pixelButtonVariants } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

export function HomeHeroSection() {
  return (
    <WindowFrame title="welcome.exe" icon="◆" className="hero-window" controls={homeWindowControls}>
      <div className="hero-grid grid items-center gap-7 lg:grid-cols-5 lg:gap-20">
        <div className="lg:col-span-3">
          <Eyebrow>
            <PixelIcon glyph="●" /> SYSTEM MESSAGE / 001
          </Eyebrow>
          <h1>
            Hi there, I’m Nelson.
            <br />
            <span>Full-stack developer based in Melbourne, Australia.</span>
          </h1>
          <p className="hero-copy mb-7 max-w-2xl text-base text-muted-foreground">
            I build modern full-stack applications and open-source tools for the developer community. Right now, I’m
            focused on TanStack Start, React, and TypeScript.
          </p>
          <div className="button-row flex flex-wrap items-center gap-3">
            <Link className={cn(pixelButtonVariants({ tone: 'coral' }))} to="/projects">
              EXPLORE PROJECTS <span>→</span>
            </Link>
            <Link className={cn(pixelButtonVariants())} to="/about">
              ABOUT THE OPERATOR
            </Link>
          </div>
        </div>
        <div className="hero-terminal-col flex min-w-0 flex-col items-center lg:col-span-2">
          {/* The avatar is the largest above-the-fold image on the page and the
              LCP candidate on a slow connection, so it is eager with a high
              fetch priority rather than left on the lazy queue. `decoding`
              stays `async`: pixel art reads correctly while it decodes, and
              blocking it would hold back the rest of the first paint. The
              inline `image-rendering` is load-bearing for the pixel look, so
              do not move these attributes into a stylesheet. */}
          <img
            alt="Pixel-art portrait of Nelson"
            className="hero-terminal-avatar mb-3.5 size-45 rounded-full border-4 border-border bg-card object-cover shadow-os-coral-sm"
            style={{ imageRendering: 'pixelated', objectPosition: 'center 22%' }}
            decoding="async"
            fetchPriority="high"
            height={640}
            loading="eager"
            src="/assets/me-pixel-art.webp"
            width={640}
          />
          <div
            className="hero-terminal box-border min-h-56 w-full border-3 border-border bg-foreground p-4.5 text-xs text-background shadow-os-coral"
            aria-label="System status"
          >
            <div className="terminal-top mb-6 flex justify-between text-xs font-black tracking-widest text-primary">
              <span>STATUS.LOG</span>
              <span>● REC</span>
            </div>
            <p>
              <span className="terminal-prompt text-secondary">&gt;</span> booting personal system...
            </p>
            <p>
              <span className="terminal-prompt text-secondary">&gt;</span> loading curiosity{' '}
              <span className="terminal-ok text-secondary">[OK]</span>
            </p>
            <p>
              <span className="terminal-prompt text-secondary">&gt;</span> shipping small things{' '}
              <span className="terminal-ok text-secondary">[OK]</span>
            </p>
            <p>
              <span className="terminal-prompt text-secondary">&gt;</span> waiting for a good question
              <span className="blink">_</span>
            </p>
          </div>
        </div>
      </div>
      <section aria-labelledby="welcome-expanded-title" className="welcome-expanded">
        <div className="welcome-expanded-intro border-3 border-border bg-info-muted p-4 shadow-os-sm sm:p-6">
          <Eyebrow>OPERATOR PROFILE / DETAILS</Eyebrow>
          <h2 id="welcome-expanded-title">Open-source builder focused on useful tools.</h2>
          <p>Based in Melbourne, Australia, building for the wider developer community.</p>
        </div>
        <div className="welcome-context-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="welcome-context-card border-3 border-border bg-card p-3.5 shadow-os-sm">
            <Eyebrow>CURRENT FOCUS</Eyebrow>
            <p>Modern full-stack apps with TanStack Start, React, and TypeScript.</p>
          </article>
          <article className="welcome-context-card border-3 border-border bg-card p-3.5 shadow-os-sm">
            <Eyebrow>OPEN SOURCE</Eyebrow>
            <p>Open-source enthusiast building tools for the developer community.</p>
          </article>
          <article className="welcome-context-card border-3 border-border bg-card p-3.5 shadow-os-sm">
            <Eyebrow>ASK ME ABOUT</Eyebrow>
            <p>Full-stack development, system architecture, or my programming journey.</p>
          </article>
          <article className="welcome-context-card border-3 border-border bg-card p-3.5 shadow-os-sm">
            <Eyebrow>COLLABORATION</Eyebrow>
            <p>Open to interesting collaborations and open-source projects.</p>
          </article>
        </div>
      </section>
    </WindowFrame>
  )
}
