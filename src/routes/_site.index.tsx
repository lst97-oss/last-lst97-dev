import { createFileRoute } from '@tanstack/react-router'
import beautify from 'js-beautify'

import {
  HomeFeaturedProjectSection,
  HomeHeroSection,
  HomeOperatorProfileSection,
  HomeRecentNotesSection,
} from '@/components/site/home'
import { PageStack } from '@/components/site/os-ui'
import { loadPosts, loadProjects } from '@/lib/content/site-data'
import { getWakaTimeSnapshotServerFn } from '@/server/wakatime/server-functions'

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
    <PageStack>
      <HomeHeroSection />
      <div className="dashboard-grid grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><HomeFeaturedProjectSection project={featuredProject} /></div>
        <div className="lg:col-span-2"><HomeOperatorProfileSection totalCodingTime={totalCodingTime} formattedSnapshot={formattedWakatimeStatsJson} /></div>
      </div>
      <HomeRecentNotesSection posts={posts.items} />
    </PageStack>
  )
}
