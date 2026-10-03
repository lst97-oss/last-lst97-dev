import { SERVICE_ADDONS, SERVICE_ADDONS_NOTE } from '@/lib/services/packages'

/**
 * Add-on price list. A definition grid rather than a `<table>`: two columns of
 * label and price, so the tab stops, reading order and mobile stacking stay the
 * OS default instead of needing a bespoke responsive table rule.
 */
export function ServiceAddOnTable() {
  return (
    <>
      <div className="border-3 border-border bg-card shadow-os-sm">
        {SERVICE_ADDONS.map((addon) => (
          <div
            className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-border px-4 py-2.5 last:border-b-0"
            key={addon.name}
          >
            <span className="text-sm font-black">{addon.name}</span>
            <span className="font-black tracking-wider text-accent">{addon.price}</span>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-3 text-xs leading-relaxed text-muted-foreground">{SERVICE_ADDONS_NOTE}</p>
    </>
  )
}
