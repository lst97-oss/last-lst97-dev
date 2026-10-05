import { ChangelogCard } from '@/components/site/content/card'
import { Eyebrow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { ChangelogSummary } from '@/server/content/types'

/**
 * Previous/next release navigation closing a changelog entry.
 *
 * Changelogs have no topics relation at all (`changelogs_rels` has no columns),
 * so these are positional neighbours in the archive's `-publishedAt` order
 * rather than a relevance ranking. `previous` is the older release.
 * Each neighbour takes its own column, so a lone neighbour spans the full
 * width rather than sitting in a half-width grid beside an empty slot.
 */
export function ChangelogNeighbours({
  previous,
  next,
}: {
  previous: ChangelogSummary | null
  next: ChangelogSummary | null
}) {
  if (!previous && !next) return null

  return (
    <section aria-labelledby="changelog-neighbours-title" className="mt-14 border-t-3 border-border pt-10">
      <Eyebrow>
        <PixelIcon glyph="↻" /> KEEP READING
      </Eyebrow>
      <h2 className="mb-6" id="changelog-neighbours-title">
        Other releases.
      </h2>
      {previous && next ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="min-w-0">
            <ChangelogCard entry={previous} headingLevel={2} />
          </div>
          <div className="min-w-0">
            <ChangelogCard entry={next} headingLevel={2} />
          </div>
        </div>
      ) : (
        <ChangelogCard entry={(previous ?? next) as ChangelogSummary} headingLevel={2} />
      )}
    </section>
  )
}
