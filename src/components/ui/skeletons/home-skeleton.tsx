import { PostCardSkeleton, ProjectCardSkeleton } from '@/components/ui/skeletons/content-card-skeleton'
import {
  PixelSkeletonBar,
  PixelSkeletonBlock,
  PixelSkeletonCover,
  PixelSkeletonLines,
  PixelSkeletonWindow,
} from '@/components/ui/skeletons/pixel-skeleton'

/**
 * The home page skeleton, mirroring `src/routes/_site.index.tsx` section by
 * section. Every home section is a Payload-backed window, so the whole page is
 * pending on one loader — there is no static content worth showing early.
 *
 * The `welcome-expanded` marketing block inside the hero window is omitted: it
 * is static copy with no loader behind it, so it would flash in and then be
 * replaced by identical content.
 */

const PAGE_COLUMN = 'mx-auto flex w-full max-w-6xl flex-col gap-6'

/** Mirrors the hero's left column: eyebrow, two-line `h1`, copy, two buttons. */
function HeroCopySkeleton() {
  return (
    <div>
      <div className="m-0 mb-3 flex items-center gap-2">
        <PixelSkeletonBlock className="size-2.5" />
        <PixelSkeletonBar width={40} />
      </div>
      <PixelSkeletonBar className="h-14 w-4/5" />
      <PixelSkeletonLines className="mt-4" count={3} lastWidth={70} />
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <PixelSkeletonBlock className="h-10 w-44 border-3 border-border" />
        <PixelSkeletonBlock className="h-10 w-52 border-3 border-border" />
      </div>
    </div>
  )
}

/** Mirrors the hero's right column: the avatar and the status terminal. */
function HeroTerminalSkeleton() {
  return (
    <div className="hero-terminal-col flex min-w-0 flex-col items-center lg:col-span-2">
      <PixelSkeletonBlock className="mb-3.5 size-45 rounded-full border-4 border-border" />
      <PixelSkeletonBlock className="box-border min-h-56 w-full border-3 border-border" />
    </div>
  )
}

/** The avatar tile, name, and bio lines of the operator profile window. */
function OperatorProfileSkeleton() {
  return (
    <div className="profile-panel flex h-full flex-col">
      <div className="profile-identity grid justify-items-start gap-5">
        <PixelSkeletonBlock className="size-22 border-3 border-border" />
        <div>
          <div className="m-0 mb-3 flex items-center gap-2">
            <PixelSkeletonBlock className="size-2.5" />
            <PixelSkeletonBar width={40} />
          </div>
          <PixelSkeletonBar className="h-7 w-28" />
          <PixelSkeletonLines className="mt-3" count={2} />
        </div>
      </div>
      <PixelSkeletonLines count={4} lastWidth={70} />
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div aria-hidden="true" data-skeleton="home" data-slot="pixel-skeleton">
      <div className={PAGE_COLUMN}>
        <PixelSkeletonWindow icon="◆" title="welcome.exe">
          <div className="hero-grid grid items-center gap-7 lg:grid-cols-5 lg:gap-20">
            <div className="lg:col-span-3">
              <HeroCopySkeleton />
            </div>
            <HeroTerminalSkeleton />
          </div>
        </PixelSkeletonWindow>

        <div className="dashboard-grid grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PixelSkeletonWindow icon="▤" title="featured-project.app">
              <ProjectCardSkeleton featured index={0} />
            </PixelSkeletonWindow>
          </div>
          <div className="lg:col-span-2">
            <PixelSkeletonWindow icon="☺" title="operator.profile">
              <OperatorProfileSkeleton />
            </PixelSkeletonWindow>
          </div>
        </div>

        <PixelSkeletonWindow icon="✎" title="featured-note.exe">
          <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
            <PixelSkeletonCover className="aspect-video" seed="home-featured-note" />
            <div>
              <div className="m-0 mb-3 flex items-center gap-2">
                <PixelSkeletonBlock className="size-2.5" />
                <PixelSkeletonBar width={40} />
              </div>
              <PixelSkeletonBar className="mb-2 h-7 w-3/4" />
              <PixelSkeletonLines className="mb-4" count={2} />
              <PixelSkeletonBar className="w-40" width={55} />
            </div>
          </div>
        </PixelSkeletonWindow>

        <PixelSkeletonWindow icon="✎" title="latest-notes.directory">
          <div className="section-heading mb-5 flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div>
              <div className="m-0 mb-3 flex items-center gap-2">
                <PixelSkeletonBlock className="size-2.5" />
                <PixelSkeletonBar width={40} />
              </div>
              <PixelSkeletonBar className="h-7 w-64" />
            </div>
            <PixelSkeletonBar className="mt-4 w-40" width={55} />
          </div>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <PostCardSkeleton index={index} key={index} />
            ))}
          </div>
        </PixelSkeletonWindow>
      </div>
    </div>
  )
}
