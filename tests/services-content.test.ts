import { describe, expect, test } from 'bun:test'

import {
  RECOMMENDED_PACKAGE_SLUG,
  SERVICE_ADDONS,
  SERVICE_PACKAGE_PRICE_AMOUNT,
  SERVICE_PACKAGES,
  SERVICE_PROCESS_STEPS,
  SERVICE_QUOTE_PROMPT,
  SERVICE_TERMS,
} from '../src/lib/services/packages'

const routeSource = await Bun.file(new URL('../src/routes/_site.services.tsx', import.meta.url)).text()
// JSX prose and element trees wrap in the formatter, so the section inventory
// is read off the label text rather than counted as raw source occurrences.
const insetSectionLabels = [...routeSource.matchAll(/<Eyebrow className="px-2 py-1">([^<]+)<\/Eyebrow>/g)].map(
  (match) => match[1].trim(),
)

const serviceFeatureWebp = Bun.file(new URL('../public/assets/services/web-that-ship.webp', import.meta.url))
const serviceFeaturePng = Bun.file(new URL('../public/assets/services/web-that-ship.png', import.meta.url))

describe('service packages', () => {
  test('every tier is uniquely identified and fully described', () => {
    const slugs = SERVICE_PACKAGES.map((pkg) => pkg.slug)
    expect(slugs).toEqual(['starter', 'business', 'business-plus'])
    for (const pkg of SERVICE_PACKAGES) {
      expect(pkg.name).not.toBe('')
      expect(pkg.tagline).not.toBe('')
      expect(pkg.bestFor).not.toBe('')
      // Prices are starting points, never a fixed quote.
      expect(pkg.price).toMatch(/^From A\$\d/)
      expect(pkg.includes.length).toBeGreaterThan(0)
      expect(pkg.highlights.length).toBeGreaterThanOrEqual(3)
      expect(pkg.highlights.length).toBeLessThanOrEqual(4)
      for (const item of pkg.includes) expect(item).not.toBe('')
    }
  })

  test('each tier inherits from a real earlier tier, so "everything in X" resolves', () => {
    for (const pkg of SERVICE_PACKAGES) {
      if (!pkg.inherits) continue
      const parent = SERVICE_PACKAGES.find((candidate) => candidate.slug === pkg.inherits)
      expect(parent).toBeDefined()
      expect(SERVICE_PACKAGES.indexOf(parent!)).toBeLessThan(SERVICE_PACKAGES.indexOf(pkg))
    }
  })

  test('exactly one tier is recommended and highlighted', () => {
    const recommended = SERVICE_PACKAGES.filter((pkg) => pkg.slug === RECOMMENDED_PACKAGE_SLUG)
    expect(recommended).toHaveLength(1)
    const highlighted = SERVICE_PACKAGES.filter((pkg) => pkg.emphasis)
    expect(highlighted.map((pkg) => pkg.slug)).toEqual([RECOMMENDED_PACKAGE_SLUG])
  })

  test('the JSON-LD amounts match the digits shown on the cards', () => {
    // schema.org `price` must be a number, so it is carried in a parallel map.
    // If the two drift, search engines quote a figure the page never displays.
    for (const pkg of SERVICE_PACKAGES) {
      const amount = SERVICE_PACKAGE_PRICE_AMOUNT[pkg.slug]
      expect(typeof amount).toBe('number')
      const digits = pkg.price.replace(/[^\d]/g, '')
      expect(String(amount)).toBe(digits)
    }
    expect(Object.keys(SERVICE_PACKAGE_PRICE_AMOUNT).sort()).toEqual(SERVICE_PACKAGES.map((pkg) => pkg.slug).sort())
  })
})

