import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { enqueueKnowledgeSourceIndex } from './jobs'
import type { KnowledgeJobQueue } from './jobs'
import type { KnowledgeSourceType } from './types'

export function createKnowledgeAfterChangeHook(sourceType: 'post' | 'project'): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    await enqueueKnowledgeSourceIndex(
      req.payload.jobs as unknown as KnowledgeJobQueue,
      sourceType,
      doc.id,
      req,
    )
    return doc
  }
}

export function createKnowledgeAfterDeleteHook(sourceType: 'post' | 'project'): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    await enqueueKnowledgeSourceIndex(
      req.payload.jobs as unknown as KnowledgeJobQueue,
      sourceType satisfies KnowledgeSourceType,
      doc.id,
      req,
    )
    return doc
  }
}
