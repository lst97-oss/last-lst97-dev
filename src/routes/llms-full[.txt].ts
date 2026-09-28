import { createFileRoute } from '@tanstack/react-router'

import { getSiteUrl } from '@/lib/seo/site-seo'
import { buildLlmsFullTxt } from '@/server/seo/text-files'

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildLlmsFullTxt(getSiteUrl()), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
