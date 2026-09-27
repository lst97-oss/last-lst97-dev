const projectDemoUrls: Readonly<Record<string, string>> = {
  'lst97/gnaf-autocomplete': 'https://gnaf.lst97.dev',
  'lst97/smartplay-hk-oss': 'https://sphkoss.lst97.dev',
}

export function getOwnerProvidedProjectDemoUrl(repositoryFullName: string): string | undefined {
  const demoUrl = projectDemoUrls[repositoryFullName.trim().toLowerCase()]
  if (!demoUrl || !URL.canParse(demoUrl)) return undefined

  const parsed = new URL(demoUrl)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'gnaf.lst97.dev' && parsed.hostname !== 'sphkoss.lst97.dev') {
    return undefined
  }
  return parsed.href
}
