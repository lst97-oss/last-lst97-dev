import { Link } from '@tanstack/react-router'
import { homeWindowControls } from '@/components/site/home/constants'
import { JsonCodeView } from '@/components/site/json-code-view'
import { Eyebrow } from '@/components/site/os-ui'
import { WindowFrame } from '@/components/site/window-frame'
import { ScrollArea } from '@/components/ui/scroll-area'

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
      <div className="profile-panel flex h-full flex-col">
        <div className="profile-identity grid justify-items-start gap-5">
          <div className="avatar-art grid size-22 place-items-center border-3 border-border bg-info font-display text-3xl leading-none shadow-os-sm" aria-hidden="true">LST<span className="block text-xs text-background">97</span></div>
          <div>
            <Eyebrow>THE OPERATOR</Eyebrow>
            <h2>Nelson</h2>
            <p className="muted-copy m-0 text-xs text-muted-foreground">Full-stack developer building open-source tools.</p>
            {totalCodingTime ? <p className="profile-total-coding-time mt-1 text-base font-black tracking-wide text-accent">{totalCodingTime} coded</p> : null}
          </div>
        </div>
        <div className="profile-expanded-bio text-muted-foreground">
          <p className="font-extrabold text-foreground">Based in Melbourne, Australia.</p>
          <p>Currently focused on TanStack Start, React, and TypeScript, with an interest in building useful tools for the developer community.</p>
        </div>
        <section aria-labelledby="profile-coding-title" className="profile-coding-details flex min-w-0 flex-col self-start border-3 border-border bg-success-muted p-4 shadow-os sm:p-7">
          <div className="profile-coding-heading flex items-end justify-start border-b-3 border-border pb-3">
            <div>
              <Eyebrow>MOST USED LANGUAGES</Eyebrow>
              <h3 id="profile-coding-title" className="mt-2 mb-0 text-lg">Coding time by language</h3>
            </div>
          </div>
          <div
            aria-label={`Most used languages: ${mostUsedLanguages.map(({ language, share }) => `${language} ${share}%`).join(', ')}`}
            className="profile-language-bar my-4.5 flex h-3.5 overflow-hidden border-2 border-border bg-card"
            role="img"
          >
            {mostUsedLanguages.map((language) => (
              <span
                aria-hidden="true"
                key={language.language}
                className="min-w-px border-r border-card last:border-r-0"
                style={{ backgroundColor: language.color, flexBasis: 0, flexGrow: language.share, flexShrink: 0 }}
              />
            ))}
          </div>
          <ul className="profile-language-list m-0 grid list-none grid-cols-2 gap-2.5 gap-x-4.5 p-0">
            {mostUsedLanguages.map((language) => (
              <li key={language.language}>
                <span aria-hidden="true" className="profile-language-swatch size-2.5" style={{ backgroundColor: language.color }} />
                <span>{language.language}</span>
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">{language.share.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="profile-json-title" className="profile-json-details flex min-h-0 min-w-0 flex-col overflow-hidden border-3 border-border bg-card p-4 shadow-os sm:p-7">
          <div className="profile-json-heading flex items-center justify-between gap-3 border-b-3 border-border pb-3">
            <div>
              <Eyebrow>ALL-TIME SNAPSHOT</Eyebrow>
              <h3 id="profile-json-title" className="mt-1.5 mb-0 text-xs">RAW WAKATIME JSON</h3>
            </div>
            <span className="border-2 border-border bg-primary px-1.5 py-0.5 text-xs font-black">JSON</span>
          </div>
          {formattedSnapshot
            ? (
              <ScrollArea
                className="profile-json-scroll mt-3.5 min-h-0 flex-1"
                scrollbars="both"
                type="always"
                viewportProps={{ className: 'profile-json-viewport', tabIndex: 0, 'aria-label': 'Raw WakaTime JSON, scrollable' }}
              >
                <JsonCodeView code={formattedSnapshot} />
              </ScrollArea>
            )
            : <p className="muted-copy m-0 text-xs text-muted-foreground">WakaTime public-share stats are temporarily unavailable.</p>}
        </section>
        <Link className="text-link profile-read-link mt-1 inline-flex text-xs font-black tracking-wider text-accent" to="/about">READ PROFILE →</Link>
      </div>
    </WindowFrame>
  )
}
