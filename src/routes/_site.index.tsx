import { createFileRoute, Link } from '@tanstack/react-router'
import beautify from 'js-beautify'

import { PostCard, ProjectCard } from '../components/site/content/card'
import { JsonCodeView } from '../components/site/json-code-view'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { loadPosts, loadProjects } from '../lib/site-data'
import { getWakaTimeSnapshotServerFn } from '../server/wakatime/server-functions'

const rootWindowControls = { close: false } as const
const mostUsedLanguages = [
  { language: 'TypeScript', share: 66.79, color: '#3284c9' },
  { language: 'HTML', share: 13.07, color: '#e54821' },
  { language: 'Python', share: 9.33, color: '#3376ad' },
  { language: 'Rust', share: 2.15, color: '#e59e7c' },
  { language: 'Swift', share: 1.96, color: '#ed5141' },
  { language: 'C', share: 1.63, color: '#5a5d62' },
  { language: 'Java', share: 1.57, color: '#b17912' },
  { language: 'Go', share: 1.25, color: '#00a9c8' },
  { language: 'C++', share: 1.18, color: '#eb5593' },
  { language: 'JavaScript', share: 1.05, color: '#e5d34d' },
] as const

export const Route = createFileRoute('/_site/')({
  loader: async () => {
    const [posts, projects, wakatimeSnapshot] = await Promise.all([
      loadPosts(),
      loadProjects(),
      getWakaTimeSnapshotServerFn(),
    ])
    return { posts, projects, wakatimeSnapshot }
  },
  head: () => ({
    meta: [
      { title: 'LAST//OS — Personal system online' },
      { name: 'description', content: 'A pixel-art personal operating system for ideas, projects, and conversations.' },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  const { posts, projects, wakatimeSnapshot } = Route.useLoaderData()
  const featuredProject = projects.find((project) => project.featured) ?? projects[0]
  const totalCodingTime = wakatimeSnapshot?.stats.data.grand_total.human_readable_total_including_other_language
  const formattedWakatimeStatsJson = wakatimeSnapshot
    ? beautify.js(wakatimeSnapshot.rawJson, { indent_size: 2 })
    : null

  return (
    <div className="page-stack">
      <WindowFrame title="welcome.exe" icon="◆" className="hero-window" controls={rootWindowControls}>
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
          <div className="hero-terminal" aria-label="System status">
            <div className="terminal-top"><span>STATUS.LOG</span><span>● REC</span></div>
            <p><span className="terminal-prompt">&gt;</span> booting personal system...</p>
            <p><span className="terminal-prompt">&gt;</span> loading curiosity <span className="terminal-ok">[OK]</span></p>
            <p><span className="terminal-prompt">&gt;</span> shipping small things <span className="terminal-ok">[OK]</span></p>
            <p><span className="terminal-prompt">&gt;</span> waiting for a good question<span className="blink">_</span></p>
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

      <div className="dashboard-grid">
        <WindowFrame title="featured-project.app" icon="▤" className="feature-window" controls={rootWindowControls}>
          {featuredProject ? (
            <ProjectCard project={featuredProject} />
          ) : (
            <div className="empty-panel"><PixelIcon glyph="◇" /><p>Project archive is ready for its first upload.</p><Link to="/contact">START A CONVERSATION →</Link></div>
          )}
        </WindowFrame>
        <WindowFrame title="operator.profile" icon="☺" className="operator-profile-window" controls={rootWindowControls}>
          <div className="profile-panel">
            <div className="profile-identity">
              <div className="avatar-art" aria-hidden="true">LST<span>97</span></div>
              <div>
                <p className="eyebrow">THE OPERATOR</p>
                <h2>Nelson</h2>
                <p className="muted-copy">Full-stack developer building open-source tools.</p>
                {totalCodingTime ? <p className="profile-total-coding-time">{totalCodingTime} coded</p> : null}
              </div>
            </div>
            <div className="profile-expanded-bio">
              <p>Based in Melbourne, Australia.</p>
              <p>Currently focused on TanStack Start, React, and TypeScript, with an interest in building useful tools for the developer community.</p>
            </div>
            <section aria-labelledby="profile-coding-title" className="profile-coding-details">
              <div className="profile-coding-heading">
                <div>
                  <p className="eyebrow">MOST USED LANGUAGES</p>
                  <h3 id="profile-coding-title">Coding time by language</h3>
                </div>
              </div>
              <div
                aria-label={`Most used languages: ${mostUsedLanguages.map(({ language, share }) => `${language} ${share}%`).join(', ')}`}
                className="profile-language-bar"
                role="img"
              >
                {mostUsedLanguages.map((language) => (
                  <span
                    aria-hidden="true"
                    key={language.language}
                    style={{ backgroundColor: language.color, flexBasis: 0, flexGrow: language.share, flexShrink: 0 }}
                  />
                ))}
              </div>
              <ul className="profile-language-list">
                {mostUsedLanguages.map((language) => (
                  <li key={language.language}>
                    <span aria-hidden="true" className="profile-language-swatch" style={{ backgroundColor: language.color }} />
                    <span>{language.language}</span>
                    <span>{language.share.toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="profile-json-title" className="profile-json-details">
              <div className="profile-json-heading">
                <div>
                  <p className="eyebrow">ALL-TIME SNAPSHOT</p>
                  <h3 id="profile-json-title">RAW WAKATIME JSON</h3>
                </div>
                <span>JSON</span>
              </div>
              {formattedWakatimeStatsJson
                ? <JsonCodeView code={formattedWakatimeStatsJson} />
                : <p className="muted-copy">WakaTime public-share stats are temporarily unavailable.</p>}
            </section>
            <Link className="text-link profile-read-link" to="/about">READ PROFILE →</Link>
          </div>
        </WindowFrame>
      </div>

      <WindowFrame title="latest-notes.directory" icon="✎" controls={rootWindowControls}>
        <div className="section-heading"><div><p className="eyebrow">RECENTLY SAVED</p><h2>Notes from the field.</h2></div><Link className="text-link" to="/blog">VIEW ALL NOTES →</Link></div>
        {posts.items.length > 0 ? <div className="card-grid">{posts.items.slice(0, 3).map((post) => <PostCard key={post.slug} post={post} />)}</div> : <div className="empty-panel"><PixelIcon glyph="◇" /><p>No notes published yet. The editor is waiting.</p></div>}
      </WindowFrame>
    </div>
  )
}
