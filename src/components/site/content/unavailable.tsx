import { useRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { EmptyPanel, PageStack, pixelButtonVariants } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { WindowFrame } from '@/components/site/window-frame'

export function ContentUnavailablePanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyPanel className="content-unavailable min-h-82 items-center text-center" role="alert">
      <PixelIcon glyph="◇" className="text-2xl" />
      <h2 className="m-0">Connection interrupted.</h2>
      <p className="m-0">{message}</p>
      <button className={cn(pixelButtonVariants())} onClick={onRetry} type="button">RETRY CONNECTION</button>
    </EmptyPanel>
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
    <PageStack>
      <WindowFrame title={title} icon={icon}>
        <ContentUnavailablePanel message={message} onRetry={() => void router.invalidate()} />
      </WindowFrame>
    </PageStack>
  )
}
