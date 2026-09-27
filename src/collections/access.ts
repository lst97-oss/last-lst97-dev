import type { Where } from 'payload'

export function publishedAccess(): Where {
  return {
    and: [
      { status: { equals: 'published' } },
      { publishedAt: { less_than_equal: new Date().toISOString() } },
    ],
  }
}
