import { describe, expect, test } from 'bun:test'

const homeRoute = await Bun.file(new URL('../src/routes/_site.index.tsx', import.meta.url)).text()
const heroSection = await Bun.file(new URL('../src/components/site/home/hero-section.tsx', import.meta.url)).text()
const operatorProfile = await Bun.file(
  new URL('../src/components/site/home/operator-profile-section.tsx', import.meta.url),
).text()
const featuredProjectSection = await Bun.file(
  new URL('../src/components/site/home/featured-project-section.tsx', import.meta.url),
).text()
const aboutRoute = await Bun.file(new URL('../src/routes/_site.about.tsx', import.meta.url)).text()
const homeStyles = await Bun.file(new URL('../src/styles/home.css', import.meta.url)).text()
const globalStyles = await Bun.file(new URL('../src/styles/globals.css', import.meta.url)).text()
const changelogRoute = await Bun.file(new URL('../src/routes/_site.changelog.index.tsx', import.meta.url)).text()
const siteStyles = await Bun.file(new URL('../src/styles.css', import.meta.url)).text()
const wakatimeService = await Bun.file(new URL('../src/server/wakatime/service.ts', import.meta.url)).text()
// JSX text wraps across lines in the source, so any assertion about prose that
// is not itself short enough to fit on one line has to read the collapsed form.
const aboutRouteFlat = aboutRoute.replace(/\s+/g, ' ')

// The home route composes section components; the markup these tests describe lives in those
// components, so read both the route and the sections it renders.
const homeOperatorSource = `${homeRoute}\n${heroSection}\n${operatorProfile}\n${featuredProjectSection}`

