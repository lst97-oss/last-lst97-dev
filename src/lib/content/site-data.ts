import {
  getChangelogServerFn,
  getFeaturedPostServerFn,
  getPostServerFn,
  getProjectServerFn,
  getTopicServerFn,
  listChangelogsServerFn,
  listPostsByTopicServerFn,
  listPostsServerFn,
  listProjectsPageServerFn,
  listProjectsServerFn,
  listTopicsServerFn,
} from '../../server/content/server-functions'
import { createSiteDataLoaders } from './data-loaders'

export { createSiteDataLoaders, type SiteDataSources } from './data-loaders'

const siteData = createSiteDataLoaders({
  listPosts: (input) => listPostsServerFn({ data: input }),
  listPostsByTopic: (topicId, input) => listPostsByTopicServerFn({ data: { topicId, ...input } }),
  getPost: (slug) => getPostServerFn({ data: { slug } }),
  listProjects: () => listProjectsServerFn(),
  listProjectsPage: (input) => listProjectsPageServerFn({ data: input }),
  getProject: (slug) => getProjectServerFn({ data: { slug } }),
  listChangelogs: (input) => listChangelogsServerFn({ data: input }),
  getChangelog: (slug) => getChangelogServerFn({ data: { slug } }),
  listTopics: () => listTopicsServerFn(),
  getTopic: (slug) => getTopicServerFn({ data: { slug } }),
  getFeaturedPost: () => getFeaturedPostServerFn(),
})

export const {
  loadPosts,
  loadPostsByTopic,
  loadPost,
  loadProjects,
  loadProject,
  loadProjectsPage,
  loadPostsPage,
  loadChangelogsPage,
  loadChangelogs,
  loadChangelog,
  loadTopics,
  loadTopic,
  loadFeaturedPost,
} = siteData
