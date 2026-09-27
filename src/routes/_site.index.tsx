import { createFileRoute } from '@tanstack/react-router'
import beautify from 'js-beautify'

import {
  HomeFeaturedProjectSection,
  HomeHeroSection,
  HomeOperatorProfileSection,
  HomeRecentNotesSection,
} from '../components/site/home'
import { loadPosts, loadProjects } from '../lib/content/site-data'
import { getWakaTimeSnapshotServerFn } from '../server/wakatime/server-functions'

export const Route = createFileRoute('/_site/')({
  loader: async () => {
    const [posts, projects, wakatimeSnapshot] = await Promise.all([
      loadPosts(),
      loadProjects(),
      getWakaTimeSnapshotServerFn(),
    ])
    return { posts, projects, wakatimeSnapshot }
  },
  head: () => ({
    meta: [
      { title: 'LAST//OS — Personal system online' },
      { name: 'description', content: 'A pixel-art personal operating system for ideas, projects, and conversations.' },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  const { posts, projects, wakatimeSnapshot } = Route.useLoaderData()
  const featuredProject = projects.find((project) => project.featured) ?? projects[0]
  const totalCodingTime = wakatimeSnapshot?.stats.data.grand_total.human_readable_total_including_other_language
  const formattedWakatimeStatsJson = wakatimeSnapshot
    ? beautify.js(wakatimeSnapshot.rawJson, { indent_size: 2 })
    : null

  return (
    <div className="page-stack">
      <HomeHeroSection />
      <div className="dashboard-grid">
        <HomeFeaturedProjectSection project={featuredProject} />
        <HomeOperatorProfileSection totalCodingTime={totalCodingTime} formattedSnapshot={formattedWakatimeStatsJson} />
      </div>
      <HomeRecentNotesSection posts={posts.items} />
    </div>
  )
}
