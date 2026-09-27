import type { BlogReader, ChangelogReader, ListPostsInput, ProjectReader } from './types'

export function createContentReader(dependencies: {
  blogs: BlogReader
  projects: ProjectReader
  changelogs: ChangelogReader
}) {
  return {
    listPosts(input: ListPostsInput) {
      return dependencies.blogs.listPublished(input)
    },
    getPost(slug: string) {
      return dependencies.blogs.getPublishedBySlug(slug)
    },
    listProjects() {
      return dependencies.projects.listPublished()
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
  }
}

export type ContentReader = ReturnType<typeof createContentReader>
