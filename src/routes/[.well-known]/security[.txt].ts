import { createFileRoute } from '@tanstack/react-router'

import { getSiteUrl } from '@/lib/seo/site-seo'
import { buildSecurityTxt } from '@/server/seo/text-files'

// The `.well-known` segment is bracket-wrapped: the route generator skips any
// directory starting with a dot, so a literal `.well-known` directory would
// never be discovered.
export const Route = createFileRoute('/.well-known/security.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSecurityTxt(getSiteUrl()), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
