import type { CollectionBeforeChangeHook } from 'payload'

/**
 * `status: 'published'` is meaningless to the public read path without a
 * publish date. `findPublishedDocuments` (src/server/content/payload-readers.ts)
 * and `publishedAccess` (src/collections/access.ts) both require
 * `publishedAt <= now`, and in SQL `NULL <= now()` is never true — so a doc
 * published from the admin with no `publishedAt` is filtered out of the list,
 * the detail page, and the homepage. Nothing else wrote that field, so the
 * editor had to remember it by hand.
 *
 * This stamps the date the moment status flips to `published`, and clears it
 * when status drops back to `draft` so the guard cannot be satisfied by a
 * stale date. An explicit `publishedAt` (scheduling a future post) is always
 * preserved, because a scheduled doc must stay invisible until its date.
 */
interface ResolvePublicationDateInput {
  status?: unknown
  providedPublishedAt?: unknown
  existingPublishedAt?: unknown
  now?: () => Date
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resolvePublicationDate({
  status,
  providedPublishedAt,
  existingPublishedAt,
  now = () => new Date(),
}: ResolvePublicationDateInput): string | null {
  if (status !== 'published') return null

  return nonEmptyString(providedPublishedAt) ?? nonEmptyString(existingPublishedAt) ?? now().toISOString()
}

export const ensurePublicationDate: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) return data

  data.publishedAt = resolvePublicationDate({
    status: data.status,
    providedPublishedAt: data.publishedAt,
    existingPublishedAt: originalDoc?.publishedAt,
  })

  return data
}
