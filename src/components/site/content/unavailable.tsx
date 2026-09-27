import { useRouter } from '@tanstack/react-router'
import { PixelIcon } from '../pixel-icon'
import { WindowFrame } from '../window-frame'

export function ContentUnavailablePanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty-panel large-empty content-unavailable" role="alert">
      <PixelIcon glyph="◇" />
      <h2>Connection interrupted.</h2>
      <p>{message}</p>
      <button className="pixel-button" onClick={onRetry} type="button">RETRY CONNECTION</button>
    </div>
  )
}

export function ContentUnavailableRoute({
  title,
  icon,
  message,
}: {
  title: string
  icon: string
  message: string
}) {
  const router = useRouter()

  return (
    <div className="page-stack">
      <WindowFrame title={title} icon={icon}>
        <ContentUnavailablePanel message={message} onRetry={() => void router.invalidate()} />
      </WindowFrame>
    </div>
  )
}
