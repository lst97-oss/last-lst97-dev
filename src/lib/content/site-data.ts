import {
  getChangelogNeighboursServerFn,
  getChangelogServerFn,
  getPostServerFn,
  getProjectServerFn,
  getTopicServerFn,
  listAllPostsByUpdatedServerFn,
  listChangelogsServerFn,
  listPostsByTopicServerFn,
  listPostsServerFn,
  listProjectsPageServerFn,
  listProjectsServerFn,
  listRelatedPostsServerFn,
  listRelatedProjectsServerFn,
  listTopicsServerFn,
} from '../../server/content/server-functions'
import { createSiteDataLoaders } from './data-loaders'

export { createSiteDataLoaders, type SiteDataSources } from './data-loaders'

const siteData = createSiteDataLoaders({
  listPosts: (input) => listPostsServerFn({ data: input }),
  listPostsByTopic: (topicId, input) => listPostsByTopicServerFn({ data: { topicId, ...input } }),
  listAllPostsByUpdated: () => listAllPostsByUpdatedServerFn(),
  listRelatedPosts: (input) => listRelatedPostsServerFn({ data: input }),
  getPost: (slug) => getPostServerFn({ data: { slug } }),
  listProjects: () => listProjectsServerFn(),
  listProjectsPage: (input) => listProjectsPageServerFn({ data: input }),
  listRelatedProjects: (input) => listRelatedProjectsServerFn({ data: input }),
  getProject: (slug) => getProjectServerFn({ data: { slug } }),
  listChangelogs: (input) => listChangelogsServerFn({ data: input }),
  getChangelogNeighbours: (slug) => getChangelogNeighboursServerFn({ data: { slug } }),
  getChangelog: (slug) => getChangelogServerFn({ data: { slug } }),
  listTopics: () => listTopicsServerFn(),
  getTopic: (slug) => getTopicServerFn({ data: { slug } }),
})

export const {
  loadAllPostsByUpdated,
  loadChangelog,
  loadChangelogNeighbours,
  loadChangelogs,
  loadChangelogsPage,
  loadPost,
  loadPosts,
  loadPostsByTopic,
  loadPostsPage,
  loadPostsPageFiltered,
  loadProject,
  loadProjects,
  loadProjectsPage,
  loadProjectsPageFiltered,
  loadRelatedPosts,
  loadRelatedProjects,
  loadTopic,
  loadTopics,
} = siteData
