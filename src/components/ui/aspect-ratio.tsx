import { cn } from 'cn'

/**
 * A box that reserves a fixed ratio for whatever it contains.
 *
 * `ratio` is width ÷ height, so a 16:9 box is `16 / 9`. The image or child inside it must be
 * `size-full`, because the ratio fixes the box and the child fills it.
 *
 * This is the only way a fixed image ratio is declared in this repo — the covers, the gallery
 * tiles, and the share preview card all route through here rather than repeating `aspect-video`
 * or a hand-written `aspect-ratio` declaration. No `'use client'`: there is no state, no effect,
 * and no browser API, so it renders on the server too.
 */
function AspectRatio({ ratio, className, ...props }: React.ComponentProps<'div'> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          '--ratio': ratio,
        } as React.CSSProperties
      }
      className={cn('relative aspect-(--ratio)', className)}
      {...props}
    />
  )
}

export { AspectRatio }
