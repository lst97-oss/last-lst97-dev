const melbourneDateFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatMelbourneDate(date: Date): string {
  return melbourneDateFormatter.format(date).toUpperCase()
}

const melbourneShortDateFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatMelbourneShortDate(date: Date): string {
  const parts = melbourneShortDateFormatter.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')} ${get('month')} ${get('hour')}:${get('minute')}`.toUpperCase()
}
