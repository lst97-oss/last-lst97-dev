import { getChangelogServerFn, getPostServerFn, getProjectServerFn, listChangelogsServerFn, listPostsServerFn, listProjectsServerFn } from '../server/content/server-functions'
import type { Changelog, ChangelogSummary, Page, Post, PostSummary, Project, ProjectSummary } from '../server/content/types'

export interface SiteDataSources {
  listPosts(input: { page: number; limit: number }): Promise<Page<PostSummary>>
  getPost(slug: string): Promise<Post | null>
  listProjects(): Promise<ProjectSummary[]>
  getProject(slug: string): Promise<Project | null>
  listChangelogs(input: { page: number; limit: number }): Promise<Page<ChangelogSummary>>
  getChangelog(slug: string): Promise<Changelog | null>
}

export function createSiteDataLoaders(sources: SiteDataSources) {
  return {
    loadPosts: () => sources.listPosts({ page: 1, limit: 6 }),
    loadPost: (slug: string) => sources.getPost(slug),
    loadProjects: () => sources.listProjects(),
    loadProject: (slug: string) => sources.getProject(slug),
    loadChangelogs: () => sources.listChangelogs({ page: 1, limit: 20 }),
    loadChangelog: (slug: string) => sources.getChangelog(slug),
  }
}

const siteData = createSiteDataLoaders({
  listPosts: (input) => listPostsServerFn({ data: input }),
  getPost: (slug) => getPostServerFn({ data: { slug } }),
  listProjects: () => listProjectsServerFn(),
  getProject: (slug) => getProjectServerFn({ data: { slug } }),
  listChangelogs: (input) => listChangelogsServerFn({ data: input }),
  getChangelog: (slug) => getChangelogServerFn({ data: { slug } }),
})

export const { loadPosts, loadPost, loadProjects, loadProject, loadChangelogs, loadChangelog } = siteData
