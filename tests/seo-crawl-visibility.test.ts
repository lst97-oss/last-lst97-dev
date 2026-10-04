import { describe, expect, test } from 'bun:test'

import sharp from 'sharp'
import { createPageMeta, SITE_OG_IMAGE_PATH } from '../src/lib/seo/site-seo'
import { buildSitemapXml } from '../src/server/seo/sitemap'

const ogFile = Bun.file(new URL(`../public${SITE_OG_IMAGE_PATH}`, import.meta.url))
const contentPagesCss = await Bun.file(new URL('../src/styles/content-pages.css', import.meta.url)).text()
const aboutSource = await Bun.file(new URL('../src/routes/_site.about.tsx', import.meta.url)).text()
const contactSource = await Bun.file(new URL('../src/routes/_site.contact.tsx', import.meta.url)).text()
// The contact blurb is JSX prose, so the formatter is free to wrap it across
// lines; assertions about it read the collapsed form.
const contactSourceFlat = contactSource.replace(/\s+/g, ' ')

/**
 * Regressions from an OpenSEO crawl of the deployed site (site audit,
 * `thin-content` on 5 pages, and an `og:image` no scraper can render).
 *
 * Both findings were invisible to the existing suite: they are properties of
 * the *rendered* document and of static asset bytes, not of a pure function's
 * return value.
 */
describe('social card asset', () => {
  test('the default og:image is a real raster WebP on disk', async () => {
    expect(await ogFile.exists()).toBe(true)
    // RIFF container, with `WEBP` as the four bytes at offset 8. This is the
    // assertion that keeps the card from silently becoming an SVG or a text
    // placeholder — every major scraper rasterises `og:image` and renders
    // anything non-raster blank.
    const head = Buffer.from(await ogFile.slice(0, 12).arrayBuffer())
    expect(head.subarray(0, 4).toString('latin1')).toBe('RIFF')
    expect(head.subarray(8, 12).toString('latin1')).toBe('WEBP')
  })

  test('is not an SVG, which every major scraper renders blank', () => {
    expect(SITE_OG_IMAGE_PATH.endsWith('.svg')).toBe(false)
  })

  test("uses Open Graph's 1200x630 ratio, decoded from the file itself", async () => {
    // Read through sharp rather than a format-specific header: the VP8L header
    // does not sit at fixed offsets the way a PNG IHDR does, so hardcoding byte
    // positions would only re-assert the WebP encoding.
    const { width, height } = await sharp(await ogFile.arrayBuffer()).metadata()
    expect(width).toBe(1200)
    expect(height).toBe(630)
  })

  test('every page head falls back to the card, never the favicon', () => {
    for (const pathname of ['/', '/about', '/services', '/blog', '/projects', '/changelog', '/contact', '/chat']) {
      const { meta } = createPageMeta({ pathname, title: 'Page', description: 'A page.' })
      const image = meta.find((tag) => 'property' in tag && tag.property === 'og:image')
      expect(image).toEqual({ property: 'og:image', content: `http://localhost:3000${SITE_OG_IMAGE_PATH}` })
    }
  })
})

describe('crawler-visible copy', () => {
  test('about renders its bio and expanded panels unconditionally', () => {
    expect(aboutSource).toContain('about-full-bio')
    expect(aboutSource).toContain('about-expanded')
    // No `isMaximized ?` wrapper may guard either block.
    expect(aboutSource).not.toMatch(/isMaximized \? \(\s*<div className="about-full-bio/)
    expect(aboutSource).not.toMatch(/isMaximized \? \(\s*<div className="about-expanded/)
  })

  test('contact renders its expanded panels unconditionally', () => {
    expect(contactSource).toContain('contact-expanded')
    expect(contactSource).not.toMatch(/isMaximized \? \(\s*<div className="contact-expanded/)
  })

  test('contact leads the crawler-visible copy with the assistant, and points quotes at chat', () => {
    // DOM order, not CSS order: the block is rendered unconditionally for
    // crawlers, so the first panel is what a crawler reads first.
    const assistant = contactSource.indexOf('ASK THE ASSISTANT FIRST')
    const inbox = contactSource.indexOf('WHAT HAPPENS NEXT')
    expect(assistant).toBeGreaterThan(-1)
    expect(inbox).toBeGreaterThan(-1)
    expect(assistant).toBeLessThan(inbox)
    // The recommendation is useless below the form: the visitor has already
    // started typing. This pins its position, not just its presence.
    expect(contactSource.indexOf('ASK THE ASSISTANT FIRST')).toBeLessThan(contactSource.indexOf('<ContactMessageForm'))
    expect(contactSource).toContain('to="/chat"')
    expect(contactSourceFlat).toContain('Jev can open a structured quotation request')
    expect(contactSource).toContain('contact-expand-hint')
    // The assistant panel is the replacement for the old "IN A HURRY?" card, not
    // an addition to it: two assistant prompts compete and the assistant is no
    // longer a sidebar tip.
    expect(contactSource).not.toContain('IN A HURRY?')
    expect(contactSource.match(/to="\/chat"/g)).toHaveLength(1)
  })

  test('the hidden blocks stay hidden until the window is maximized', () => {
    // Guards the visual regression: unconditional markup must not mean
    // unconditionally visible.
    expect(contentPagesCss).toMatch(/\.about-full-bio,\s*\.about-expanded,\s*\.contact-expanded \{\s*display: none;/)
    expect(contentPagesCss).toMatch(/\.about-window\.is-maximized \.about-full-bio/)
    expect(contentPagesCss).toMatch(/\.contact-window\.is-maximized \.contact-expanded/)
  })

  test('the expand hints invert, so exactly one of the two states shows', () => {
    expect(contentPagesCss).toMatch(/\.about-window\.is-maximized \.about-expand-hint,[\s\S]*?display: none;/)
    expect(contentPagesCss).toMatch(/\.contact-window\.is-maximized \.contact-expand-hint/)
  })
})

describe('heading order', () => {
  // OpenSEO reported `heading-order-skip` on the index routes: `PageHeading`
  // emits the page `h1`, and the cards below it went straight to `h3`.
  const indexRoutes = [
    '../src/routes/_site.blog.index.tsx',
    '../src/routes/_site.projects.index.tsx',
    '../src/routes/_site.changelog.index.tsx',
    '../src/routes/_site.blog.topics.$slug.tsx',
  ]

  test('every index route renders its cards one level below the page h1', async () => {
    for (const route of indexRoutes) {
      const source = await Bun.file(new URL(route, import.meta.url)).text()
      // No card may fall back to the h3 default on these routes.
      expect(source).toMatch(/<(PostCard|ProjectCard|ChangelogCard)[^>]*headingLevel=\{2\}/)
    }
  })

  test('the card component still defaults to h3 for the home page', async () => {
    const source = await Bun.file(new URL('../src/components/site/content/card.tsx', import.meta.url)).text()
    // Home nests cards under a section h2, so h3 is correct there.
    expect(source).toContain('headingLevel = 3')
    expect(source).toContain("headingLevel === 2 ? 'h2' : 'h3'")
  })
})

describe('sitemap entries resolve', () => {
  test('every entry serialises to an absolute URL under the given origin', () => {
    const xml = buildSitemapXml('https://www.lst97.dev', [
      { path: '/', changefreq: 'weekly', priority: '1.0' },
      { path: '/blog', changefreq: 'daily', priority: '0.8' },
    ])

    expect(xml).toContain('<loc>https://www.lst97.dev</loc>')
    expect(xml).toContain('<loc>https://www.lst97.dev/blog</loc>')
  })
})
