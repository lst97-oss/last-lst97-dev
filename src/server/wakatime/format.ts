export function formatHours(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0 mins'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes} mins`
  if (minutes === 0) return `${hours} hrs`
  return `${hours} hrs ${minutes} mins`
}