describe('add-ons and process', () => {
  test('every add-on row is labelled and priced', () => {
    expect(SERVICE_ADDONS.length).toBeGreaterThan(0)
    for (const addon of SERVICE_ADDONS) {
      expect(addon.name).not.toBe('')
      expect(addon.price).not.toBe('')
    }
    // Two revisions ship with the packages, so an extra round must be buyable.
    expect(SERVICE_ADDONS.some((addon) => addon.price === 'From A$100' && addon.name.includes('revision'))).toBe(true)
  })

  test('the process has its seven stages in order, each with actionable detail', () => {
    expect(SERVICE_PROCESS_STEPS.map((step) => step.title)).toEqual([
      'Project Discovery',
      'Design & Structure',
      'Development',
      'CMS & Integrations',
      'Testing',
      'Review & Revisions',
      'Launch',
    ])
    for (const step of SERVICE_PROCESS_STEPS) {
      expect(step.summary).not.toBe('')
    }
    const integrations = SERVICE_PROCESS_STEPS.find((step) => step.title === 'CMS & Integrations')!
    expect(integrations.summary).toContain('agreed scope')
    expect(integrations.summary).not.toContain('below')
  })

  test('places the workflow WebP above the process heading and removes its source PNG', async () => {
    const workflowStart = routeSource.indexOf('/assets/services/workflow.webp')
    const processHeadingStart = routeSource.indexOf('How the work runs.')
    const workflowWebp = Bun.file(new URL('../public/assets/services/workflow.webp', import.meta.url))
    const workflowPng = Bun.file(new URL('../public/assets/services/workflow.png', import.meta.url))

    expect(workflowStart).toBeGreaterThanOrEqual(0)
    expect(workflowStart).toBeLessThan(processHeadingStart)
    expect(routeSource).toContain('className="mx-auto mb-5 block h-auto w-full max-w-2xl"')
    expect(await workflowWebp.exists()).toBe(true)
    expect(await workflowPng.exists()).toBe(false)
    expect(await workflowWebp.slice(8, 12).text()).toBe('WEBP')
  })
})

describe('terms and quote prompt', () => {
  test('groups service conditions into four concise disclosures', () => {
    expect(SERVICE_TERMS.map((section) => section.id)).toEqual([
      'project-costs',
      'content-responsibilities',
      'revisions-and-scope',
      'launch-and-support',
    ])
    for (const section of SERVICE_TERMS) {
      expect(section.title).not.toBe('')
      expect(section.lead).not.toBe('')
      expect(section.items.length).toBeGreaterThan(0)
      expect(section.items.length).toBeLessThanOrEqual(3)
    }
    const termsCopy = SERVICE_TERMS.map((section) => [section.lead, ...section.items].join(' '))
      .join(' ')
      .toLowerCase()
    for (const requiredDetail of [
      'a$50/hour',
      'legal advice',
      'advanced animations',
      'crm',
      'internal tools',
      'complex deployment',
    ]) {
      expect(termsCopy).toContain(requiredDetail)
    }
  })

  test('asks for the key quotation details in one short prompt', () => {
    expect(SERVICE_QUOTE_PROMPT).toContain('fixed-price scope')
    expect(SERVICE_QUOTE_PROMPT).toContain('required pages')
    expect(SERVICE_QUOTE_PROMPT).toContain('target launch')
  })
})

