import { cn } from 'cn'
import {
  PixelSkeletonBar,
  PixelSkeletonChip,
  PixelSkeletonCover,
  PixelSkeletonLines,
  PixelSkeletonStatus,
} from '@/components/ui/skeletons/pixel-skeleton'

/**
 * Card skeletons mirroring `src/components/site/content/card.tsx` block for
 * block — same order, same spacing, same class strings — so the swap from
 * skeleton to loaded card moves nothing.
 *
 * `cardClass` is copied with its hover/transition utilities dropped: those
 * describe the interactive card, and a pending card is not a link.
 */
const CARD_CLASS = 'content-card flex min-h-50 flex-col items-start border-3 border-border bg-card p-5'

/** Mirrors `kickerClass`: the `NOTE / 20 SEP 2026` line above the cover. */
function CardKickerSkeleton() {
  return <PixelSkeletonBar className="mb-1 h-3 w-32" width={40} />
}

/** Mirrors `CardLink` (`mt-auto pt-3`), so the footer sticks to the bottom. */
function CardLinkSkeleton({ label }: { label: string }) {
  return (
    <span className="mt-auto pt-3 text-xs font-black tracking-wider text-accent">
      <PixelSkeletonBar className="h-3 w-28" width={40} data-label={label} />
    </span>
  )
}

export function PostCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className={CARD_CLASS}>
      <CardKickerSkeleton />
      <PixelSkeletonCover className="-mx-5 mb-4 aspect-video w-full border-x-0 border-t-0" seed={`post-${index}`} />
      <PixelSkeletonBar className="mb-2 h-6 w-3/4" />
      <PixelSkeletonLines className="mb-4" count={3} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <PixelSkeletonChip />
        <PixelSkeletonChip />
      </div>
      <CardLinkSkeleton label="READ NOTE" />
    </div>
  )
}

export function ProjectCardSkeleton({ index = 0, featured = false }: { index?: number; featured?: boolean }) {
  return (
    <div className={cn(CARD_CLASS, 'project-card', featured && 'project-card--featured')}>
      <CardKickerSkeleton />
      <PixelSkeletonCover
        className={featured ? 'project-card-cover' : '-mx-5 mb-4 aspect-video w-full border-x-0 border-t-0'}
        seed={`project-${index}`}
      />
      <div className="project-card-meta my-3 flex flex-wrap items-center gap-2 text-xs font-black tracking-wide text-muted-foreground">
        <PixelSkeletonStatus />
        <PixelSkeletonBar className="h-3 w-24" width={40} />
      </div>
      <span className="mt-3 text-xs font-black tracking-wider text-muted-foreground uppercase">
        <PixelSkeletonBar className="h-3 w-28" width={40} />
      </span>
      <PixelSkeletonBar className="mb-2 h-6 w-3/4" />
      <PixelSkeletonLines className="mb-4" count={3} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <PixelSkeletonChip />
        <PixelSkeletonChip />
        <PixelSkeletonChip />
        <PixelSkeletonChip />
      </div>
      <CardLinkSkeleton label="OPEN PROJECT" />
    </div>
  )
}

export function ChangelogCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className={cn(CARD_CLASS, 'changelog-card')}>
      <CardKickerSkeleton />
      <PixelSkeletonCover
        className="-mx-5 mb-4 aspect-video w-full border-x-0 border-t-0"
        seed={`changelog-${index}`}
      />
      <PixelSkeletonStatus className="mb-3 self-start" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <PixelSkeletonStatus />
        <PixelSkeletonStatus />
        <PixelSkeletonStatus />
      </div>
      <PixelSkeletonBar className="mb-2 h-6 w-3/4" />
      <PixelSkeletonLines className="mb-4" count={3} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <PixelSkeletonChip />
        <PixelSkeletonChip />
        <PixelSkeletonChip />
        <PixelSkeletonChip />
      </div>
      <CardLinkSkeleton label="READ ENTRY" />
    </div>
  )
}
