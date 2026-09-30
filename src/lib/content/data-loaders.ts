import type {
  Changelog,
  ChangelogSummary,
  Page,
  Post,
  PostSummary,
  Project,
  ProjectSummary,
  TopicSummary,
} from '../../server/content/types'

export interface SiteDataSources {
  listPosts(input: { page: number; limit: number }): Promise<Page<PostSummary>>
  listPostsByTopic(topicId: string | number, input: { page: number; limit: number }): Promise<Page<PostSummary>>
  getPost(slug: string): Promise<Post | null>
  listProjects(): Promise<ProjectSummary[]>
  listProjectsPage(input: { page: number; limit: number }): Promise<Page<ProjectSummary>>
  getProject(slug: string): Promise<Project | null>
  listChangelogs(input: { page: number; limit: number }): Promise<Page<ChangelogSummary>>
  getChangelog(slug: string): Promise<Changelog | null>
  listTopics(): Promise<TopicSummary[]>
  getTopic(slug: string): Promise<TopicSummary | null>
  getFeaturedPost(): Promise<PostSummary | null>
}

export function createSiteDataLoaders(sources: SiteDataSources) {
  return {
    loadPosts: () => sources.listPosts({ page: 1, limit: 6 }),
    loadPostsByTopic: (topicId: string | number) => sources.listPostsByTopic(topicId, { page: 1, limit: 50 }),
    loadPost: (slug: string) => sources.getPost(slug),
    loadProjects: () => sources.listProjects(),
    loadProjectsPage: (page: number, limit: number) => sources.listProjectsPage({ page, limit }),
    loadProject: (slug: string) => sources.getProject(slug),
    loadChangelogs: () => sources.listChangelogs({ page: 1, limit: 20 }),
    loadChangelogsPage: (page: number, limit: number) => sources.listChangelogs({ page, limit }),
    loadChangelog: (slug: string) => sources.getChangelog(slug),
    loadTopics: () => sources.listTopics(),
    loadPostsPage: (page: number, limit: number) => sources.listPosts({ page, limit }),
    loadTopic: (slug: string) => sources.getTopic(slug),
    loadFeaturedPost: () => sources.getFeaturedPost(),
  }
}
