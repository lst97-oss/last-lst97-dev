import type { BlogReader, ChangelogReader, HomeReader, ListPostsInput, ProjectReader, TopicReader } from './types'

export function createContentReader(dependencies: {
  blogs: BlogReader
  projects: ProjectReader
  changelogs: ChangelogReader
  topics: TopicReader
  home: HomeReader
}) {
  return {
    listPosts(input: ListPostsInput) {
      return dependencies.blogs.listPublished(input)
    },
    listPostsByTopic(topicId: string | number, input: ListPostsInput) {
      return dependencies.blogs.listPublishedByTopic(topicId, input)
    },
    getPost(slug: string) {
      return dependencies.blogs.getPublishedBySlug(slug)
    },
    listProjects() {
      return dependencies.projects.listAll()
    },
    listProjectsPage(input: ListPostsInput) {
      return dependencies.projects.listPublished(input)
    },
    getProject(slug: string) {
      return dependencies.projects.getPublishedBySlug(slug)
    },
    listChangelogs(input: ListPostsInput) {
      return dependencies.changelogs.listPublished(input)
    },
    getChangelog(slug: string) {
      return dependencies.changelogs.getPublishedBySlug(slug)
    },
    listTopics() {
      return dependencies.topics.listPublished()
    },
    getTopic(slug: string) {
      return dependencies.topics.getPublishedBySlug(slug)
    },
    getFeaturedPost() {
      return dependencies.home.getFeaturedPost()
    },
  }
}

export type ContentReader = ReturnType<typeof createContentReader>
