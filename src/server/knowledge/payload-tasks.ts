import { z } from 'zod'

import { KNOWLEDGE_SYNC_CRON } from './jobs'
import { runPayloadKnowledgeIndexTask, runPayloadKnowledgeSyncTask } from './payload-runtime'

const indexTaskInput = z.object({
  sourceType: z.enum(['post', 'project']),
  sourceId: z.string().min(1).max(512),
})

export const knowledgePayloadTasks = [
  {
    slug: 'indexKnowledgeSource',
    retries: { attempts: 3, type: 'exponential' as const, delay: 5_000 },
    inputSchema: [
      {
        name: 'sourceType',
        type: 'select' as const,
        required: true,
        options: [
          { label: 'Blog post', value: 'post' },
          { label: 'Project', value: 'project' },
        ],
      },
      { name: 'sourceId', type: 'text' as const, required: true, maxLength: 512 },
    ],
    outputSchema: [
      { name: 'status', type: 'text' as const },
      { name: 'chunkCount', type: 'number' as const },
    ],
    handler: async ({ input, req }: { input: unknown; req: { payload: Parameters<typeof runPayloadKnowledgeIndexTask>[0] } }) => {
      const parsed = indexTaskInput.safeParse(input)
      if (!parsed.success) throw new Error('Knowledge index job input is invalid')
      const output = await runPayloadKnowledgeIndexTask(req.payload, parsed.data)
      return { output }
    },
  },
  {
    slug: 'syncKnowledgeSources',
    retries: { attempts: 3, type: 'exponential' as const, delay: 60_000 },
    inputSchema: [],
    schedule: [{ cron: KNOWLEDGE_SYNC_CRON, queue: 'knowledge' }],
    handler: async ({ req }: { req: { payload: Parameters<typeof runPayloadKnowledgeSyncTask>[0] } }) => ({
      output: await runPayloadKnowledgeSyncTask(req.payload),
    }),
  },
]
