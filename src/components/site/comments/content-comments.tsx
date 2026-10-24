'use client'

import type { CommentsProps } from '@lst97-oss/last-comments-widgets/react'
import { type ComponentType, useEffect, useState, useSyncExternalStore } from 'react'
import { Eyebrow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { CommentsPublicConfig } from '@/server/comments/config'

type ThemeVars = NonNullable<CommentsProps['themeVars']>
type CommentsComponent = ComponentType<CommentsProps>

// The widget takes the site's palette through the `--lc-site-*` aliases that
// src/styles/comments.css defines on `.content-comments`. The aliases are
// separate names on purpose: a widget token set to `var(--card)` would sit on the
// widget root and refer to itself, which the browser discards. Going through the
// aliases keeps every colour a live reference, so a palette change on the site
// (including a dark mode) reaches the comments too.
const siteThemeVars: ThemeVars = {
  vars: {
    background: 'var(--lc-site-card)',
    foreground: 'var(--lc-site-foreground)',
    card: 'var(--lc-site-card)',
    cardForeground: 'var(--lc-site-foreground)',
    popover: 'var(--lc-site-popover)',
    popoverForeground: 'var(--lc-site-foreground)',
    primary: 'var(--lc-site-primary)',
    primaryForeground: 'var(--lc-site-primary-foreground)',
    secondary: 'var(--lc-site-secondary)',
    secondaryForeground: 'var(--lc-site-foreground)',
    muted: 'var(--lc-site-muted)',
    mutedForeground: 'var(--lc-site-muted-foreground)',
    accent: 'var(--lc-site-accent)',
    accentForeground: 'var(--lc-site-foreground)',
    border: 'var(--lc-site-border)',
    input: 'var(--lc-site-input)',
    ring: 'var(--lc-site-ring)',
    radius: '0px',
    destructive: 'var(--lc-site-danger)',
    destructiveForeground: 'var(--lc-site-foreground)',
    borderWidth: '3px',
    controlRadius: '0px',
    avatarRadius: '0px',
    cardShadow: 'var(--lc-site-shadow)',
    dropdownShadow: 'var(--lc-site-shadow)',
    fontFamily: 'var(--lc-site-font-mono)',
    fontWeightMedium: '800',
    adminNameColor: 'var(--lc-site-danger)',
    adminBadgeBackground: 'var(--lc-site-accent)',
    adminBadgeForeground: 'var(--lc-site-foreground)',
    memberBadgeBackground: 'var(--lc-site-secondary)',
    memberBadgeForeground: 'var(--lc-site-foreground)',
  },
}

// Only the browser knows the theme: the root `<html>` class is the source of truth
// (`dark` when the page is dark). The server snapshot is light, so the first paint
// matches the default page colours.
function subscribeTheme(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function themeSnapshot(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

// The widget ships a WebAssembly syntax highlighter that the server (SSR) bundle
// cannot resolve, and the thread renders only in the browser anyway. So the widget
// and its stylesheet load through dynamic imports behind `import.meta.env.SSR`, a
// build-time constant: the server build drops that branch and never bundles the
// widget, and the detail pages stay cacheable.
function useCommentsWidget(): CommentsComponent | null {
  const [widget, setWidget] = useState<CommentsComponent | null>(null)
  useEffect(() => {
    let alive = true
    if (!import.meta.env.SSR) {
      void import('@lst97-oss/last-comments-widgets/react/styles.css')
      void import('@lst97-oss/last-comments-widgets/react').then((module) => {
        if (alive) setWidget(() => module.Comments)
      })
    }
    return () => {
      alive = false
    }
  }, [])
  return widget
}

export function ContentComments({ config, pageUrl }: { config: CommentsPublicConfig | null; pageUrl: string }) {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, () => 'light' as const)
  const CommentsWidget = useCommentsWidget()

  if (!config) return null

  return (
    <section aria-label="Comments" className="content-comments flex flex-col gap-4">
      <Eyebrow className="text-foreground">
        <span className="text-accent">
          <PixelIcon glyph="●" />
        </span>{' '}
        COMMENTS
      </Eyebrow>
      {CommentsWidget ? (
        <CommentsWidget
          site={config.siteKey}
          baseUrl={config.baseUrl}
          pageUrl={pageUrl}
          turnstileSiteKey={config.turnstileSiteKey ?? undefined}
          theme={theme}
          themeVars={siteThemeVars}
          bodyLimit={4096}
          lazy
        />
      ) : null}
    </section>
  )
}
