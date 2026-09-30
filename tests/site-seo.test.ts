import { describe, expect, test } from 'bun:test'

import {
  absoluteUrl,
  canonicalUrl,
  clampDescription,
  createPageMeta,
  createSiteStructuredData,
  getSiteUrl,
} from '../src/lib/seo/site-seo'
import { buildRobotsTxt, buildSecurityTxt, buildLlmsTxt, BLOCKED_BOT_AGENTS } from '../src/server/seo/text-files'
import { buildSitemapXml } from '../src/server/seo/sitemap'


const viteConfigSource = await Bun.file(new URL('../vite.config.ts', import.meta.url)).text()
const siteSeoSource = await Bun.file(new URL('../src/lib/seo/site-seo.ts', import.meta.url)).text()

describe('site url resolution', () => {
  test('falls back to localhost when no origin is injected', () => {
    // The test runner has no Vite `define`, so this exercises the fallback.
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  test('leaves absolute image URLs untouched and absolutises relative ones', () => {
    expect(absoluteUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
    expect(absoluteUrl('/media/a.png')).toBe('http://localhost:3000/media/a.png')
    expect(absoluteUrl(null)).toBeNull()
    expect(absoluteUrl('   ')).toBeNull()
  })

  test('builds a canonical without a double slash for the root path', () => {
    expect(canonicalUrl('/')).toBe('http://localhost:3000/')
    expect(canonicalUrl('/blog/post')).toBe('http://localhost:3000/blog/post')
    expect(canonicalUrl('/blog/post/')).toBe('http://localhost:3000/blog/post')
  })
})

describe('canonical origin build wiring', () => {
  // getSiteUrl() reads a Vite `define`, not process.env, because route head()
  // also runs in the client bundle. If the define is dropped or renamed, the
  // identifier is left as a bare global: every canonical, og:url, sitemap
  // entry and robots.txt absolute URL silently falls back to localhost, and
  // only a production deploy reveals it. These read the config directly.
  test('injects PUBLIC_SITE_URL as the identifier site-seo.ts reads', () => {
    expect(viteConfigSource).toMatch(/__LAST_OS_SITE_URL__\s*:[^,]*JSON\.stringify\(\s*process\.env\.PUBLIC_SITE_URL/)
  })

  test('declares the same identifier site-seo.ts consumes', () => {
    expect(siteSeoSource).toContain('declare const __LAST_OS_SITE_URL__')
  })
})

describe('page meta', () => {
  test('emits a full social card and a matching canonical', () => {
    const { links, meta } = createPageMeta({
      pathname: '/about',
      title: 'About',
      description: 'Who built this and why.',
    })

    expect(meta).toContainEqual({ title: 'About — LAST//OS' })
    expect(meta).toContainEqual({ name: 'description', content: 'Who built this and why.' })
    expect(meta).toContainEqual({ property: 'og:url', content: 'http://localhost:3000/about' })
    expect(meta).toContainEqual({ property: 'og:site_name', content: 'LAST//OS' })
    expect(meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
    // Falls back to the site icon so every page has a shareable image.
    expect(meta).toContainEqual({ property: 'og:image', content: 'http://localhost:3000/favicon/favicon.svg' })
    expect(links).toEqual([{ rel: 'canonical', href: 'http://localhost:3000/about' }])
  })

  test('does not double-suffix a title that already carries the site name', () => {
    const { meta } = createPageMeta({
      pathname: '/',
      title: 'LAST//OS — Personal system online',
      description: 'Home.',
    })

    expect(meta[0]).toEqual({ title: 'LAST//OS — Personal system online' })
  })

  test('marks a page noindex without touching the social tags', () => {
    const { meta } = createPageMeta({
      pathname: '/chat',
      title: 'Chat',
      description: 'A session.',
      noindex: true,
    })

    expect(meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow' })
    expect(meta).toContainEqual({ property: 'og:type', content: 'website' })
  })

  test('adds article dates and tags only for article pages', () => {
    const article = createPageMeta({
      pathname: '/blog/post',
      title: 'Post',
      description: 'A post.',
      type: 'article',
      publishedTime: '2026-09-20T00:00:00.000Z',
      modifiedTime: '2026-09-21T00:00:00.000Z',
      tags: ['react'],
    })

    expect(article.meta).toContainEqual({ property: 'article:published_time', content: '2026-09-20T00:00:00.000Z' })
    expect(article.meta).toContainEqual({ property: 'article:modified_time', content: '2026-09-21T00:00:00.000Z' })
    expect(article.meta).toContainEqual({ property: 'article:tag', content: 'react' })

    const website = createPageMeta({
      pathname: '/projects',
      title: 'Projects',
      description: 'Archive.',
      publishedTime: '2026-09-20T00:00:00.000Z',
      tags: ['react'],
    })

    expect(website.meta.some((entry) => 'property' in entry && entry.property?.startsWith('article:'))).toBe(false)
  })

  test('serialises structured data as a JSON-LD script and escapes angle brackets', () => {
    const { scripts } = createPageMeta({
      pathname: '/about',
      title: 'About',
      description: 'Who.',
      structuredData: { '@type': 'ProfilePage', name: '</script><img>' },
    })

    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.type).toBe('application/ld+json')
    const children = scripts[0]?.children as string
    expect(children).not.toContain('</script>')
    expect(JSON.parse(children)).toEqual({ '@type': 'ProfilePage', name: '</script><img>' })
  })

  test('omits the script entirely when there is no structured data', () => {
    const { scripts } = createPageMeta({ pathname: '/', title: 'Home', description: 'Home.' })
    expect(scripts).toEqual([])
  })
})

describe('description clamping', () => {
  test('leaves short descriptions untouched', () => {
    expect(clampDescription('Short and sweet.')).toBe('Short and sweet.')
  })

  test('cuts long descriptions on a word boundary', () => {
    const clamped = clampDescription('word '.repeat(80))
    expect(clamped.length).toBeLessThanOrEqual(201)
    expect(clamped.endsWith('…')).toBe(true)
    expect(clamped).not.toContain('  ')
  })

  test('collapses whitespace so meta content stays single-line', () => {
    expect(clampDescription('a\n\n  b\tc')).toBe('a b c')
  })
})

describe('site structured data', () => {
  test('declares a WebSite node bound to the canonical origin', () => {
    const graph = createSiteStructuredData()
    const website = graph['@graph'].find((node) => node['@type'] === 'WebSite')

    expect(website?.url).toBe('http://localhost:3000/')
    expect(website?.publisher).toEqual({ '@id': 'http://localhost:3000/#person' })
  })
})

describe('robots.txt', () => {
  const robots = buildRobotsTxt('https://example.com')

  test('disallows scrapers and bot scripts but not search engines', () => {
    expect(robots).toContain('User-agent: AhrefsBot\nDisallow: /')
    expect(robots).toContain('User-agent: curl\nDisallow: /')
    // Search engines and AI assistants stay welcome per owner policy.
    expect(robots).not.toContain('User-agent: Googlebot')
    expect(robots).not.toContain('User-agent: GPTBot')
    expect(robots).toContain('User-agent: *\nAllow: /')
  })

  test('keeps the admin, api and chat paths out of the index', () => {
    expect(robots).toContain('Disallow: /admin')
    expect(robots).toContain('Disallow: /api')
    expect(robots).toContain('Disallow: /chat')
  })

  test('advertises the sitemap on the canonical origin', () => {
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  test('lists every blocked agent exactly once', () => {
    for (const agent of BLOCKED_BOT_AGENTS) {
      expect(robots.split(`User-agent: ${agent}\n`)).toHaveLength(2)
    }
  })
})

describe('security.txt', () => {
  const security = buildSecurityTxt('https://example.com')

  test('exposes the reporting address as a mailto contact', () => {
    expect(security).toContain('Contact: mailto:laisiotou1997@gmail.com')
  })

  test('carries a valid unexpired Expires field', () => {
    const expires = security.match(/^Expires: (.+)$/m)?.[1]
    expect(expires).toBeDefined()
    expect(Number.isNaN(new Date(expires as string).getTime())).toBe(false)
    expect(new Date(expires as string).getTime()).toBeGreaterThan(Date.now())
  })

  test('points at the canonical well-known URL', () => {
    expect(security).toContain('Canonical: https://example.com/.well-known/security.txt')
  })
})

describe('llms.txt', () => {
  const llms = buildLlmsTxt('https://example.com')

  test('states the content policy and where to report abuse', () => {
    expect(llms).toContain('## Content policy')
    expect(llms).toContain('laisiotou1997@gmail.com')
  })

  test('links the indexable pages on the canonical origin', () => {
    expect(llms).toContain('[Projects](https://example.com/projects)')
    expect(llms).toContain('[Blog](https://example.com/blog)')
  })

  test('mentions the chat page while keeping it out of the crawlable surface', () => {
    expect(llms).toContain('[Chat](https://example.com/chat)')
    expect(llms).toContain('excluded from the crawlable sitemap')
    // The description must not imply /chat is indexable.
    expect(buildRobotsTxt('https://example.com')).toContain('/chat')
  })
})

describe('sitemap.xml', () => {
  const xml = buildSitemapXml('https://example.com', [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/blog/post', lastmod: '2026-09-20', changefreq: 'monthly', priority: '0.6' },
  ])

  test('emits one url entry per route with the root un-suffixed', () => {
    expect(xml).toContain('<loc>https://example.com</loc>')
    expect(xml).toContain('<loc>https://example.com/blog/post</loc>')
    expect(xml).toContain('<lastmod>2026-09-20</lastmod>')
    expect(xml.match(/<url>/g)).toHaveLength(2)
  })

  test('escapes XML-significant characters in locations', () => {
    const escaped = buildSitemapXml('https://example.com', [
      { path: '/blog/a&b<c>', changefreq: 'monthly', priority: '0.5' },
    ])
    expect(escaped).toContain('a&amp;b&lt;c&gt;')
  })
})
