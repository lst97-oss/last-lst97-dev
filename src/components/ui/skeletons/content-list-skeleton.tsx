import {
  ChangelogCardSkeleton,
  PostCardSkeleton,
  ProjectCardSkeleton,
} from '@/components/ui/skeletons/content-card-skeleton'
import {
  PixelSkeletonBadge,
  PixelSkeletonBar,
  PixelSkeletonBlock,
  PixelSkeletonChip,
  PixelSkeletonLines,
  PixelSkeletonWindow,
} from '@/components/ui/skeletons/pixel-skeleton'

const PAGE_COLUMN = 'mx-auto flex w-full max-w-6xl flex-col gap-6'

/** `CardGrid`'s class string without `.card-masonry`: the masonry row-span
 *  measurement is meaningless before the cards have their real heights. */
const CARD_GRID = 'grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3'

/**
 * Each stub mirrors one real component so the pending state does not jump when
 * it arrives: `PageHeading` (plus its `page-heading` margin from
 * content-pages.css), `ContentPagination`'s control row (two arrows, page
 * squares, gap marker — stubbed on every list because `totalPages` is unknown
 * while pending, and a plain `div` rather than a `nav` because an unlabelled
 * landmark with nothing to navigate to is an accessibility defect), and
 * `ListFilters` (search box, narrower topic filter box, chip row).
 */
function ListHeadingSkeleton() {
  return (
    <div className="page-heading mb-7 flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <PixelSkeletonBar className="mb-3 h-3 w-40" width={40} />
        <PixelSkeletonBar className="h-12 w-3/4" />
        <PixelSkeletonLines className="mt-4" count={2} />
      </div>
      <PixelSkeletonBadge />
    </div>
  )
}

function PixelSkeletonPagination() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {['arrow-prev', 'page-1', 'page-2', 'page-3', 'gap', 'page-4', 'arrow-next'].map((slot) =>
        slot === 'gap' ? (
          <PixelSkeletonBar aria-hidden="true" className="h-3 w-4" key={slot} />
        ) : (
          <PixelSkeletonBlock
            aria-hidden="true"
            className="size-10 border-3 border-border"
            data-pagination-slot={slot}
            key={slot}
          />
        ),
      )}
    </div>
  )
}

function ListFiltersSkeleton() {
  return (
    <div className="list-filters mb-6 flex flex-col gap-4">
      <PixelSkeletonBar className="h-10 w-full max-w-104" />
      <PixelSkeletonBar className="h-10 w-80" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <PixelSkeletonChip className="h-6 w-24" key={index} />
        ))}
      </div>
    </div>
  )
}

export function BlogListSkeleton() {
  return (
    <div aria-hidden="true" data-skeleton="blog-list" data-slot="pixel-skeleton">
      <div className={PAGE_COLUMN}>
        <PixelSkeletonWindow icon="✎" title="notes.directory">
          <ListHeadingSkeleton />
          <ListFiltersSkeleton />
          <div className={CARD_GRID}>
            {Array.from({ length: 9 }, (_, index) => (
              <PostCardSkeleton index={index} key={index} />
            ))}
          </div>
          <PixelSkeletonPagination />
        </PixelSkeletonWindow>
      </div>
    </div>
  )
}

export function ProjectListSkeleton() {
  return (
    <div aria-hidden="true" data-skeleton="project-list" data-slot="pixel-skeleton">
      <div className={PAGE_COLUMN}>
        <PixelSkeletonWindow icon="▤" title="projects.archive">
          <ListHeadingSkeleton />
          <ListFiltersSkeleton />
          <div className={CARD_GRID}>
            {Array.from({ length: 9 }, (_, index) => (
              <ProjectCardSkeleton index={index} key={index} />
            ))}
          </div>
          <PixelSkeletonPagination />
        </PixelSkeletonWindow>
      </div>
    </div>
  )
}

export function ChangelogListSkeleton() {
  return (
    <div aria-hidden="true" data-skeleton="changelog-list" data-slot="pixel-skeleton">
      <div className={PAGE_COLUMN}>
        <PixelSkeletonWindow icon="↻" title="changelog.log">
          <ListHeadingSkeleton />
          <div className={CARD_GRID}>
            {Array.from({ length: 9 }, (_, index) => (
              <ChangelogCardSkeleton index={index} key={index} />
            ))}
          </div>
          <PixelSkeletonPagination />
        </PixelSkeletonWindow>
      </div>
    </div>
  )
}
