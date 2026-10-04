/**
 * Page numbers to render around the current page: always the first and last,
 * plus a sliding window around the current page, with `null` marking a gap.
 *
 * Shared by the route-based listings (`ContentPagination`) and the home page's
 * featured-project window, which paginates in place rather than by route. They
 * must show the same window and the same gap markers, so this lives in its own
 * module rather than being exported from a component file.
 */
export function visiblePages(current: number, total: number): (number | null)[] {
  const pages = new Set<number>([1, total])
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page >= 1 && page <= total) pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | null)[] = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push(null)
    result.push(page)
    previous = page
  }
  return result
}
