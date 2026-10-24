import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { logger } from '../observability/logger'
import { type CommentsConfig, commentsConfig } from './config'
import { type CommentedCollection, contentPageUrl, readSiteOrigin } from './public-url'
import { deleteCommentThread, type Fetcher, registerCommentThread } from './thread'

// Payload's document, read by key with type guards: the hook never trusts a field's shape.
type ContentDoc = Record<string, unknown>

export type CommentsHookDeps = {
  readConfig: () => CommentsConfig | null
  readSiteOrigin: () => string | null
  fetcher: Fetcher
  now: () => Date
  warn: (event: string, fields: Record<string, unknown>) => void
}

const defaultDeps: CommentsHookDeps = {
  readConfig: commentsConfig,
  readSiteOrigin,
  fetcher: fetch,
  now: () => new Date(),
  warn: (event, fields) => logger.warn(event, fields),
}

function timestamp(value: unknown): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

// Mirrors publishedAccess() (src/collections/access.ts): a page is public only
// when it is published, has a slug, and its publish date has arrived.
export function isPubliclyVisible(doc: ContentDoc, now: Date): boolean {
  if (doc.status !== 'published' || typeof doc.slug !== 'string' || !doc.slug) return false
  const publishedAt = timestamp(doc.publishedAt)
  return publishedAt !== null && publishedAt <= now.getTime()
}

// A thread is registered when a page becomes public, and again when its slug or
// title changes while it is public (so the thread follows the page). Other saves
// leave the thread alone.
export function needsThreadRegistration(doc: ContentDoc, previous: ContentDoc | undefined, now: Date): boolean {
  if (!isPubliclyVisible(doc, now)) return false
  if (!previous || !isPubliclyVisible(previous, now)) return true
  return doc.slug !== previous.slug || doc.title !== previous.title
}

export function createCommentsAfterChangeHook(
  collection: CommentedCollection,
  deps: CommentsHookDeps = defaultDeps,
): CollectionAfterChangeHook {
  return async ({ doc, previousDoc }) => {
    const current = doc as ContentDoc
    if (!needsThreadRegistration(current, previousDoc as ContentDoc | undefined, deps.now())) return doc

    const config = deps.readConfig()
    if (!config) return doc

    const id = String(current.id)
    const origin = deps.readSiteOrigin()
    if (!origin || typeof current.slug !== 'string') {
      deps.warn('comments.thread_skipped', { collection, id, reason: 'no_site_origin' })
      return doc
    }

    const result = await registerCommentThread(
      config,
      {
        url: contentPageUrl(origin, collection, current.slug),
        pageKey: `${collection}-${id}`,
        ...(typeof current.title === 'string' ? { title: current.title } : {}),
      },
      deps.fetcher,
    )
    if (!result.ok) deps.warn('comments.thread_register_failed', { collection, id, reason: result.reason })
    return doc
  }
}

// Removes the thread when its document is deleted. Only the thread goes: the
// comments service keeps its own audit trail. A failure is logged and never blocks
// the content delete.
export function createCommentsAfterDeleteHook(
  collection: CommentedCollection,
  deps: CommentsHookDeps = defaultDeps,
): CollectionAfterDeleteHook {
  return async ({ doc, id }) => {
    const config = deps.readConfig()
    if (!config) return doc

    const key = String(id)
    const result = await deleteCommentThread(config, `${collection}-${key}`, deps.fetcher)
    if (!result.ok) deps.warn('comments.thread_delete_failed', { collection, id: key, reason: result.reason })
    return doc
  }
}
