'use client'

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Site toast host. Mounted once, by `src/routes/_site.tsx`, so every public
 * route can call `toast()` without each surface owning a provider — Payload's
 * admin mounts its own Toaster inside `@payloadcms/ui`, and `/_payload/admin`
 * is a sibling of `/_site`, so the two never double up.
 *
 * `theme` is pinned to `light` rather than `system` on purpose. Nothing in the
 * site adds `html.dark` (the `.dark` token block exists in globals.css, but no
 * code sets the class), so `system` would let an OS-dark machine put
 * `data-sonner-theme=dark` on the container and paint sonner's own dark
 * palette — including a hardcoded `#e8e8e8` description colour — over the
 * site's light `--card`. When `html.dark` becomes real, this becomes a read of
 * that class.
 *
 * The token mapping must stay INLINE. Sonner's sheet has
 * `[data-sonner-toaster][data-sonner-theme=light]` (specificity 0,2,0) setting
 * the same custom properties, and it lands on the element itself, so a class
 * rule cannot beat it — only an inline declaration can. Everything that is a
 * real property rather than a custom property lives in `shell.css` under
 * `.os-toaster`.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="os-toaster"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // Inline because sonner's `[data-sonner-toaster][data-sonner-theme=light]`
          // sets these same properties ON this element at specificity 0,2,0 —
          // only an inline declaration outranks it. See the note above.
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '0',
        } as React.CSSProperties
      }
      // Below Tailwind's `sm` the mobile tab bar owns the bottom of every
      // window (`--os-tab-bar-height`, see responsive.css), and sonner's default
      // 16px would put a toast underneath it. The bar's *reserve* is declared
      // on `.os-site`, which is not an ancestor of the toaster, so the height
      // token is what resolves from here.
      mobileOffset={{ bottom: 'calc(var(--os-tab-bar-height) + 16px)' }}
      {...props}
    />
  )
}

export { Toaster }
