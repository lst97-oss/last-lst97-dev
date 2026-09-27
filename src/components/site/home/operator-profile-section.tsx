import { Link } from '@tanstack/react-router'

import { ScrollArea } from '@/components/ui/scroll-area'

import { JsonCodeView } from '../json-code-view'
import { WindowFrame } from '../window-frame'
import { homeWindowControls } from './constants'

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

export function HomeOperatorProfileSection({
  totalCodingTime,
  formattedSnapshot,
}: {
  totalCodingTime: string | undefined
  formattedSnapshot: string | null
}) {
  return (
    <WindowFrame title="operator.profile" icon="☺" className="operator-profile-window" controls={homeWindowControls}>
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
          {formattedSnapshot
            ? (
              <ScrollArea
                className="profile-json-scroll"
                scrollbars="both"
                type="always"
                viewportProps={{ className: 'profile-json-viewport', tabIndex: 0, 'aria-label': 'Raw WakaTime JSON, scrollable' }}
              >
                <JsonCodeView code={formattedSnapshot} />
              </ScrollArea>
            )
            : <p className="muted-copy">WakaTime public-share stats are temporarily unavailable.</p>}
        </section>
        <Link className="text-link profile-read-link" to="/about">READ PROFILE →</Link>
      </div>
    </WindowFrame>
  )
}
