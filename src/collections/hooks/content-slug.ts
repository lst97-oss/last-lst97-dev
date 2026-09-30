import type { CollectionBeforeValidateHook } from 'payload'
import { slugifyContentTitle } from '@/lib/content/automatic-slug'

interface ResolveContentSlugInput {
  title?: unknown
  providedSlug?: unknown
  existingSlug?: unknown
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resolveContentSlug({ title, providedSlug, existingSlug }: ResolveContentSlugInput): string {
  const explicitSlug = nonEmptyString(providedSlug)
  if (explicitSlug) return explicitSlug

  const persistedSlug = nonEmptyString(existingSlug)
  if (persistedSlug) return persistedSlug

  return slugifyContentTitle(title)
}

export const ensureContentSlug: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data

  data.slug = resolveContentSlug({
    title: data.title ?? originalDoc?.title,
    providedSlug: data.slug,
    existingSlug: originalDoc?.slug,
  })

  return data
}
