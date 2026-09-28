import { createFileRoute } from '@tanstack/react-router'

import { getSiteUrl } from '@/lib/seo/site-seo'
import { buildSitemapXml, createSitemapEntries } from '@/server/seo/sitemap'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries = await createSitemapEntries()
        return new Response(buildSitemapXml(getSiteUrl(), entries), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
