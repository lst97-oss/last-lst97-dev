import { createFileRoute } from '@tanstack/react-router'

import { getSiteUrl } from '@/lib/seo/site-seo'
import { buildHumansTxt } from '@/server/seo/text-files'

export const Route = createFileRoute('/humans.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildHumansTxt(getSiteUrl()), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
