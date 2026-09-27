export function formatPublishedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', {
    timeZone: 'Australia/Melbourne',
  })
}
