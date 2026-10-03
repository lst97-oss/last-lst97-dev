import { describe, expect, it } from 'bun:test'
import { Posts } from '../../src/collections/Posts'
import { Projects } from '../../src/collections/Projects'
import {
  createKnowledgeSourceSynchronizer,
  enqueueKnowledgeSourceIndex,
  KNOWLEDGE_SYNC_CRON,
} from '../../src/server/knowledge/jobs'
import { knowledgePayloadTasks } from '../../src/server/knowledge/payload-tasks'
import type { KnowledgeDocument } from '../../src/server/knowledge/source-types'
import type { KnowledgeSourceType } from '../../src/server/knowledge/types'

const documents: KnowledgeDocument[] = [
  {
    source: { type: 'github', sourceId: 'lst97/tool', title: 'tool', url: 'https://github.com/lst97/tool' },
    text: 'Public repo',
    isPublic: true,
    sourceUpdatedAt: null,
  },
]

describe('knowledge lifecycle jobs', () => {
  it('queues only the affected source identity, not its document contents', async () => {
    const jobs: unknown[] = []
    await enqueueKnowledgeSourceIndex(
      {
        queue: async (job) => {
          jobs.push(job)
        },
      },
      'post',
      '21',
    )

    expect(jobs).toEqual([
      {
        task: 'indexKnowledgeSource',
        queue: 'knowledge',
        input: { sourceType: 'post', sourceId: '21' },
        overrideAccess: true,
      },
    ])
  })

  it('attaches reindex and delete hooks to both Payload content collections', async () => {
    const queued: Array<{ task: string; input: unknown }> = []
    const req = {
      payload: {
        jobs: {
          queue: async ({ task, input }: { task: string; input: unknown }) => {
            queued.push({ task, input })
            return {}
          },
        },
      },
    }
    const postHook = Posts.hooks?.afterChange?.[0]
    const projectHook = Projects.hooks?.afterChange?.[0]
    const deletePostHook = Posts.hooks?.afterDelete?.[0]
    const deleteProjectHook = Projects.hooks?.afterDelete?.[0]
    expect(postHook).toBeFunction()
    expect(projectHook).toBeFunction()
    expect(deletePostHook).toBeFunction()
    expect(deleteProjectHook).toBeFunction()

    await (postHook as (args: unknown) => Promise<unknown>)({ doc: { id: 12, title: 'private body' }, req } as never)
    await (projectHook as (args: unknown) => Promise<unknown>)({ doc: { id: 21, title: 'private body' }, req } as never)
    await (deletePostHook as (args: unknown) => Promise<unknown>)({ doc: { id: 12 }, req } as never)
    await (deleteProjectHook as (args: unknown) => Promise<unknown>)({ doc: { id: 21 }, req } as never)

    expect(queued.map(({ input }) => input)).toEqual([
      { sourceType: 'post', sourceId: '12' },
      { sourceType: 'project', sourceId: '21' },
      { sourceType: 'post', sourceId: '12' },
      { sourceType: 'project', sourceId: '21' },
    ])
    expect(JSON.stringify(queued)).not.toContain('private body')
  })

  it('reindexes current source documents idempotently and removes stale source identities', async () => {
    const indexed: string[] = []
    const removed: string[] = []
    const source = {
      type: 'github' as KnowledgeSourceType,
      listDocuments: async () => documents,
    }
    const sync = createKnowledgeSourceSynchronizer({
      sources: [source],
      repository: {
        listSourceIds: async () => ['lst97/tool', 'lst97/deleted'],
        removeSource: async (_type: string, id: string) => {
          removed.push(id)
        },
      },
      indexer: {
        executeDocument: async (document: KnowledgeDocument) => {
          indexed.push(document.source.sourceId)
          return { status: 'indexed' as const, chunkCount: 1 }
        },
      },
      logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined },
    })

    const result = await sync.execute()

    expect(indexed).toEqual(['lst97/tool'])
    expect(removed).toEqual(['lst97/deleted'])
    expect(result.indexedCount).toBe(1)
    expect(result.removedCount).toBe(1)
  })

  it('does not remove last-known-good chunks when an external source refresh fails', async () => {
    const removed: string[] = []
    const sync = createKnowledgeSourceSynchronizer({
      sources: [
        {
          type: 'github',
          listDocuments: async () => {
            throw new Error('provider details')
          },
        },
      ],
      repository: {
        listSourceIds: async () => ['lst97/tool'],
        removeSource: async (_type: string, id: string) => {
          removed.push(id)
        },
      },
      indexer: { executeDocument: async () => ({ status: 'indexed', chunkCount: 1 }) },
      logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined },
    })

    await expect(sync.execute()).rejects.toThrow('Knowledge source synchronization failed')
    expect(removed).toEqual([])
  })

  it('uses a once-daily schedule for public GitHub and WakaTime refresh', () => {
    expect(KNOWLEDGE_SYNC_CRON).toBe('0 0 * * *')
    const scheduled = knowledgePayloadTasks.find(({ slug }) => slug === 'syncKnowledgeSources')
    expect(scheduled?.schedule).toEqual([{ cron: '0 0 * * *', queue: 'knowledge' }])
    expect(scheduled?.retries).toMatchObject({ attempts: 3, type: 'exponential' })
    expect(knowledgePayloadTasks.find(({ slug }) => slug === 'indexKnowledgeSource')?.retries).toMatchObject({
      attempts: 3,
      type: 'exponential',
    })
  })
})
