import {
  PixelSkeletonBar,
  PixelSkeletonBlock,
  PixelSkeletonChip,
  PixelSkeletonCover,
  PixelSkeletonLines,
  PixelSkeletonStatus,
  PixelSkeletonWindow,
} from '@/components/ui/skeletons/pixel-skeleton'

/**
 * Detail skeletons mirroring `src/components/site/content/detail-layout.tsx`
 * in exact block order: back link, cover, eyebrow, `h1`, lead, byline, label
 * rows, article body.
 *
 * `badges` and `topics` default to true because both label rows render on most
 * documents; the route passes the flag that matches its own content shape
 * (changelog has badges and no topics, a note has topics and no badges, a
 * project has neither and uses `ProjectDetailSkeleton`).
 */

const PAGE_COLUMN = 'mx-auto flex w-full max-w-6xl flex-col gap-6'

type DetailSkeletonProps = {
  windowTitle: string
  icon: string
  backLabel: string
  badges?: boolean
  topics?: boolean
}

/** The `post-tags` label rows: `my-6` for tags, `-mt-4 mb-6` for the rest. */
function LabelRowSkeleton({ offset }: { offset: boolean }) {
  return (
    <div className={offset ? 'post-tags -mt-4 mb-6' : 'post-tags my-6'}>
      <div className="flex flex-wrap gap-1.5">
        <PixelSkeletonChip />
        <PixelSkeletonChip />
        <PixelSkeletonChip />
        <PixelSkeletonChip />
      </div>
    </div>
  )
}

/** Mirrors `DetailMeta`: a wrapped row of four short byline stubs. */
function DetailMetaSkeleton() {
  return (
    <div className="detail-meta mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
      {Array.from({ length: 4 }, (_, index) => (
        <PixelSkeletonBar key={index} width={40} />
      ))}
    </div>
  )
}

/**
 * The back link, cover, eyebrow, `h1`, lead, and byline preamble both detail
 * pages share, in the order `ContentDetailLayout` renders them.
 */
function DetailPreambleSkeleton({ backLabel, seed }: { backLabel: string; seed: string }) {
  return (
    <>
      <span className="back-link mb-7 inline-block" data-back-label={backLabel}>
        <PixelSkeletonBar width={40} />
      </span>
      <PixelSkeletonCover className="mb-6 aspect-video max-h-105" seed={seed} />
      <div className="m-0 mb-3 flex items-center gap-2">
        <PixelSkeletonBlock className="size-2.5" />
        <PixelSkeletonBar width={55} />
      </div>
      <PixelSkeletonBar className="h-10 w-3/4" />
      <PixelSkeletonLines className="mt-4" count={2} />
      <DetailMetaSkeleton />
    </>
  )
}

export function ContentDetailSkeleton({
  windowTitle,
  icon,
  backLabel,
  badges = true,
  topics = true,
}: DetailSkeletonProps) {
  return (
    <div aria-hidden="true" data-skeleton="content-detail" data-slot="pixel-skeleton">
      <div className={PAGE_COLUMN}>
        <PixelSkeletonWindow icon={icon} title={windowTitle}>
          <DetailPreambleSkeleton backLabel={backLabel} seed={windowTitle} />
          <LabelRowSkeleton offset={false} />
          {badges ? <LabelRowSkeleton offset /> : null}
          {topics ? <LabelRowSkeleton offset /> : null}
          <div className="article-body">
            <PixelSkeletonLines count={6} lastWidth={70} />
          </div>
        </PixelSkeletonWindow>
      </div>
    </div>
  )
}

/**
 * The project page does not use `ContentDetailLayout` — it inlines the same
 * tree and adds lifecycle facts, a technology row, link buttons, and a gallery
 * (`src/routes/_site.projects.$slug.tsx`).
 */
export function ProjectDetailSkeleton({ windowTitle, icon, backLabel }: DetailSkeletonProps) {
  return (
    <div aria-hidden="true" data-skeleton="project-detail" data-slot="pixel-skeleton">
      <div className={PAGE_COLUMN}>
        <PixelSkeletonWindow icon={icon} title={windowTitle}>
          <DetailPreambleSkeleton backLabel={backLabel} seed={windowTitle} />
          <div className="project-detail-meta my-3 flex flex-wrap items-center gap-2">
            <PixelSkeletonStatus />
            <PixelSkeletonBar width={40} />
            <PixelSkeletonBar width={40} />
          </div>
          <div className="post-tags my-6">
            <div className="flex flex-wrap gap-1.5">
              <PixelSkeletonChip />
              <PixelSkeletonChip />
              <PixelSkeletonChip />
              <PixelSkeletonChip />
            </div>
          </div>
          <div className="project-links flex flex-wrap items-center gap-3">
            <PixelSkeletonBlock className="h-10 w-44 border-3 border-border" />
            <PixelSkeletonBlock className="h-10 w-44 border-3 border-border" />
          </div>
          <div className="article-body article-body--wide">
            <PixelSkeletonLines count={6} lastWidth={70} />
          </div>
          <div className="project-gallery mt-8">
            <PixelSkeletonBar className="mb-4 h-7 w-32" width={40} />
            <div className="grid gap-4 sm:grid-cols-2">
              {/* The real tile reserves each image's OWN ratio, which a skeleton
                  cannot know, so 16:9 is the neutral placeholder rather than a
                  prediction of the loaded box. */}
              <PixelSkeletonCover className="aspect-video" seed={`${windowTitle}-gallery-0`} />
              <PixelSkeletonCover className="aspect-video" seed={`${windowTitle}-gallery-1`} />
            </div>
          </div>
        </PixelSkeletonWindow>
      </div>
    </div>
  )
}
