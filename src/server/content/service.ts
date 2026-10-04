import type { BlogReader, ChangelogReader, ListPostsInput, ProjectReader, RelatedInput, TopicReader } from './types'

export function createContentReader(dependencies: {
  blogs: BlogReader
  projects: ProjectReader
  changelogs: ChangelogReader
  topics: TopicReader
}) {
  return {
    listPosts(input: ListPostsInput) {
      return dependencies.blogs.listPublished(input)
    },
    listPostsByTopic(topicId: string | number, input: ListPostsInput) {
      return dependencies.blogs.listPublishedByTopic(topicId, input)
    },
    listAllPostsByUpdated() {
      return dependencies.blogs.listAllByUpdated()
    },
    getPost(slug: string) {
      return dependencies.blogs.getPublishedBySlug(slug)
    },
    listRelatedPosts(input: RelatedInput) {
      return dependencies.blogs.listRelated(input)
    },
    listRelatedProjects(input: RelatedInput) {
      return dependencies.projects.listRelated(input)
    },
    getChangelogNeighbours(slug: string) {
      return dependencies.changelogs.getNeighbours({ slug })
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
  }
}

export type ContentReader = ReturnType<typeof createContentReader>
