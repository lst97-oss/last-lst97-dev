import { describe, expect, test } from 'bun:test'

const homeRoute = await Bun.file(new URL('../src/routes/_site.index.tsx', import.meta.url)).text()
const aboutRoute = await Bun.file(new URL('../src/routes/_site.about.tsx', import.meta.url)).text()
const styles = await Bun.file(new URL('../src/styles.css', import.meta.url)).text()

describe('home operator profile', () => {
  test('introduces the operator using the GitHub profile summary', () => {
    expect(homeRoute).toContain('Hi there, I’m Nelson.')
    expect(homeRoute).toContain('Full-stack developer based in Melbourne, Australia.')
    expect(homeRoute).toContain('TanStack Start, React, and TypeScript')
  })

  test('reveals GitHub-grounded operator context when welcome.exe is maximized', () => {
    expect(homeRoute).toContain('welcome-expanded')
    expect(homeRoute).toContain('Open-source enthusiast building tools for the developer community.')
    expect(homeRoute).toContain('Full-stack development, system architecture, or my programming journey.')
    expect(homeRoute).toContain('Open to interesting collaborations and open-source projects.')

    const defaultRule = styles.match(/\.welcome-expanded\s*\{([^}]*)\}/)?.[1] ?? ''
    const maximizedRule = styles.match(/\.hero-window\.is-maximized \.welcome-expanded\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(defaultRule).toContain('display: none;')
    expect(maximizedRule).toContain('display: grid;')
  })

  test('keeps featured projects sourced from Payload', () => {
    expect(homeRoute).toContain('loadProjects()')
    expect(homeRoute).toContain('<ProjectCard project={featuredProject} />')
  })

  test('shows the supplied most-used language shares in the operator window', () => {
    expect(homeRoute).toContain('operator-profile-window')
    expect(homeRoute).toContain('profile-coding-details')
    expect(homeRoute).toContain('MOST USED LANGUAGES')
    expect(homeRoute).toContain('profile-language-bar')
    expect(homeRoute).toContain('profile-language-list')
    expect(homeRoute).not.toContain('WAKATIME / THIS WEEK')

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
      expect(homeRoute).toContain(`language: '${language}', share: ${share}`)
    }
  })

  test('places language shares below the profile description and lets JSON fill the right column', () => {
    const codingRule = styles.match(/\.operator-profile-window\.is-maximized \.profile-coding-details\s*\{([^}]*)\}/)?.[1] ?? ''
    const jsonRule = styles.match(/\.operator-profile-window\.is-maximized \.profile-json-details\s*\{([^}]*)\}/)?.[1] ?? ''
    const jsonPreRule = styles.match(/\.profile-json-details pre\s*\{([^}]*)\}/)?.[1] ?? ''
    const profileLinkRule = styles.match(/\.operator-profile-window\.is-maximized \.profile-read-link\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(codingRule).toContain('grid-column: 1;')
    expect(codingRule).toContain('grid-row: 3;')
    expect(jsonRule).toContain('grid-column: 2;')
    expect(jsonRule).toContain('grid-row: 1 / 5;')
    expect(jsonRule).toContain('display: flex;')
    expect(jsonPreRule).toContain('flex: 1;')
    expect(jsonPreRule).toContain('min-height: 0;')
    expect(profileLinkRule).toContain('grid-row: 4;')
  })

  test('uses a distinct soft teal language card and emphasizes compact coding time', () => {
    const languageCardRule = styles.match(/\.operator-profile-window\.is-maximized \.profile-coding-details\s*\{([^}]*)\}/)?.[1] ?? ''
    const compactCodingTimeRule = styles.match(/\.profile-total-coding-time\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(languageCardRule).toContain('background: #e8f7f2;')
    expect(compactCodingTimeRule).toContain('font-size: 16px;')
  })

  test('shows the all-time WakaTime total in the compact profile as text', () => {
    expect(homeRoute).toContain('profile-total-coding-time')
    expect(homeRoute).toContain('wakatimeSnapshot?.stats.data.grand_total.human_readable_total_including_other_language')
  })

  test('loads the public-share snapshot through a server function', () => {
    expect(homeRoute).toContain('getWakaTimeSnapshotServerFn')
    expect(homeRoute).toContain('getWakaTimeSnapshotServerFn(),')
    expect(homeRoute).not.toContain("../data/wakatime-stats.json?raw")
  })

  test('adds formatted WakaTime public-share JSON in the expanded profile', () => {
    expect(homeRoute).toContain('profile-json-details')
    expect(homeRoute).toContain('RAW WAKATIME JSON')
    expect(homeRoute).toContain('beautify.js(wakatimeSnapshot.rawJson')
    expect(homeRoute).toContain('<JsonCodeView code={formattedWakatimeStatsJson} />')
  })
})

describe('about page introduction', () => {
  test('describes the operator as an open-source builder focused on useful tools', () => {
    expect(aboutRoute).toContain('Open-source builder focused on useful tools.')
    expect(aboutRoute).toContain('based in Melbourne, Australia, building modern web applications and open-source tools that solve practical problems')
    expect(aboutRoute).toContain('My current work centers on TanStack Start, React, and TypeScript.')
    expect(aboutRoute).toContain('turning ideas into useful, well-crafted software for the developer community')
    expect(aboutRoute).toContain('system architecture')
    expect(aboutRoute).toContain('thoughtful collaborations and open-source work')
  })
})
