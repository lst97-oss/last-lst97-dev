import { cn } from 'cn'

import {
  PixelSkeletonBar,
  PixelSkeletonBlock,
  PixelSkeletonLines,
  PixelSkeletonWindow,
} from '@/components/ui/skeletons/pixel-skeleton'

/**
 * The pre-hydration boot state for the whole public site.
 *
 * Unlike every other skeleton here, this one replaces the entire document, so
 * it restates the shell chrome from `DesktopShell` rather than composing a
 * `PixelSkeletonWindow` page. The class lists below are copied from
 * `src/components/site/shell.tsx` deliberately: the reveal swaps this subtree
 * for the real shell, and any divergence in `system-bar`, `desktop-workspace`,
 * `desktop-shortcuts` or `desktop-main` is a layout shift at exactly the moment
 * the user is meant to stop seeing movement.
 *
 * It stays pure markup — no effects, no store reads, no client-only values —
 * because it is painted from SSR HTML before a single byte of JS has run.
 * `bg-background/35` on the header stubs is likewise load-bearing: they sit on
 * the bar's `bg-foreground` and `PixelSkeletonBlock`'s default `bg-accent`
 * would be invisible there.
 */

/** Four entries, matching `headerMenus` in `shell.tsx`. */
const MENU_STUBS = [0, 1, 2, 3] as const

/** Seven entries, matching `shortcuts` in `shell.tsx`. */
const SHORTCUT_STUBS = [0, 1, 2, 3, 4, 5, 6] as const

const SYSTEM_BAR_CLASS =
  'system-bar sticky top-0 z-20 flex min-h-12 items-center justify-between gap-2 border-b-3 border-border bg-foreground px-3 py-2 text-xs font-black tracking-widest text-background uppercase sm:gap-5 sm:px-5'

export function BootSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-label="Loading LAST//OS"
      className={cn('os-site flex h-dvh flex-col overflow-hidden bg-background', className)}
      data-boot="skeleton"
      data-skeleton="boot"
      role="status"
      {...props}
    >
      <header className={SYSTEM_BAR_CLASS}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <PixelSkeletonBlock className="size-3.5 shrink-0 bg-background/35" />
          <PixelSkeletonBar className="h-3 bg-background/35" width={55} />
          <span className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
            {MENU_STUBS.map((stub) => (
              <PixelSkeletonBar className="h-2.5 bg-background/35" key={stub} width={40} />
            ))}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <PixelSkeletonBlock className="size-2.5 bg-background/35" />
          <PixelSkeletonBlock className="h-2.5 w-10 bg-background/35" />
          <PixelSkeletonBlock className="h-2.5 w-8 bg-background/35" />
        </div>
      </header>

      <div className="desktop-workspace relative z-10 grid flex-1">
        <div className="desktop-shortcuts">
          <div className="desktop-shortcuts-viewport">
            <div className="boot-shortcuts-scroll">
              {SHORTCUT_STUBS.map((stub) => (
                <div className="flex flex-col items-center gap-1.5 text-center" key={stub}>
                  <span className="grid size-11 place-items-center border-3 border-border bg-card text-2xl shadow-os-sm" />
                  <PixelSkeletonBlock className="h-2 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="desktop-main min-w-0 px-5 py-8 sm:px-8 lg:px-16">
          <PixelSkeletonWindow icon="◆" title="loading.sys">
            <div className="flex w-full max-w-2xl flex-col items-stretch gap-6 py-10">
              <PixelSkeletonLines count={3} lastWidth={70} />
              <span aria-hidden="true" className="loading-dots self-center">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          </PixelSkeletonWindow>
        </div>
      </div>
    </div>
  )
}
