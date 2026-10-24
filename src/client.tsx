import { StartClient } from '@tanstack/react-start/client'
import { initBotId } from 'botid/client/core'
import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

/**
 * `true` only for a build that runs on Vercel. See `vite.config.ts`: the
 * BotID challenge script is served by Vercel, so a local build must not ask
 * the browser for it.
 */
declare const __VERCEL_RUNTIME__: boolean | undefined

/**
 * Vercel BotID client protection.
 *
 * The challenge headers only reach the protected routes listed here, so this
 * list and the server-side `checkBotId()` calls must agree: `/api/site/chat`,
 * `/api/site/contact` and the comment-create proxy (`/api/site/comments`) are
 * the endpoints that spend model calls or publish content. A route declared
 * here but not checked on the server only adds latency; a route checked on the
 * server but not declared here is rejected as a bot.
 *
 * This file replaces TanStack Start's default client entry, which it mirrors
 * exactly apart from the `initBotId()` call.
 */
if (typeof __VERCEL_RUNTIME__ === 'boolean' && __VERCEL_RUNTIME__) {
  initBotId({
    protect: [
      { path: '/api/site/chat', method: 'POST' },
      { path: '/api/site/contact', method: 'POST' },
      { path: '/api/site/comments/api/comments', method: 'POST' },
    ],
  })
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
