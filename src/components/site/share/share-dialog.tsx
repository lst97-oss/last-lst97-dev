import { cn } from 'cn'
import { AtSign, Briefcase, Check, Link, Share2, Users } from 'lucide-react'
import { Eyebrow, pixelButtonVariants } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import { SharePreview } from '@/components/site/share/share-preview'
import { buildShareTargets } from '@/components/site/share/share-targets'
import { useShareCopy } from '@/components/site/share/use-share-copy'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ContentShare } from '@/lib/content/meta'

const TARGET_ICONS = {
  x: AtSign,
  facebook: Users,
  linkedin: Briefcase,
} as const

export type ShareDialogProps = ContentShare & {
  /** Merged onto the pixel trigger button; use it to fit a tighter row. */
  triggerClassName?: string
}

/**
 * A share button and the dialog it opens, for any page that has resolved its
 * own Open Graph values. Pass a `ContentShare` from `@/lib/content/meta` and the
 * preview is by construction the card the destination will scrape.
 *
 * Uncontrolled, like `AboutSiteDialog` and `ChatHelpDialog`: no caller owns the
 * open state. `MediaViewer` needs the controlled form only because it is
 * driven by a gallery index.
 */
export function ShareDialog({ triggerClassName, ...share }: ShareDialogProps) {
  const { copy, label, message, status } = useShareCopy(share.url)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label="Share this page"
          className={cn(pixelButtonVariants(), 'share-trigger', triggerClassName)}
          type="button"
        >
          {/* `self-center` so the inline SVG's baseline descender cannot push the
              button past the `min-h-10` its row siblings sit at. */}
          <Share2 aria-hidden="true" className="size-3.5 self-center" strokeWidth={2.5} />
          SHARE
        </button>
      </DialogTrigger>
      <DialogContent className="share-dialog">
        <DialogHeader>
          <Eyebrow>
            <PixelIcon glyph="↗" /> SYSTEM / SHARE
          </Eyebrow>
          <DialogTitle>Share this page</DialogTitle>
          <DialogDescription>
            Pick a destination below. The preview is what each platform reads from this page&rsquo;s Open Graph tags,
            exactly as a link preview would render it.
          </DialogDescription>
        </DialogHeader>

        <SharePreview {...share} />

        {/* The manual-copy fallback: the clipboard API needs a secure context,
            and a read-only field can still be selected and copied by hand. */}
        <div className="share-url">
          <Input
            aria-label="Shareable link"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={share.url}
          />
        </div>

        <div className="share-targets">
          {buildShareTargets({ url: share.url, title: share.title }).map((target) => {
            if (target.id === 'copy') {
              return (
                <button
                  aria-label="Copy link"
                  className={cn('share-target', status === 'copied' ? 'share-target--copied' : 'share-target--copy')}
                  key={target.id}
                  onClick={copy}
                  type="button"
                >
                  {status === 'copied' ? (
                    <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Link aria-hidden="true" className="size-4" strokeWidth={2.5} />
                  )}
                  {label}
                </button>
              )
            }

            const Icon = TARGET_ICONS[target.id]
            return (
              <a
                className="share-target"
                href={target.href ?? undefined}
                key={target.id}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icon aria-hidden="true" className="size-4" strokeWidth={2.5} />
                {target.label}
              </a>
            )
          })}
        </div>

        <p className="share-status" role="status">
          {message}
        </p>
      </DialogContent>
    </Dialog>
  )
}
