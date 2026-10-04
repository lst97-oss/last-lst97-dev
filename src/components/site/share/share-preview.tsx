import type { ContentShare } from '@/lib/content/meta'

function previewLocation(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.host.toUpperCase()}${parsed.pathname}`
  } catch {
    // `resolveContentShare` builds the URL from `canonicalUrl`, which cannot
    // produce a malformed value. A caller passing its own `url` still can, and a
    // raw string is a better preview than a thrown render.
    return url
  }
}

export type SharePreviewProps = ContentShare

/**
 * What a link preview on the destination platform will actually show: the
 * card image, then the title, then the description, with the origin and path
 * above them. Every value comes from the caller, which is expected to pass the
 * `ContentShare` that `createContentMeta` wrote into the head — this component
 * resolves nothing, so the preview cannot drift from `og:*`.
 */
export function SharePreview({ url, title, description, image }: SharePreviewProps) {
  return (
    <div className="share-preview">
      <p className="share-preview-location">{previewLocation(url)}</p>

      <img
        alt={image.alt}
        className="share-preview-image"
        decoding="async"
        height={image.height || undefined}
        loading="lazy"
        src={image.url}
        width={image.width || undefined}
      />

      <p className="share-preview-title">{title}</p>
      {description ? <p className="share-preview-description">{description}</p> : null}

      {/* A fallback card is what the platform will really render, so the preview
          says so rather than passing the site card off as this document's own
          artwork. */}
      {image.isDefault ? <p className="share-preview-note">SITE DEFAULT CARD — NO COVER IMAGE</p> : null}
    </div>
  )
}
