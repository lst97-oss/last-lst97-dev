import type { ChangelogChangeType } from '@/server/content/types'

export const CHANGELOG_CHANGE_TYPE_LABELS: Record<ChangelogChangeType, string> = {
  feature: 'FEATURE',
  improvement: 'IMPROVEMENT',
  bug_fix: 'BUG FIX',
  security: 'SECURITY',
  breaking_change: 'BREAKING',
  maintenance: 'MAINTENANCE',
  documentation: 'DOCS',
}
