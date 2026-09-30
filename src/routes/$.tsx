import { createFileRoute, notFound } from '@tanstack/react-router'

import { NotFoundPage } from '@/components/site/not-found-page'
import { clampDescription, SITE_NAME } from '@/lib/seo/site-seo'

const NOT_FOUND_DESCRIPTION =
  'The requested path does not exist on this system. Return to the desktop, browse the projects, or read the changelog.'

/**
 * Catch-all for any path no other route matches. Static routes always outrank
 * the splat, so this only sees genuinely unmatched URLs.
 *
 * It exists to give the 404 a real document head. `notFoundComponent` has no
 * `head` hook, so a page rendered by that boundary alone inherits the generic
 * root title. This route owns a `head`, and declaring `notFoundComponent` on
 * itself makes it the not-found boundary for these URLs
 * (`getNotFoundBoundary` walks up from the throwing match and stops at the
 * first route carrying a `notFoundComponent`).
 *
 * That boundary placement is what makes the head apply. The router cuts the
 * render lane at the boundary match but *includes* it
 * (`_getAssetMatches`: `end = index + 1`), and `projectLane` evaluates a
 * match's `head()` before breaking on `_notFound`. Declaring the component on
 * the splat keeps the meta in the lane; letting the boundary fall through to
 * the root instead drops this match and the meta with it.
 *
 * The loader throws `notFound()` rather than rendering, so the request resolves
 * to HTTP 404 — a splat that merely rendered would answer 200 and tell crawlers
 * every bad URL is a valid page. `setResponseStatus` is deliberately not used:
 * the response status comes from the router's server load result
 * (`getSsrStatus` → `router._serverResult.status`), not the H3 event.
 *
 * `createPageMeta` is deliberately NOT used: it always emits a `canonical` and
 * `og:url`, and a canonical pointing at the missing URL is a hint to de-index
 * the wrong page. A 404 carries `noindex` and no canonical.
 */
export const Route = createFileRoute('/$')({
  loader: () => {
    throw notFound()
  },
  head: () => ({
    meta: [
      { title: `404 — ${SITE_NAME}` },
      { name: 'description', content: clampDescription(NOT_FOUND_DESCRIPTION) },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  notFoundComponent: () => <NotFoundPage />,
})
