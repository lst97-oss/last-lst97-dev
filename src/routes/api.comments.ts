import { createFileRoute } from '@tanstack/react-router'

import { commentsProxyHandler } from '../server/comments/proxy-runtime'

// The comment widget's collection endpoint, forwarded to the comments service
// with the host's key. Only the routes in src/server/comments/proxy.ts pass through.
export const Route = createFileRoute('/api/comments')({
  server: {
    handlers: {
      GET: commentsProxyHandler,
      POST: commentsProxyHandler,
    },
  },
})
