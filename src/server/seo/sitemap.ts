import {
  listChangelogsServerFn,
  listPostsServerFn,
  listProjectsServerFn,
  listTopicsServerFn,
} from '../content/server-functions'

interface SitemapEntry {
  path: string
  lastmod?: string | null
  changefreq: string
  priority: string
}

function toDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10)
}

export function buildSitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const location = `${siteUrl}${entry.path === '/' ? '' : entry.path}`
      const parts = [`    <loc>${escapeXml(location)}</loc>`]
      if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`)
      parts.push(`    <changefreq>${entry.changefreq}</changefreq>`)
      parts.push(`    <priority>${entry.priority}</priority>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Static routes always present in the sitemap. Content routes are appended by
 * `createSitemapEntries` from live CMS data.
 */
const STATIC_ENTRIES: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/services', changefreq: 'monthly', priority: '0.8' },
  { path: '/projects', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/changelog', changefreq: 'weekly', priority: '0.7' },
  { path: '/contact', changefreq: 'yearly', priority: '0.5' },
]

/**
 * Builds the full sitemap entry list. CMS loaders are passed in so this stays
 * testable without a database, and a failing collection degrades to a sitemap
 * containing just the static routes rather than a 500.
 */
export async function createSitemapEntries(
  loaders: {
    listPosts: typeof listPostsServerFn
    listProjects: typeof listProjectsServerFn
    listChangelogs: typeof listChangelogsServerFn
    listTopics?: typeof listTopicsServerFn
  } = {
    listPosts: listPostsServerFn,
    listProjects: listProjectsServerFn,
    listChangelogs: listChangelogsServerFn,
    listTopics: listTopicsServerFn,
  },
): Promise<SitemapEntry[]> {
  const [posts, projects, changelogs] = await Promise.allSettled([
    loaders.listPosts({ data: { limit: 50 } }),
    loaders.listProjects(),
    loaders.listChangelogs({ data: { limit: 50 } }),
  ])
  const topics = await Promise.resolve()
    .then(() => loaders.listTopics?.() ?? [])
    .then((value) => ({ status: 'fulfilled' as const, value }))
    .catch(() => ({ status: 'rejected' as const }))

  const entries = [...STATIC_ENTRIES]

  if (posts.status === 'fulfilled') {
    for (const post of posts.value.items) {
      entries.push({
        path: `/blog/${post.slug}`,
        lastmod: toDate(post.publishedAt),
        changefreq: 'monthly',
        priority: '0.6',
      })
    }
  }

  if (topics.status === 'fulfilled') {
    for (const topic of topics.value) {
      entries.push({ path: `/blog/topics/${topic.slug}`, changefreq: 'weekly', priority: '0.5' })
    }
  }

  if (projects.status === 'fulfilled') {
    for (const project of projects.value) {
      entries.push({
        path: `/projects/${project.slug}`,
        lastmod: toDate(project.endDate ?? project.startDate),
        changefreq: 'monthly',
        priority: '0.7',
      })
    }
  }

  if (changelogs.status === 'fulfilled') {
    for (const entry of changelogs.value.items) {
      entries.push({
        path: `/changelog/${entry.slug}`,
        lastmod: toDate(entry.publishedAt),
        changefreq: 'yearly',
        priority: '0.4',
      })
    }
  }

  return entries
}
