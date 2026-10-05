import { PostCard, ProjectCard } from '@/components/site/content/card'
import { CardGrid, Eyebrow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { PostSummary, ProjectSummary } from '@/server/content/types'

/**
 * The "You may also want to know" block that closes a project or note detail page.
 *
 * Only one renders per page, so the heading id is fixed rather than generated.
 *
 * Cards are NOT `featured`; see `ProjectCard`'s `priority` doc.
 */
export function RelatedContent({
  items,
  kind,
}: {
  /** Same-type entries, already ranked; never contains the current document. */
  items: (ProjectSummary | PostSummary)[]
  kind: 'project' | 'post'
}) {
  // Omitted rather than stubbed: an empty "You may also want to know" heading
  // promises onward reading the page cannot offer.
  if (items.length === 0) return null

  return (
    <section aria-labelledby="related-content-title" className="related-content mt-14 border-t-3 border-border pt-10">
      <Eyebrow>
        <PixelIcon glyph="◇" /> YOU MAY ALSO WANT TO KNOW
      </Eyebrow>
      <h2 className="mb-6" id="related-content-title">
        {kind === 'project' ? 'Related projects.' : 'Related notes.'}
      </h2>
      <CardGrid>
        {items.map((item) =>
          kind === 'project' ? (
            <ProjectCard headingLevel={2} key={item.slug} project={item as ProjectSummary} />
          ) : (
            <PostCard headingLevel={2} key={item.slug} post={item as PostSummary} />
          ),
        )}
      </CardGrid>
    </section>
  )
}
