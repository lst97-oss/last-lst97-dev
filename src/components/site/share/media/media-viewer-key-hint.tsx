import { Kbd } from '@/components/ui/kbd'

/**
 * The viewer's keyboard affordances: arrows navigate, Escape closes.
 *
 * Separate from `MediaViewer` because that component is only ever visible
 * inside a Base UI Dialog portal, whose content never appears in server-rendered
 * markup — so a hint asserted from `MediaViewer`'s own output cannot be tested
 * at all. This row has no dialog dependency, so it renders and reads normally.
 *
 * The arrow chips appear only when there is more than one image, mirroring the
 * PREV/NEXT controls above it: with a single image the hint is just Escape.
 */
export function MediaViewerKeyHint({ hasMultiple }: { hasMultiple: boolean }) {
  return (
    <p className="media-viewer-key-hint">
      {hasMultiple ? (
        <>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <span>NAVIGATE</span>
        </>
      ) : null}
      <Kbd>ESC</Kbd>
      <span>CLOSE</span>
    </p>
  )
}
