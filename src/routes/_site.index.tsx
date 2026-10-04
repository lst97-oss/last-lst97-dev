import { createFileRoute } from '@tanstack/react-router'

import {
  HomeFeaturedProjectSection,
  HomeHeroSection,
  HomeOperatorProfileSection,
  HomeRecentNotesSection,
} from '@/components/site/home'
import { PageStack } from '@/components/site/os-ui'
import { HomeSkeleton } from '@/components/ui/skeletons'
import { loadAllPostsByUpdated, loadProjects } from '@/lib/content/site-data'
import { createPageMeta, SITE_DESCRIPTION, SITE_TAGLINE } from '@/lib/seo/site-seo'
import { getWakaTimeSnapshotServerFn } from '@/server/wakatime/server-functions'

export const Route = createFileRoute('/_site/')({
  loader: async () => {
    // One ordering for the whole home page: `-updatedAt`. The notes window is the
    // only consumer, so no second published-date list has to be kept in step.
    const [allPosts, projects, wakatimeSnapshot] = await Promise.all([
      loadAllPostsByUpdated(),
      loadProjects(),
      getWakaTimeSnapshotServerFn(),
    ])
    return { allPosts, projects, wakatimeSnapshot }
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
  const { allPosts, projects, wakatimeSnapshot } = Route.useLoaderData()
  const totalCodingTime = wakatimeSnapshot?.stats.data.grand_total.human_readable_total_including_other_language
  const formattedWakatimeStatsJson = wakatimeSnapshot?.formattedJson ?? null

  return (
    <PageStack>
      <HomeHeroSection />
      <div className="dashboard-grid grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HomeFeaturedProjectSection projects={projects} />
        </div>
        <div className="lg:col-span-2">
          <HomeOperatorProfileSection
            totalCodingTime={totalCodingTime}
            formattedSnapshot={formattedWakatimeStatsJson}
          />
        </div>
      </div>
      <HomeRecentNotesSection posts={allPosts} />
    </PageStack>
  )
}
