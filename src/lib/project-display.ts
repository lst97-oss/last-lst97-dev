import type { ProjectLifecycle } from '../server/content/types'

const lifecycleLabels: Record<ProjectLifecycle, string> = {
  planned: 'PLANNED',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  archived: 'ARCHIVED',
}

function yearOf(value: string | null): number | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear()
}

export function getProjectLifecycleLabel(status: ProjectLifecycle | null): string | null {
  return status ? lifecycleLabels[status] : null
}

export function formatProjectTimeframe(
  status: ProjectLifecycle | null,
  startDate: string | null,
  endDate: string | null,
): string | null {
  const startYear = yearOf(startDate)
  const endYear = yearOf(endDate)

  if (startYear && endYear) return `${startYear}–${endYear}`
  if (startYear && status === 'in_progress') return `${startYear}–PRESENT`
  if (startYear) return String(startYear)
  if (endYear) return String(endYear)
  return null
}