describe('crawler-visible copy', () => {
  test('uses the WebP feature illustration above the page heading', async () => {
    const headingStart = routeSource.indexOf('<PageHeading')
    const imageStart = routeSource.indexOf('<img')
    const imageRegion = routeSource.slice(routeSource.indexOf('<WindowFrame'), headingStart)

    expect(imageStart).toBeGreaterThanOrEqual(0)
    expect(imageStart).toBeLessThan(headingStart)
    expect(imageRegion).not.toMatch(/<figure|<div/)
    expect(imageRegion).not.toMatch(/border-3|shadow-os-coral-sm/)
    expect(routeSource).toContain('src="/assets/services/web-that-ship.webp"')
    expect(routeSource).toContain('alt="Pixel-art illustration of a ship carrying website panels over ocean waves."')
    expect(routeSource).toContain('fetchPriority="high"')
    expect(await serviceFeatureWebp.exists()).toBe(true)
    expect(await serviceFeaturePng.exists()).toBe(false)
    expect(await serviceFeatureWebp.slice(8, 12).text()).toBe('WEBP')
  })

  test('the route ships its content unconditionally', () => {
    // Gating any section on the window mode is the thin-content defect already
    // guarded for /about and /contact in seo-crawl-visibility.test.ts.
    expect(routeSource).not.toMatch(/isMaximized \?/)
    expect(routeSource).not.toMatch(/is-normal/)
  })

  test('the window scrolls internally, or the page is unreachable on a phone', () => {
    // The shell root is h-dvh overflow-hidden, so the frame's ScrollArea is the
    // only scroller on the page.
    expect(routeSource).toMatch(/<WindowFrame[^>]*\bscrollable\b/)
  })

  test('the page nests its headings without skipping a level', () => {
    // PageHeading emits the single h1; the page must not add another.
    expect(routeSource.match(/<h1/g)).toBeNull()
    expect(routeSource).toContain('<h2>')
    // Check the actual nesting rather than banning a level outright. A price
    // group is an h3 and its engagements are h4 inside it, which is valid; what
    // the old blanket ban really guarded was an h2 jumping straight to h4.
    const levels = [...routeSource.matchAll(/<h([1-6])[\s>]/g)].map((match) => Number(match[1]))
    for (let index = 1; index < levels.length; index += 1) {
      const step = levels[index] - levels[index - 1]
      expect(step, `heading level jumped from h${levels[index - 1]} to h${levels[index]}`).toBeLessThanOrEqual(1)
    }
  })

  test('keeps full service details in disclosures and avoids repeated lists', () => {
    expect(routeSource).toContain('SERVICE_TERMS.map')
    expect(routeSource).not.toContain('SERVICE_RECOMMENDED_POINTS')
    expect(routeSource).not.toContain('SERVICE_QUOTE_CHECKLIST')
    // Re-pinned when the footer CTA became generic for both offerings: the
    // package-specific SERVICE_QUOTE_PROMPT no longer renders here.
    expect(routeSource).toContain('SERVICE_QUOTE_CTA_NOTE')
    expect(routeSource).toContain('SERVICE_QUOTE_HEADING')
    expect(routeSource).toContain('SERVICE_QUOTE_CTA_TAB_HINT')
    const packageStart = routeSource.indexOf('{SERVICE_PACKAGES.map')
    const packageQuoteAction = routeSource.indexOf('REQUEST A QUOTE', packageStart)
    const packageSectionEnd = routeSource.indexOf('</section>', packageStart)
    expect(packageQuoteAction).toBeGreaterThan(packageStart)
    expect(packageQuoteAction).toBeLessThan(packageSectionEnd)
  })

  test('insets section labels so they have breathing room from the content edge', () => {
    // Pinned by label, not by count: a new section that forgets its inset
    // eyebrow, or carries an unexpected one, fails here instead of quietly
    // passing a bare tally. ORDER is document order, and `TERMS & SUPPORT` is
    // written as an HTML entity in the route source.
    expect(insetSectionLabels).toEqual([
      'OVERVIEW',
      'PACKAGES',
      'OPTIONAL ADD-ONS',
      'PROCESS',
      'TECHNOLOGY',
      'TERMS &amp; SUPPORT',
      'TECHNICAL SUPPORT',
      'A$100 STANDARD ENGAGEMENT',
      'HOW SUPPORT WORKS',
      'REQUEST A QUOTE',
    ])
    // No inset eyebrow may sit outside an <Eyebrow>...</Eyebrow> pair, which
    // the label scan above would silently skip.
    expect(routeSource.match(/<Eyebrow className="px-2 py-1">/g)).toHaveLength(insetSectionLabels.length)
  })

  test('separates page sections so the next label clears the preceding panel shadow', () => {
    // The structural invariant behind the spacing: every `mt-8` section opens
    // with an inset label, and the OVERVIEW section is the one labelled section
    // that carries no spacer because it is the page's first block.
    expect(routeSource.match(/<section className="mt-8/g)).toHaveLength(insetSectionLabels.length - 1)
  })
})
