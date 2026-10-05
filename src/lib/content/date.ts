/**
 * `day`/`month` are pinned to `2-digit` on purpose. With the fields left to
 * the default, ICU 77 (Bun) resolves en-AU to `21/9/2026` while ICU 78
 * (Chromium, Node 22) resolves it to `21/09/2026`, so the server-rendered card
 * date and the hydrated one disagree and React discards the subtree. Stating
 * the fields explicitly makes both builds emit the padded form.
 */
const publishedDateFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatPublishedDate(value: string): string {
  return publishedDateFormatter.format(new Date(value))
}

/**
 * The most meaningful date for a list card: publication when there is one,
 * otherwise the last update. Null when neither is usable, so callers can skip
 * the date row entirely.
 */
export function contentCardDate(publishedAt: string | null | undefined, updatedAt?: string | null): string | null {
  if (publishedAt) {
    const parsed = Date.parse(publishedAt)
    if (Number.isFinite(parsed)) return formatPublishedDate(publishedAt)
  }
  if (updatedAt) {
    const parsed = Date.parse(updatedAt)
    if (Number.isFinite(parsed)) return formatPublishedDate(updatedAt)
  }
  return null
}

/** Average silent reading speed. 900 CJK characters or ~200 words per minute. */
const CHARACTERS_PER_MINUTE = 900

/**
 * Sums the character count of every text node in the serialized Lexical
 * tree, so it works for any block type and counts CJK correctly — a word-based
 * estimate treats a whole Chinese sentence as one "word". Null when there is
 * no content to measure.
 */
export function readingTimeMinutes(content: unknown): number | null {
  let characters = 0

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }
    if (typeof node !== 'object' || node === null) return

    const record = node as Record<string, unknown>
    if (typeof record.text === 'string') characters += record.text.trim().length
    // A Lexical document nests under `root`; without this nothing below the
    // root is ever visited and every reading time comes back null.
    if (record.root !== undefined) walk(record.root)
    if (record.children !== undefined) walk(record.children)
  }

  walk(content)

  if (characters === 0) return null
  return Math.max(1, Math.round(characters / CHARACTERS_PER_MINUTE))
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} MIN READ`
}
