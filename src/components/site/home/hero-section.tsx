import { Link } from '@tanstack/react-router'

import { PixelIcon } from '../pixel-icon'
import { WindowFrame } from '../window-frame'
import { homeWindowControls } from './constants'

export function HomeHeroSection() {
  return (
    <WindowFrame title="welcome.exe" icon="◆" className="hero-window" controls={homeWindowControls}>
      <div className="hero-grid">
        <div>
          <p className="eyebrow"><PixelIcon glyph="●" /> SYSTEM MESSAGE / 001</p>
          <h1>Hi there, I’m Nelson.<br /><span>Full-stack developer based in Melbourne, Australia.</span></h1>
          <p className="hero-copy">
            I build modern full-stack applications and open-source tools for the developer community. Right now, I’m focused on TanStack Start, React, and TypeScript.
          </p>
          <div className="button-row">
            <Link className="pixel-button primary" to="/projects">EXPLORE PROJECTS <span>→</span></Link>
            <Link className="pixel-button" to="/about">ABOUT THE OPERATOR</Link>
          </div>
        </div>
        <div className="hero-terminal-col">
          <img
            alt="Pixel-art portrait of Nelson"
            className="hero-terminal-avatar"
            decoding="async"
            height={480}
            src="/assets/me-pixel-art.webp"
            width={480}
          />
          <div className="hero-terminal" aria-label="System status">
            <div className="terminal-top"><span>STATUS.LOG</span><span>● REC</span></div>
            <p><span className="terminal-prompt">&gt;</span> booting personal system...</p>
            <p><span className="terminal-prompt">&gt;</span> loading curiosity <span className="terminal-ok">[OK]</span></p>
            <p><span className="terminal-prompt">&gt;</span> shipping small things <span className="terminal-ok">[OK]</span></p>
            <p><span className="terminal-prompt">&gt;</span> waiting for a good question<span className="blink">_</span></p>
          </div>
        </div>
      </div>
      <section aria-labelledby="welcome-expanded-title" className="welcome-expanded">
        <div className="welcome-expanded-intro">
          <p className="eyebrow">OPERATOR PROFILE / DETAILS</p>
          <h2 id="welcome-expanded-title">Open-source builder focused on useful tools.</h2>
          <p>Based in Melbourne, Australia, building for the wider developer community.</p>
        </div>
        <div className="welcome-context-grid">
          <article className="welcome-context-card">
            <p className="eyebrow">CURRENT FOCUS</p>
            <p>Modern full-stack apps with TanStack Start, React, and TypeScript.</p>
          </article>
          <article className="welcome-context-card">
            <p className="eyebrow">OPEN SOURCE</p>
            <p>Open-source enthusiast building tools for the developer community.</p>
          </article>
          <article className="welcome-context-card">
            <p className="eyebrow">ASK ME ABOUT</p>
            <p>Full-stack development, system architecture, or my programming journey.</p>
          </article>
          <article className="welcome-context-card">
            <p className="eyebrow">COLLABORATION</p>
            <p>Open to interesting collaborations and open-source projects.</p>
          </article>
        </div>
      </section>
    </WindowFrame>
  )
}
