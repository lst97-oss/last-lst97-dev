import { createFileRoute, Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { osStore } from '../lib/os-store'

const ABOUT_WINDOW_ID = 'about-the-operator.exe'

export const Route = createFileRoute('/_site/about')({
  head: () => ({ meta: [{ title: 'About — LAST//OS' }, { name: 'description', content: 'Meet Nelson, a Hong Kong-born, Melbourne-based developer building practical web apps and open-source tools.' }] }),
  component: AboutPage,
})

function AboutPage() {
  const windowMode = useStore(osStore, (state) => state.windowModes[ABOUT_WINDOW_ID] ?? 'normal')
  const isMaximized = windowMode === 'maximized'

  return (
    <div className="page-stack narrow-page">
      <WindowFrame title={ABOUT_WINDOW_ID} icon="☺" className="about-window" windowId={ABOUT_WINDOW_ID}>
        <p className="eyebrow"><PixelIcon glyph="●" /> PROFILE / PUBLIC</p>
        <h1>Hi, I’m Nelson.<br /><span>I build useful tools.</span></h1>
        <div className="about-layout">
          <div className="about-copy">
            <p className="lead-copy">Melbourne-based developer building practical web apps and open-source tools.</p>
            {isMaximized ? (
              <div className="about-full-bio">
                <p>I’m a full-stack developer based in Melbourne, Australia, building modern web applications and open-source tools that solve practical problems.</p>
                <p>My work focuses on React, TypeScript, and Next.js, with backend experience in C# and databases. I’m interested in system architecture and turning ideas into useful, well-crafted software for the developer community.</p>
                <p>Ask me about full-stack development, system architecture, or my programming journey. I’m open to thoughtful collaborations and open-source work.</p>
              </div>
            ) : null}
          </div>
          <div className="fact-panel">
            <p className="eyebrow">CURRENT FOCUS</p>
            <ul className="pixel-list">
              <li><PixelIcon glyph="◆" /> React, TypeScript &amp; Next.js</li>
              <li><PixelIcon glyph="◆" /> Full-stack web apps</li>
              <li><PixelIcon glyph="◆" /> Open-source tools</li>
            </ul>
            <Link className="pixel-button" to="/contact">SAY HELLO <span>→</span></Link>
          </div>
        </div>
        {isMaximized ? (
          <div className="about-expanded" id="about-expanded-profile">
            <section className="about-detail-card">
              <p className="eyebrow">BACKGROUND</p>
              <h2>From Hong Kong to Melbourne.</h2>
              <p>I’m originally from Hong Kong and now call Melbourne home. I graduated with a Bachelor of Computer Science from Deakin University in 2023, after earlier studies in information technology and automotive technology.</p>
            </section>
            <section className="about-detail-card">
              <p className="eyebrow">HOW I BUILD</p>
              <h2>Practical, end-to-end software.</h2>
              <p>I enjoy shaping useful products from interface through to backend. My experience spans web apps and APIs, database design, authentication, and cloud deployment, with C# experience alongside my React and TypeScript work.</p>
            </section>
            <section className="about-detail-card about-detail-card-wide">
              <p className="eyebrow">OPEN-SOURCE WORK</p>
              <h2>Tools made to solve real problems.</h2>
              <p>Projects such as GNAF Autocomplete and SmartPlay HK OSS reflect my interest in useful, community-minded software. My path also includes customer service, hospitality, and automotive work, which shaped how I think about communication and practical problem-solving.</p>
              <Link className="text-link" to="/projects">EXPLORE MY PROJECTS <span>→</span></Link>
            </section>
          </div>
        ) : (
          <p className="about-expand-hint">MAXIMIZE THIS WINDOW FOR MY BACKGROUND &amp; PROJECTS</p>
        )}
      </WindowFrame>
    </div>
  )
}
