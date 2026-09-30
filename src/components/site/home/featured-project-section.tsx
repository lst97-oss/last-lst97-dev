import { Link } from '@tanstack/react-router'
import type { ComponentProps } from 'react'

import { ProjectCard } from '@/components/site/content/card'
import { homeWindowControls } from '@/components/site/home/constants'
import { EmptyPanel } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

type Project = ComponentProps<typeof ProjectCard>['project']

export function HomeFeaturedProjectSection({ project }: { project: Project | undefined }) {
  return (
    <WindowFrame title="featured-project.app" icon="▤" className="feature-window" controls={homeWindowControls}>
      {project ? (
        // `featured` caps the cover and corrects its `sizes`: this window holds
        // one card, not a card-grid column.
        <ProjectCard featured project={project} />
      ) : (
        <EmptyPanel><PixelIcon glyph="◇" /><p>Project archive is ready for its first upload.</p><Link className="text-xs font-black tracking-wider text-accent" to="/contact">START A CONVERSATION →</Link></EmptyPanel>
      )}
    </WindowFrame>
  )
}
