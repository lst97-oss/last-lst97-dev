import { type ReactNode, useEffect } from 'react'
import { BootSkeleton } from '@/components/ui/skeletons'

/**
 * The class the CSS gate keys on. Added by the effect below once hydration has
 * committed, and independently by the 8s fail-open timer in the root document's
 * inline head script, so a stalled or broken load still reveals the page.
 */
const HYDRATED_CLASS = 'js-hydrated'

/** Module-level so React StrictMode's double-invoked effect cannot add it twice
 *  and so every instance agrees on a single reveal. */
let revealed = false

/**
 * Hides the server-rendered shell until hydration settles, showing a static
 * skeleton of the same geometry instead.
 *
 * Why this exists: the SSR markup is immediately mutated by the client
 * (`MelbourneClock` swaps `'MEL · SYNCING'`, `SiteHealthProvider` leaves
 * `'checking'`, `osStore` settles window states), and each swap reflows the
 * header. Gating removes the reflow instead of trying to make the mutations
 * reflow-free. `MelbourneTemperature` used to be a fourth case here; it now
 * arrives from the `_site` loader, so its reading is correct in the SSR markup.
 *
 * The effect is deliberately a plain `useEffect` with no `requestAnimationFrame`
 * and no router subscription: it fires at the commit that ends hydration, and
 * deferring past that frame would flash the skeleton on warm-cache loads. There
 * is no Suspense boundary above `SiteLayout`, so it cannot fire early.
 */
export function BootGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (revealed) return
    revealed = true
    document.documentElement.classList.add(HYDRATED_CLASS)
  }, [])

  return (
    <>
      {/* `display: contents` while gated, so this wrapper generates no box and
          `.os-site` keeps the containing block it has without the gate. */}
      <div data-boot="content">{children}</div>
      <BootSkeleton data-boot="skeleton" />
    </>
  )
}