describe('home operator profile', () => {
  test('introduces the operator using the GitHub profile summary', () => {
    expect(homeOperatorSource).toContain('Hi there, I’m Nelson.')
    expect(homeOperatorSource).toContain('Full-stack developer based in Melbourne, Australia.')
    expect(homeOperatorSource).toContain('TanStack Start, React, and TypeScript')
  })

  test('reveals GitHub-grounded operator context when welcome.exe is maximized', () => {
    expect(heroSection).toContain('welcome-expanded')
    expect(heroSection).toContain('Open-source enthusiast building tools for the developer community.')
    expect(heroSection).toContain('Full-stack development, system architecture, or my programming journey.')
    expect(heroSection).toContain('Open to interesting collaborations and open-source projects.')

    const defaultRule = homeStyles.match(/\.welcome-expanded\s*\{([^}]*)\}/)?.[1] ?? ''
    const maximizedRule = homeStyles.match(/\.hero-window\.is-maximized \.welcome-expanded\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(defaultRule).toContain('display: none;')
    expect(maximizedRule).toContain('display: grid;')
  })

  test('keeps featured projects sourced from Payload', () => {
    expect(homeRoute).toContain('loadProjects()')
    expect(homeRoute).toContain('<HomeFeaturedProjectSection project={featuredProject} />')
    // The `featured` prop is what caps the cover in that window; the card is
    // still the same Payload-sourced ProjectCard.
    expect(featuredProjectSection).toContain('<ProjectCard featured project={project} />')
  })

  test('shows the supplied most-used language shares in the operator window', () => {
    expect(operatorProfile).toContain('operator-profile-window')
    expect(operatorProfile).toContain('profile-coding-details')
    expect(operatorProfile).toContain('MOST USED LANGUAGES')
    expect(operatorProfile).toContain('profile-language-bar')
    expect(operatorProfile).toContain('profile-language-list')
    expect(operatorProfile).not.toContain('WAKATIME / THIS WEEK')

    const languageShares = [
      ['TypeScript', 66.79],
      ['HTML', 13.07],
      ['Python', 9.33],
      ['Rust', 2.15],
      ['Swift', 1.96],
      ['C', 1.63],
      ['Java', 1.57],
      ['Go', 1.25],
      ['C++', 1.18],
      ['JavaScript', 1.05],
    ] as const

    for (const [language, share] of languageShares) {
      expect(operatorProfile).toContain(`language: '${language}', share: ${share}`)
    }
  })

  test('places language shares below the profile description and lets JSON fill the right column', () => {
    // The profile panel is a single Tailwind flex column, so DOM order is the layout contract:
    // identity, bio, language card, JSON snapshot, read link.
    const order = [
      'profile-identity',
      'profile-expanded-bio',
      'profile-coding-details',
      'profile-json-details',
      'profile-read-link',
    ].map((className) => operatorProfile.indexOf(className))
    expect(order.every((position) => position >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))

    expect(operatorProfile).toContain('profile-panel flex h-full flex-col')

    // The JSON card is the tallest block in the column, so it is allowed to grow and scroll
    // rather than being clipped by a fixed-height row.
    expect(operatorProfile).toContain('profile-json-details flex min-h-0 min-w-0 flex-col overflow-hidden')
    expect(operatorProfile).toContain('profile-json-scroll mt-3.5 min-h-0 flex-1')
  })

  test('uses a distinct soft teal language card and emphasizes compact coding time', () => {
    // Soft teal now comes from the shared semantic token instead of a hard-coded hex.
    const languageCard = operatorProfile.split('\n').find((line) => line.includes('profile-coding-details'))
    expect(languageCard).toContain('bg-success-muted')
    expect(globalStyles).toContain('--os-teal-soft: #d8f4ee;')
    expect(globalStyles).toContain('--success-muted: var(--os-teal-soft);')

    // `text-base` is Tailwind's 1rem/16px step — the old hard-coded `font-size: 16px`.
    const compactCodingTime = operatorProfile.split('\n').find((line) => line.includes('profile-total-coding-time'))
    expect(compactCodingTime).toContain('text-base')
    expect(compactCodingTime).toContain('font-black')
  })

  test('shows the all-time WakaTime total in the compact profile as text', () => {
    expect(operatorProfile).toContain('profile-total-coding-time')
    expect(homeRoute).toContain(
      'wakatimeSnapshot?.stats.data.grand_total.human_readable_total_including_other_language',
    )
    expect(operatorProfile).toContain('{totalCodingTime} coded')
  })

  test('loads the public-share snapshot through a server function', () => {
    expect(homeRoute).toContain('getWakaTimeSnapshotServerFn')
    expect(homeRoute).toContain('getWakaTimeSnapshotServerFn(),')
    expect(homeRoute).not.toContain('../data/wakatime-stats.json?raw')
  })

  test('adds formatted WakaTime public-share JSON in the expanded profile', () => {
    expect(operatorProfile).toContain('profile-json-details')
    expect(operatorProfile).toContain('RAW WAKATIME JSON')
    expect(homeRoute).toContain('wakatimeSnapshot?.formattedJson')
    // The formatting happens server-side: the home route used to run
    // `js-beautify` during render, which put ~97 kB of beautifier on the client
    // bundle's critical path just to indent one blob.
    expect(wakatimeService).toContain('formattedJson: JSON.stringify(payload, null, 2)')
    expect(operatorProfile).toContain('<CodeBlockView code={formattedSnapshot} language="json" label="JSON" />')
  })

  test('lists changelog entries as adaptive cards instead of a timeline', () => {
    expect(changelogRoute).toContain('<CardGrid>')
    expect(changelogRoute).toContain('<ChangelogCard entry={entry}')
    expect(changelogRoute).not.toContain('changelog-timeline')
    expect(siteStyles).not.toContain('./styles/changelog.css')
  })
})

describe('about page introduction', () => {
  test('describes the operator as an open-source builder focused on useful tools', () => {
    expect(aboutRoute).toContain('I build useful tools.')
    expect(aboutRoute).toContain('Melbourne-based developer building practical web apps and open-source tools.')
    expect(aboutRouteFlat).toContain(
      'based in Melbourne, Australia, building modern web applications and open-source tools that solve practical problems',
    )
    expect(aboutRoute).toContain('My work focuses on React, TypeScript, and Next.js,')
    expect(aboutRouteFlat).toContain('turning ideas into useful, well-crafted software for the developer community')
    expect(aboutRoute).toContain('system architecture')
    expect(aboutRoute).toContain('thoughtful collaborations and open-source work')
  })
})
