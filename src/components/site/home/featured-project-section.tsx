import { Link } from '@tanstack/react-router'
import type { ComponentProps } from 'react'

import { ProjectCard } from '../content/card'
import { PixelIcon } from '../pixel-icon'
import { WindowFrame } from '../window-frame'
import { homeWindowControls } from './constants'

type Project = ComponentProps<typeof ProjectCard>['project']

export function HomeFeaturedProjectSection({ project }: { project: Project | undefined }) {
  return (
    <WindowFrame title="featured-project.app" icon="▤" className="feature-window" controls={homeWindowControls}>
      {project ? (
        <ProjectCard project={project} />
      ) : (
        <div className="empty-panel"><PixelIcon glyph="◇" /><p>Project archive is ready for its first upload.</p><Link to="/contact">START A CONVERSATION →</Link></div>
      )}
    </WindowFrame>
  )
}
