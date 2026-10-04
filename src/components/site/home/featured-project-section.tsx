import { Link } from '@tanstack/react-router'
import { type ComponentProps, useMemo } from 'react'

import { ProjectCard } from '@/components/site/content/card'
import { homeWindowControls } from '@/components/site/home/constants'
import {
  FEATURED_AUTOPLAY_MS,
  FeaturedWindowPagination,
  useFeaturedCarousel,
} from '@/components/site/home/featured-carousel'
import { CardGrid, EmptyPanel, PixelButton } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

type Project = ComponentProps<typeof ProjectCard>['project']

/** Matches `WindowFrame`'s default `windowId`, which defaults to `title`. */
const WINDOW_ID = 'featured-project.app'

const MAXIMIZED_PAGE_SIZE = 6

/**
 * `featured-project.app` has two surfaces driven by the window's own state.
 *
 * Normal: a looping carousel of every featured project, one card per slide,
 * with pixel arrows, dots, and a 5s autoplay.
 * Maximized: every featured project in the same `CardGrid` the project and post
 * listings use, six per page with an in-window page picker.
 *
 * The carousel is a transform track rather than Embla: one slide per page means
 * a translate is the whole mechanism, and Embla measures `getBoundingClientRect`
 * so its loop bounds cannot be verified outside a real layout engine.
 */
export function HomeFeaturedProjectSection({ projects }: { projects: Project[] }) {
  // Filtering lives here, not in the route: the rule is then testable without a
  // loader, and the route stays a pass-through of what Payload returned.
  const featuredProjects = useMemo(() => projects.filter((project) => project.featured), [projects])
  const count = featuredProjects.length

  const { activeIndex, handleDot, handleNext, handlePrevious, hasInteracted, isExpanded, page, setPage, totalPages } =
    useFeaturedCarousel({
      autoplayMs: FEATURED_AUTOPLAY_MS,
      count,
      poolCount: count,
      pageSize: MAXIMIZED_PAGE_SIZE,
      windowId: WINDOW_ID,
    })
  const body =
    count === 0 ? (
      <EmptyPanel>
        <PixelIcon glyph="◇" />
        <p>Project archive is ready for its first upload.</p>
        <Link className="text-xs font-black tracking-wider text-accent" to="/contact">
          START A CONVERSATION →
        </Link>
      </EmptyPanel>
    ) : isExpanded ? (
      <>
        <CardGrid>
          {featuredProjects.slice(page * MAXIMIZED_PAGE_SIZE, (page + 1) * MAXIMIZED_PAGE_SIZE).map((project) => (
            // Not `featured`: this is a card-grid column, so the capped cover
            // and the eager cover load of the featured variant are both wrong here.
            <ProjectCard key={project.slug} project={project} />
          ))}
        </CardGrid>
        <FeaturedWindowPagination
          current={page}
          label="Featured project pages"
          onSelect={setPage}
          totalPages={totalPages}
        />
      </>
    ) : count === 1 ? (
      // A single slide must not render dead arrows, dots, or a running timer.
      <ProjectCard featured project={featuredProjects[0]} />
    ) : (
      <>
        <div
          aria-label="Featured projects"
          aria-live={hasInteracted ? 'polite' : 'off'}
          aria-roledescription="carousel"
          className="featured-carousel"
          role="region"
        >
          <div className="featured-carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {featuredProjects.map((project, slideIndex) => (
              <div
                aria-label={`Featured project ${slideIndex + 1} of ${count}`}
                aria-roledescription="slide"
                className="featured-carousel-slide"
                key={project.slug}
                role="group"
              >
                <ProjectCard
                  featured
                  // Only the first slide can be the LCP element; the rest load
                  // lazily as the autoplay brings them on screen.
                  priority={slideIndex === 0}
                  project={project}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="featured-carousel-controls mt-6 flex items-center justify-between gap-3">
          <PixelButton aria-label="Previous featured project" className="size-10 px-0" onClick={handlePrevious}>
            ←
          </PixelButton>
          <div className="featured-carousel-dots flex items-center gap-2">
            {featuredProjects.map((project, dotIndex) => (
              <button
                aria-current={dotIndex === activeIndex ? 'true' : undefined}
                aria-label={`Show featured project ${dotIndex + 1}: ${project.title}`}
                className="featured-carousel-dot"
                key={project.slug}
                onClick={() => handleDot(dotIndex)}
                type="button"
              />
            ))}
          </div>
          <PixelButton aria-label="Next featured project" className="size-10 px-0" onClick={handleNext}>
            →
          </PixelButton>
        </div>
      </>
    )

  return (
    <WindowFrame title={WINDOW_ID} icon="▤" className="feature-window" controls={homeWindowControls}>
      {body}
    </WindowFrame>
  )
}
