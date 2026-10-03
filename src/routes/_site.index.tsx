import { createFileRoute } from '@tanstack/react-router'

import {
  HomeFeaturedPostSection,
  HomeFeaturedProjectSection,
  HomeHeroSection,
  HomeOperatorProfileSection,
  HomeRecentNotesSection,
} from '@/components/site/home'
import { PageStack } from '@/components/site/os-ui'
import { HomeSkeleton } from '@/components/ui/skeletons'
import { loadFeaturedPost, loadPosts, loadProjects } from '@/lib/content/site-data'
import { createPageMeta, SITE_DESCRIPTION, SITE_TAGLINE } from '@/lib/seo/site-seo'
import { getWakaTimeSnapshotServerFn } from '@/server/wakatime/server-functions'

export const Route = createFileRoute('/_site/')({
  loader: async () => {
    const [posts, projects, featuredPost, wakatimeSnapshot] = await Promise.all([
      loadPosts(),
      loadProjects(),
      loadFeaturedPost(),
      getWakaTimeSnapshotServerFn(),
    ])
    return { posts, projects, featuredPost, wakatimeSnapshot }
  },
  pendingComponent: () => <HomeSkeleton />,
  head: () =>
    createPageMeta({
      pathname: '/',
      title: `LAST//OS — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
    }),
  component: HomePage,
})

function HomePage() {
  const { posts, projects, featuredPost, wakatimeSnapshot } = Route.useLoaderData()
  const featuredProject = projects.find((project) => project.featured) ?? projects[0]
  const totalCodingTime = wakatimeSnapshot?.stats.data.grand_total.human_readable_total_including_other_language
  const formattedWakatimeStatsJson = wakatimeSnapshot?.formattedJson ?? null

  return (
    <PageStack>
      <HomeHeroSection />
      <div className="dashboard-grid grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HomeFeaturedProjectSection project={featuredProject} />
        </div>
        <div className="lg:col-span-2">
          <HomeOperatorProfileSection
            totalCodingTime={totalCodingTime}
            formattedSnapshot={formattedWakatimeStatsJson}
          />
        </div>
      </div>
      {featuredPost ? <HomeFeaturedPostSection post={featuredPost} /> : null}
      <HomeRecentNotesSection posts={posts.items} />
    </PageStack>
  )
}
