import type {
  Changelog,
  ChangelogSummary,
  ContentFilters,
  Page,
  Post,
  PostSummary,
  Project,
  ProjectSummary,
  TopicSummary,
} from '../../server/content/types'

type PageInput = { page: number; limit: number }
type FilterablePageInput = PageInput & { topicIds?: (string | number)[] }

type RelatedInput = { excludeSlug: string; topicIds: (string | number)[]; limit?: number }

export interface SiteDataSources {
  listPosts(input: FilterablePageInput): Promise<Page<PostSummary>>
  listPostsByTopic(topicId: string | number, input: PageInput): Promise<Page<PostSummary>>
  listAllPostsByUpdated(): Promise<PostSummary[]>
  listRelatedPosts(input: Required<RelatedInput>): Promise<PostSummary[]>
  getPost(slug: string): Promise<Post | null>
  listProjects(): Promise<ProjectSummary[]>
  listProjectsPage(input: FilterablePageInput): Promise<Page<ProjectSummary>>
  listRelatedProjects(input: Required<RelatedInput>): Promise<ProjectSummary[]>
  getProject(slug: string): Promise<Project | null>
  listChangelogs(input: FilterablePageInput): Promise<Page<ChangelogSummary>>
  getChangelogNeighbours(slug: string): Promise<{ previous: ChangelogSummary | null; next: ChangelogSummary | null }>
  getChangelog(slug: string): Promise<Changelog | null>
  listTopics(): Promise<TopicSummary[]>
  getTopic(slug: string): Promise<TopicSummary | null>
}

/** Only the keys the caller actually set, so an unfiltered list sends no topics. */
function filtersFrom({ topicIds }: { topicIds?: (string | number)[] }): ContentFilters {
  return topicIds?.length ? { topicIds } : {}
}

export function createSiteDataLoaders(sources: SiteDataSources) {
  return {
    loadPosts: () => sources.listPosts({ page: 1, limit: 6 }),
    loadPostsByTopic: (topicId: string | number) => sources.listPostsByTopic(topicId, { page: 1, limit: 50 }),
    loadAllPostsByUpdated: () => sources.listAllPostsByUpdated(),
    loadPost: (slug: string) => sources.getPost(slug),
    loadRelatedPosts: ({ excludeSlug, topicIds, limit = 3 }: RelatedInput) =>
      sources.listRelatedPosts({ excludeSlug, topicIds, limit }),
    loadProjects: () => sources.listProjects(),
    loadProjectsPage: (page: number, limit: number) => sources.listProjectsPage({ page, limit }),
    loadProjectsPageFiltered: (page: number, limit: number, filters: { topicIds?: (string | number)[] }) =>
      sources.listProjectsPage({ page, limit, ...filtersFrom(filters) }),
    loadRelatedProjects: ({ excludeSlug, topicIds, limit = 3 }: RelatedInput) =>
      sources.listRelatedProjects({ excludeSlug, topicIds, limit }),
    loadProject: (slug: string) => sources.getProject(slug),
    loadChangelogs: () => sources.listChangelogs({ page: 1, limit: 20 }),
    loadChangelogsPage: (page: number, limit: number) => sources.listChangelogs({ page, limit }),
    loadChangelog: (slug: string) => sources.getChangelog(slug),
    loadChangelogNeighbours: (slug: string) => sources.getChangelogNeighbours(slug),
    loadTopics: () => sources.listTopics(),
    loadPostsPage: (page: number, limit: number) => sources.listPosts({ page, limit }),
    loadPostsPageFiltered: (page: number, limit: number, filters: { topicIds?: (string | number)[] }) =>
      sources.listPosts({ page, limit, ...filtersFrom(filters) }),
    loadTopic: (slug: string) => sources.getTopic(slug),
  }
}
