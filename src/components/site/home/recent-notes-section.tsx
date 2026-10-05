import { Link } from '@tanstack/react-router'
import { type ComponentProps, useMemo } from 'react'

import { PostCard } from '@/components/site/content/card'
import { homeWindowControls } from '@/components/site/home/constants'
import { FeaturedWindowPagination, useFeaturedCarousel } from '@/components/site/home/featured-carousel'
import { CardGrid, EmptyPanel, PixelButton } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

type Post = ComponentProps<typeof PostCard>['post']

/** Matches `WindowFrame`'s default `windowId`, which defaults to `title`. */
const WINDOW_ID = 'latest-notes.directory'

/**
 * How many notes each strip slide shows — three, matching `CardGrid`'s
 * three-across layout, so a full slide fills a row. This is notes-per-slide,
 * NOT the number of slides.
 */
const STRIP_PAGE_SIZE = 3

/** Same six-per-page grid as the featured-project window. */
const MAXIMIZED_PAGE_SIZE = 6

/**
 * How many notes the home page shows at most, newest-updated first. The
 * `latest-notes.directory` window is a digest, not the archive: the full list,
 * with its own pagination and topic filters, lives at `/blog`, so the heading
 * links there unconditionally instead of only when the window happened to
 * render everything.
 */
const HOME_NOTE_LIMIT = 12

/**
 * `latest-notes.directory` holds the notes the home page shows, in one window
 * and one ordering, capped to `HOME_NOTE_LIMIT`.
 *
 * Normal: a rotating strip of the most recently updated notes. Maximized: the
 * same capped set in the `CardGrid` the listings use, six per page. Both
 * surfaces read the capped list, so the window never shows more than
 * `HOME_NOTE_LIMIT` notes however it is paged.
 */
export function HomeRecentNotesSection({ posts }: { posts: Post[] }) {
  // The home page is a digest of the newest notes; `/blog` remains the full
  // archive. Cap once, here, so every surface below — strip, maximized grid,
  // carousel pool size, and the "… of N" aria ranges — counts the same set.
  const recent = useMemo(() => posts.slice(0, HOME_NOTE_LIMIT), [posts])
  // Chunk the strip into full rows rather than leaving columns empty.
  const slides = useMemo(() => {
    const grouped: Post[][] = []
    for (let index = 0; index < recent.length; index += STRIP_PAGE_SIZE) {
      grouped.push(recent.slice(index, index + STRIP_PAGE_SIZE))
    }
    return grouped
  }, [recent])

  const { activeIndex, handleDot, handleNext, handlePrevious, hasInteracted, isExpanded, page, setPage, totalPages } =
    useFeaturedCarousel({
      // Notes advance by hand only. Auto-advancing a reading surface rewrites
      // the page under a reader mid-sentence, and unlike the project cards this
      // content is prose rather than a glanceable summary.
      autoplayMs: null,
      count: slides.length,
      poolCount: recent.length,
      pageSize: MAXIMIZED_PAGE_SIZE,
      windowId: WINDOW_ID,
    })

  const heading = (
    <div className="section-heading mb-5 flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <p className="eyebrow m-0 mb-3 text-xs leading-snug font-black tracking-widest text-accent uppercase">
          RECENTLY SAVED
        </p>
        <h2 className="mb-0">Notes from the field.</h2>
      </div>
      {/* The window is capped, so the full archive always lives behind this link. */}
      <Link className="text-link mt-4 text-xs font-black tracking-wider text-accent" to="/blog">
        VIEW ALL NOTES →
      </Link>
    </div>
  )

  const body =
    recent.length === 0 ? (
      <>
        {heading}
        <EmptyPanel>
          <PixelIcon glyph="◇" />
          <p>No notes published yet. The editor is waiting.</p>
        </EmptyPanel>
      </>
    ) : isExpanded ? (
      <>
        <CardGrid>
          {recent.slice(page * MAXIMIZED_PAGE_SIZE, (page + 1) * MAXIMIZED_PAGE_SIZE).map((note) => (
            <PostCard key={note.slug} post={note} />
          ))}
        </CardGrid>
        <FeaturedWindowPagination current={page} label="Note pages" onSelect={setPage} totalPages={totalPages} />
      </>
    ) : (
      <>
        {heading}

        {slides.length === 0 ? null : slides.length === 1 ? (
          // A single slide must not render dead arrows, dots, or a running timer.
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {slides[0].map((note) => (
              <PostCard key={note.slug} post={note} />
            ))}
          </div>
        ) : (
          <>
            <div
              aria-label="Recent notes"
              aria-live={hasInteracted ? 'polite' : 'off'}
              aria-roledescription="carousel"
              className="featured-carousel"
              role="region"
            >
              <div className="featured-carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                {slides.map((slideNotes, slideIndex) => (
                  <div
                    aria-label={`Recent notes ${slideIndex * STRIP_PAGE_SIZE + 1} to ${slideIndex * STRIP_PAGE_SIZE + slideNotes.length} of ${recent.length}`}
                    aria-roledescription="slide"
                    className="featured-carousel-slide"
                    key={slideIndex}
                    role="group"
                  >
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                      {slideNotes.map((note) => (
                        <PostCard key={note.slug} post={note} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="featured-carousel-controls mt-6 flex items-center justify-between gap-3">
              <PixelButton aria-label="Previous recent notes" className="size-10 px-0" onClick={handlePrevious}>
                ←
              </PixelButton>
              <div className="featured-carousel-dots flex items-center gap-2">
                {slides.map((slideNotes, dotIndex) => (
                  <button
                    aria-current={dotIndex === activeIndex ? 'true' : undefined}
                    aria-label={`Show recent notes ${dotIndex * STRIP_PAGE_SIZE + 1} to ${dotIndex * STRIP_PAGE_SIZE + slideNotes.length}`}
                    className="featured-carousel-dot"
                    key={dotIndex}
                    onClick={() => handleDot(dotIndex)}
                    type="button"
                  />
                ))}
              </div>
              <PixelButton aria-label="Next recent notes" className="size-10 px-0" onClick={handleNext}>
                →
              </PixelButton>
            </div>
          </>
        )}
      </>
    )

  return (
    <WindowFrame title={WINDOW_ID} icon="✎" controls={homeWindowControls}>
      {body}
    </WindowFrame>
  )
}
