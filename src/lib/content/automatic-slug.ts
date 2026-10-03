interface AutomaticSlugInput {
  title: unknown
  currentSlug: unknown
  previousAutomaticSlug?: string | null
}

export function slugifyContentTitle(title: unknown): string {
  if (typeof title !== 'string') return ''

  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function automaticSlugForTitle({
  title,
  currentSlug,
  previousAutomaticSlug,
}: AutomaticSlugInput): string | null {
  const current = typeof currentSlug === 'string' ? currentSlug.trim() : ''
  if (current && current !== previousAutomaticSlug) return null

  const generated = slugifyContentTitle(title)
  return generated && generated !== current ? generated : null
}
