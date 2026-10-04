import { cn } from 'cn'

import { visiblePages } from '@/components/site/content/visible-pages'

/**
 * Builds a query string for `page`, preserving every other current search
 * param. Page 1 omits the param so the first page keeps a clean canonical URL.
 */
function searchForPage(search: Record<string, unknown>, page: number): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (key === 'page' || value === undefined || value === null) continue
    params.set(key, String(value))
  }
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `?${query}` : ''
}

/**
 * Matches `pixelButtonVariants` in os-ui.tsx: 3px hard border, hard offset
 * shadow that collapses on press, uppercase monospace label.
 */
const pageClass =
  'inline-flex size-10 items-center justify-center border-3 border-border bg-card font-black tracking-wider text-foreground uppercase shadow-os-sm transition-all duration-100 ease-out hover:not-disabled:translate-x-0.5 hover:not-disabled:translate-y-0.5 hover:not-disabled:bg-accent hover:not-disabled:shadow-os-xs'

const activePageClass = 'bg-primary text-primary-foreground shadow-os-xs'

const disabledPageClass = 'pointer-events-none opacity-40'

/**
 * Pixel-art pagination for the blog, project, and changelog listings. Page
 * links are real anchors so the paginated URLs stay crawlable.
 */
export function ContentPagination({
  current,
  totalPages,
  search,
  basePath,
  label = 'Pagination',
}: {
  current: number
  totalPages: number
  /** Current route search params, preserved across page changes. */
  search: Record<string, unknown>
  basePath: string
  label?: string
}) {
  if (totalPages <= 1) return null

  const hrefFor = (page: number) => `${basePath}${searchForPage(search, page)}`
  const atFirst = current <= 1
  const atLast = current >= totalPages

  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <a
        aria-disabled={atFirst || undefined}
        aria-label="Previous page"
        className={cn(pageClass, atFirst && disabledPageClass)}
        href={hrefFor(Math.max(current - 1, 1))}
      >
        ←
      </a>

      {visiblePages(current, totalPages).map((page, index) =>
        page === null ? (
          <span aria-hidden className="px-1 font-black text-muted-foreground" key={`gap-${index}`}>
            …
          </span>
        ) : (
          <a
            aria-current={page === current ? 'page' : undefined}
            aria-label={`Go to page ${page}`}
            className={cn(pageClass, page === current && activePageClass)}
            href={hrefFor(page)}
            key={page}
          >
            {page}
          </a>
        ),
      )}

      <a
        aria-disabled={atLast || undefined}
        aria-label="Next page"
        className={cn(pageClass, atLast && disabledPageClass)}
        href={hrefFor(Math.min(current + 1, totalPages))}
      >
        →
      </a>
    </nav>
  )
}
