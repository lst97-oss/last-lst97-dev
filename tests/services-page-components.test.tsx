import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ServiceInfoPanel } from '../src/components/site/services/info-panel'
import { ServicePackageCard } from '../src/components/site/services/package-card'
import { ServiceProcessSteps } from '../src/components/site/services/process-steps'
import { SERVICE_PACKAGES, SERVICE_TERMS } from '../src/lib/services/packages'
import { loadSiteStylesheet } from './site-stylesheet'

const siteStyles = await loadSiteStylesheet()
const servicesRouteSource = await Bun.file(new URL('../src/routes/_site.services.tsx', import.meta.url)).text()

describe('services page components', () => {
  test('shows package highlights first and keeps full inclusions in a closed disclosure', () => {
    const pkg = SERVICE_PACKAGES[0]
    const markup = renderToStaticMarkup(createElement(ServicePackageCard, { pkg }))
    const detailsStart = markup.indexOf('<details')
    const fullInclusionStart = markup.indexOf(pkg.includes.at(-1)!)

    expect(markup).not.toContain('REQUEST A QUOTE')
    expect(detailsStart).toBeGreaterThan(-1)
    expect(detailsStart).toBeLessThan(fullInclusionStart)
    expect(markup.slice(detailsStart)).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/)
    for (const highlight of pkg.highlights) {
      expect(markup.indexOf(highlight)).toBeLessThan(detailsStart)
    }
    expect(markup.slice(detailsStart)).toContain(pkg.includes.at(-1)!)
  })

  test('labels the emphasized tier as recommended', () => {
    const pkg = SERVICE_PACKAGES.find((candidate) => candidate.emphasis)!
    const markup = renderToStaticMarkup(createElement(ServicePackageCard, { pkg }))

    expect(markup).toContain('RECOMMENDED')
  })

  test('keeps illustration backgrounds out of the tier cards', () => {
    for (const pkg of SERVICE_PACKAGES) {
      const markup = renderToStaticMarkup(createElement(ServicePackageCard, { pkg }))

      expect(markup).toContain(`service-package-card--${pkg.slug}`)
      expect(markup).not.toContain('/assets/services/')
      expect(markup).not.toContain('--service-package-art')
    }
  })

  test('keeps package tiers progressively framed without background artwork', () => {
    expect(siteStyles).toContain('.service-package-card--starter')
    expect(siteStyles).toContain('.service-package-card--business')
    expect(siteStyles).toContain('.service-package-card--business-plus::before')
    expect(siteStyles).toContain('box-shadow: var(--shadow-os-sm)')
    expect(siteStyles).toContain('box-shadow: var(--shadow-os-coral-sm)')
    const baseCardRule = siteStyles.match(/\.service-package-card\s*\{[^}]*\}/)?.[0] ?? ''
    expect(baseCardRule).not.toContain('background-image')
    expect(baseCardRule).not.toContain('--service-package-art')
  })

  test('uses the shared pixel-grid surface behind the quote content', () => {
    expect(servicesRouteSource).toContain("import { PixelGridGradient } from '@/components/site/pixel-grid-gradient'")
    expect(servicesRouteSource).toContain('<PixelGridGradient')
    expect(servicesRouteSource).toContain('</PixelGridGradient>')
    expect(siteStyles).toContain('.pixel-grid-gradient::before')
    expect(siteStyles).toContain('.pixel-grid-gradient::after')
    expect(siteStyles).toContain('repeating-conic-gradient')
    expect(siteStyles).toContain('linear-gradient(to bottom right, transparent 20%, rgba(0, 0, 0, 0.35) 90%)')
    expect(siteStyles.match(/background-size: 40px 40px/g)).toHaveLength(2)
  })

  test('renders the seven process steps without nested checklists', () => {
    const markup = renderToStaticMarkup(createElement(ServiceProcessSteps))

    expect(markup.match(/STEP \d/g)).toHaveLength(7)
    expect(markup).toContain('Project Discovery')
    expect(markup).toContain('Launch')
    expect(markup).not.toContain('<ul')
    expect(markup.match(/<svg\b/g)).toHaveLength(7)
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('flex items-center gap-3')
    expect(markup).not.toContain('bg-info-muted')
  })

  test('renders terms as closed native disclosures with their details inside', () => {
    const markup = renderToStaticMarkup(createElement(ServiceInfoPanel, { section: SERVICE_TERMS[0] }))

    expect(markup).toContain('<details')
    expect(markup).toContain('<summary')
    expect(markup).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/)
    for (const item of SERVICE_TERMS[0].items) expect(markup).toContain(item)
  })
})
