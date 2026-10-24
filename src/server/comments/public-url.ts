import { getServerEnv } from '../env'

export type CommentedCollection = 'posts' | 'projects' | 'changelogs'

// Public route segment for each collection. Must match the routes the site
// renders (`/blog/$slug`, `/projects/$slug`, `/changelog/$slug`).
const ROUTE_SEGMENT: Record<CommentedCollection, string> = {
  posts: 'blog',
  projects: 'projects',
  changelogs: 'changelog',
}

// The page's canonical URL, built exactly as the site builds it (`canonicalUrl`
// in src/lib/seo/site-seo.ts), so the thread URL and the widget's pageUrl agree.
export function contentPageUrl(origin: string, collection: CommentedCollection, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/${ROUTE_SEGMENT[collection]}/${slug}`
}

export function readSiteOrigin(): string | null {
  return getServerEnv().PUBLIC_SITE_URL ?? null
}
