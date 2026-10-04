export interface ShareTarget {
  id: 'copy' | 'x' | 'facebook' | 'linkedin'
  label: string
  /** null for `copy`, which acts on the clipboard rather than opening a page. */
  href: string | null
}

/**
 * The destinations the share dialog offers, in display order.
 *
 * There is no equivalent helper in the repo: `src/lib/content/url.ts` only
 * validates protocols, and none of these platforms take a share through a POST
 * or an SDK, so each one is a plain query string. A title is optional for X
 * because a link alone is a valid post — emitting `text=` with an empty value
 * would put a stray `&` in the URL for no reason.
 */
export function buildShareTargets({ url, title }: { url: string; title: string }): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = title.trim()
  const xText = encodedTitle ? `&text=${encodeURIComponent(encodedTitle)}` : ''

  return [
    { id: 'copy', label: 'COPY LINK', href: null },
    { id: 'x', label: 'X', href: `https://x.com/intent/post?url=${encodedUrl}${xText}` },
    {
      id: 'facebook',
      label: 'FACEBOOK',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'linkedin',
      label: 'LINKEDIN',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ]
}
