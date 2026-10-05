import { useCallback, useEffect, useRef, useState } from 'react'

/** How long the copy tile stays in its confirmed state before reverting. */
const COPIED_RESET_MS = 2000

export type ShareCopyStatus = 'idle' | 'copied' | 'failed'

export type ShareCopy = {
  /** The tile label: `COPY LINK`, or `COPIED` for two seconds after a success. */
  label: string
  /** Announced in the dialog's `role="status"` line; empty while idle. */
  message: string
  status: ShareCopyStatus
  copy: () => Promise<void>
}

/**
 * The clipboard half of the share dialog, as its own hook so the state machine
 * is testable on its own — a mounted dialog would drag the whole portal,
 * focus-trap and scroll-area surface into every assertion.
 *
 * `idle` is the honest default. The clipboard API needs a secure context, so on
 * an insecure origin this stays `idle` and the dialog's read-only link field is
 * the fallback; a rejected write reports `failed` rather than claiming success.
 */
export function useShareCopy(url: string): ShareCopy {
  const [status, setStatus] = useState<ShareCopyStatus>('idle')
  const resetTimer = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      // A dialog closed inside the two-second window would otherwise set state
      // after unmount.
      window.clearTimeout(resetTimer.current)
    },
    [],
  )

  const copy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      window.clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setStatus('idle'), COPIED_RESET_MS)
    } catch {
      // Never report a copy that did not happen.
      setStatus('failed')
    }
  }, [url])

  return {
    label: status === 'copied' ? 'COPIED' : 'COPY LINK',
    message: status === 'copied' ? 'LINK COPIED' : status === 'failed' ? 'COPY FAILED — USE THE LINK ABOVE' : '',
    status,
    copy,
  }
}
