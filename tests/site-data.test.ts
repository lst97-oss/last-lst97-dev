import { describe, expect, test } from 'bun:test'

import { createSiteDataLoaders } from '../src/lib/content/data-loaders'

const emptyPostPage = { items: [], page: 1, totalPages: 1, totalDocs: 0 }
const emptyProjectPage = { items: [], page: 1, totalPages: 1, totalDocs: 0 }
const emptyChangelogPage = { items: [], page: 1, totalPages: 1, totalDocs: 0 }
const topic = { id: 4, title: 'Engineering', slug: 'engineering', description: 'Building software.' }

function createSources(overrides: Partial<Parameters<typeof createSiteDataLoaders>[0]> = {}) {
  return {
    listPosts: async () => emptyPostPage,
    getPost: async () => null,
    listProjects: async () => [],
    listProjectsPage: async () => emptyProjectPage,
    getProject: async () => null,
    listChangelogs: async () => emptyChangelogPage,
    getChangelog: async () => null,
    listTopics: async () => [],
    getTopic: async () => null,
    listPostsByTopic: async () => emptyPostPage,
    listAllPostsByUpdated: async () => [],
    listRelatedPosts: async () => [],
    listRelatedProjects: async () => [],
    getChangelogNeighbours: async () => ({ previous: null, next: null }),
    ...overrides,
  }
}

describe('site content loaders', () => {
  test('preserves a successful empty Payload response so the route can show its empty state', async () => {
    const loaders = createSiteDataLoaders(createSources())

    expect(await loaders.loadPosts()).toEqual(emptyPostPage)
    expect(await loaders.loadProjects()).toEqual([])
    expect(await loaders.loadChangelogs()).toEqual(emptyChangelogPage)
    expect(await loaders.loadTopics()).toEqual([])
    expect(await loaders.loadTopic('engineering')).toBeNull()
    expect(await loaders.loadPostsByTopic(topic.id)).toEqual(emptyPostPage)
  })

  test('lets failed Payload reads reach the route error boundary instead of turning them into empty content', async () => {
    const backendFailure = new Error('database unavailable')
    const loaders = createSiteDataLoaders(
      createSources({
        listPosts: async () => {
          throw backendFailure
        },
        getPost: async () => {
          throw backendFailure
        },
        listProjects: async () => {
          throw backendFailure
        },
        listProjectsPage: async () => {
          throw backendFailure
        },
        getProject: async () => {
          throw backendFailure
        },
        listChangelogs: async () => {
          throw backendFailure
        },
        getChangelog: async () => {
          throw backendFailure
        },
        listTopics: async () => {
          throw backendFailure
        },
        getTopic: async () => {
          throw backendFailure
        },
        listPostsByTopic: async () => {
          throw backendFailure
        },
      }),
    )

    await expect(loaders.loadPosts()).rejects.toBe(backendFailure)
    await expect(loaders.loadPost('entry')).rejects.toBe(backendFailure)
    await expect(loaders.loadProjects()).rejects.toBe(backendFailure)
    await expect(loaders.loadProject('project')).rejects.toBe(backendFailure)
    await expect(loaders.loadChangelogs()).rejects.toBe(backendFailure)
    await expect(loaders.loadChangelog('entry')).rejects.toBe(backendFailure)
    await expect(loaders.loadTopics()).rejects.toBe(backendFailure)
    await expect(loaders.loadTopic('engineering')).rejects.toBe(backendFailure)
    await expect(loaders.loadPostsByTopic(topic.id)).rejects.toBe(backendFailure)
  })

  test('preserves a successful missing detail as null so routes can render a real not-found state', async () => {
    const loaders = createSiteDataLoaders(createSources())

    expect(await loaders.loadPost('missing-entry')).toBeNull()
    expect(await loaders.loadProject('missing-project')).toBeNull()
    expect(await loaders.loadChangelog('missing-entry')).toBeNull()
  })
})
