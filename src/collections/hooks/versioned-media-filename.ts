import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Media is served from R2 at a stable object path — `payload-cms/<filename>`
 * (see `generateFileURL` in src/server/storage/r2-storage-config.ts), and R2
 * answers with `cache-control: max-age=14400`. Payload's upload config has no
 * versioning option, so replacing an image keeps the same URL and both the
 * browser and Cloudflare's edge keep serving the previous bytes for four
 * hours. A hard reload did not help either, because a revalidation still
 * resolves to the stale cached object.
 *
 * Giving every upload a unique filename fixes it at the source: a new filename
 * is a new R2 object and a new cache key, so the old one is never consulted
 * again. The prior file is left in place rather than deleted, because another
 * document may still reference it and a delete here would race those
 * references — an orphaned object is the cheap failure, a broken image is not.
 *
 * The version is taken from the document's own upload time rather than the
 * clock at hook time, so one upload always yields one filename: a retry or a
 * re-save cannot mint a second copy.
 */
export function resolveVersionedFilename({
  filename,
  uploadedAt,
}: {
  filename: unknown
  uploadedAt?: unknown
}): string {
  if (typeof filename !== 'string' || !filename.trim()) {
    throw new Error('Media filename is required and must be a non-empty string')
  }

  const trimmed = filename.trim()

  // A file uploaded before this hook ran carries no version marker. Re-saving
  // it must still mint a new URL, so fall back to its existing upload time
  // rather than skipping versioning entirely.
  if (typeof uploadedAt !== 'string' || !uploadedAt.trim()) {
    return trimmed
  }

  // A leading dot is part of the name (`.gitignore`), not an extension
  // separator, and a trailing dot is not an extension either.
  const lastDot = trimmed.lastIndexOf('.')
  const hasExtension = lastDot > 0 && lastDot < trimmed.length - 1
  const base = hasExtension ? trimmed.slice(0, lastDot) : trimmed
  const extension = hasExtension ? trimmed.slice(lastDot) : ''

  // Compact the ISO timestamp so it is safe as a path segment: colons are
  // invalid on Windows and awkward in URLs, and these keys are listed by the
  // admin's file browser.
  const compact = uploadedAt.trim().replace(/[-:.]/g, '').replace(/Z$/, '')

  return `${base}-${compact}${extension}`
}

export const ensureVersionedMediaFilename: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) return data

  const incomingFilename = typeof data.filename === 'string' ? data.filename.trim() : ''
  const existingFilename = typeof originalDoc?.filename === 'string' ? originalDoc.filename.trim() : ''

  // An update that omits `filename` is a metadata save, not a new upload. The
  // stored name is already versioned, so there is nothing to mint — versioning
  // `existingFilename` again would append a second timestamp to a name that
  // already carries one and invalidate every reference pointing at it.
  if (!incomingFilename) {
    return data
  }

  // Only rename when the bytes actually changed. Re-saving metadata such as
  // `alt` must not invalidate a URL other documents already point at.
  if (incomingFilename && incomingFilename === existingFilename) {
    return data
  }

  const uploadedAt = typeof data.uploadedAt === 'string' ? data.uploadedAt : originalDoc?.uploadedAt
  const versioned = resolveVersionedFilename({ filename: incomingFilename || existingFilename, uploadedAt })

  if (versioned && versioned !== incomingFilename) {
    data.filename = versioned
  }

  return data
}
