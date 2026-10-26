import { createFileRoute } from '@tanstack/react-router'

import { commentsProxyHandler } from '../server/comments/proxy-runtime'

// The widget's guest session probe. The proxy answers null so a visitor never
// receives a last-comments session cookie from this host.
export const Route = createFileRoute('/api/auth/get-session')({
  server: {
    handlers: {
      GET: commentsProxyHandler,
    },
  },
})
