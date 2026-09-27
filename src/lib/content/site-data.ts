import {
  getChangelogServerFn,
  getPostServerFn,
  getProjectServerFn,
  listChangelogsServerFn,
  listPostsServerFn,
  listProjectsServerFn,
} from '../../server/content/server-functions'
import { createSiteDataLoaders } from './data-loaders'

export { createSiteDataLoaders, type SiteDataSources } from './data-loaders'

const siteData = createSiteDataLoaders({
  listPosts: (input) => listPostsServerFn({ data: input }),
  getPost: (slug) => getPostServerFn({ data: { slug } }),
  listProjects: () => listProjectsServerFn(),
  getProject: (slug) => getProjectServerFn({ data: { slug } }),
  listChangelogs: (input) => listChangelogsServerFn({ data: input }),
  getChangelog: (slug) => getChangelogServerFn({ data: { slug } }),
})

export const {
  loadPosts,
  loadPost,
  loadProjects,
  loadProject,
  loadChangelogs,
  loadChangelog,
} = siteData
