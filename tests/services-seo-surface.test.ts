import { describe, expect, test } from 'bun:test'

import { createServicesStructuredData } from '../src/lib/content/structured-data'
import { createOgImagePath, createPageMeta } from '../src/lib/seo/site-seo'
import { createSitemapEntries } from '../src/server/seo/sitemap'
import { buildLlmsTxt } from '../src/server/seo/text-files'

const routeSource = await Bun.file(new URL('../src/routes/_site.services.tsx', import.meta.url)).text()

const rejectAsServerFn = () => Promise.reject(new Error('no CMS in this test'))

// The collections are always queried and their failures swallowed by
// `Promise.allSettled`, so the stubs reject rather than throw: the assertion is
// about the static list, not about the CMS being reachable. The casts are the
// server-function wrapper shape; the bodies are never invoked by the assertions.
const unreachableLoaders = {
  listPosts: rejectAsServerFn,
  listProjects: rejectAsServerFn,
  listChangelogs: rejectAsServerFn,
  listTopics: rejectAsServerFn,
} as unknown as Parameters<typeof createSitemapEntries>[0]

describe('sitemap advertises the page', () => {
  test('a static entry exists for /services', async () => {
    const entries = await createSitemapEntries(unreachableLoaders)
    const services = entries.find((entry) => entry.path === '/services')
    expect(services).toBeDefined()
  })
})

describe('llms.txt links the page', () => {
  test('the Services entry resolves on the canonical origin', () => {
    expect(buildLlmsTxt('https://example.com')).toContain('[Services](https://example.com/services)')
  })
})

describe('page metadata', () => {
  test('the canonical and social card match the public path, not the route id', () => {
    const { links, meta } = createPageMeta({
      pathname: '/services',
      title: 'Website Services',
      description: 'Packages from A$1,000.',
    })

    expect(links).toContainEqual({ rel: 'canonical', href: 'http://localhost:3000/services' })
    expect(meta).toContainEqual({ property: 'og:url', content: 'http://localhost:3000/services' })
    expect(meta).toContainEqual({
      property: 'og:image',
      content: `http://localhost:3000${createOgImagePath('Website Services', 'Packages from A$1,000.')}`,
    })
  })

  test('the route passes /services to createPageMeta', () => {
    // The public path, not `/_site/services`: `canonicalUrl` builds the canonical
    // and og:url straight from it.
    expect(routeSource).toContain("pathname: '/services'")
    expect(routeSource).toContain('createServicesStructuredData()')
  })

  test('the description is short enough for a search snippet', () => {
    const description = routeSource.match(/description:\s*\n?\s*'([^']+)'/)?.[1]
    expect(description).toBeDefined()
    // createPageMeta clamps at 200; a longer string would be silently truncated.
    expect(description!.length).toBeLessThanOrEqual(200)
  })
})

describe('structured data exposes the priced packages', () => {
  test('one graph carries the Service, its three Offers and the breadcrumb trail', () => {
    const data = createServicesStructuredData()
    const graph = data['@graph'] as Record<string, unknown>[]

    const service = graph.find((node) => node['@type'] === 'Service')
    expect(service).toBeDefined()
    expect(service!.url).toBe('http://localhost:3000/services')

    const catalog = service!.hasOfferCatalog as { itemListElement: Record<string, unknown>[] }
    expect(catalog.itemListElement.map((offer) => offer.price)).toEqual([1000, 2200, 3500])
    for (const offer of catalog.itemListElement) expect(offer.priceCurrency).toBe('AUD')

    const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList')
    const trail = crumbs!.itemListElement as Record<string, unknown>[]
    expect(trail).toHaveLength(2)
    expect(trail[0].item).toBe('http://localhost:3000/')
    // The last crumb is the current page, so it carries no item URL.
    expect(trail[1].item).toBeUndefined()
  })
})
