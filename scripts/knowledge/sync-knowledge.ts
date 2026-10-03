import config from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })
try {
  await payload.jobs.queue({
    task: 'syncKnowledgeSources',
    input: {},
    queue: 'knowledge',
    overrideAccess: true,
  })
  const results = await payload.jobs.run({ queue: 'knowledge', limit: 1, overrideAccess: true })
  console.info(
    JSON.stringify({
      event: 'knowledge.sync.initial_run.finished',
      processedJobCount: Object.keys(results.jobStatus ?? {}).length,
      remainingJobs: results.remainingJobsFromQueried,
    }),
  )
} finally {
  await payload.destroy()
}
