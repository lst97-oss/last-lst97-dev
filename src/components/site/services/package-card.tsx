import { cn } from 'cn'
import { CountBadge, Eyebrow, Tag } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { ServicePackage } from '@/lib/services/packages'

// Matches the CMS card surface in content/card.tsx without the cover slot: a
// price card has no image, and the hover shift is what makes it read as a card.
const cardClass =
  'flex h-full flex-col items-start border-3 border-border bg-card p-5 transition-[translate,background-color] duration-100 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-warning-muted'

const featureListClass = 'm-0 flex list-none flex-col gap-2 p-0 text-xs font-extrabold'
const fullListClass = 'm-0 mt-3 flex list-none flex-col gap-2 border-t-2 border-border pt-3 text-xs font-bold'

const INHERITED_LABEL: Record<NonNullable<ServicePackage['inherits']>, string> = {
  starter: 'Everything in Starter, plus',
  business: 'Everything in Business, with additional scope for',
}

export function ServicePackageCard({ pkg }: { pkg: ServicePackage }) {
  return (
    <article className={cn(cardClass, 'service-package-card', `service-package-card--${pkg.slug}`)}>
      <div className="mb-3 flex w-full flex-wrap items-start justify-between gap-2">
        <div>
          <Eyebrow className="mb-0">
            <PixelIcon glyph={pkg.emphasis ? '★' : '◆'} /> {pkg.name}
          </Eyebrow>
          {pkg.emphasis ? <Tag className="mt-2 border-accent bg-warning-muted">RECOMMENDED</Tag> : null}
        </div>
        <CountBadge>{pkg.price}</CountBadge>
      </div>
      <h3 className="mb-2 text-2xl leading-tight">{pkg.tagline}</h3>
      <p className="mb-3 text-sm leading-relaxed font-bold text-muted-foreground">{pkg.bestFor}</p>
      <ul className={featureListClass}>
        {pkg.highlights.map((item) => (
          <li key={item}>
            <PixelIcon glyph="◆" className="mr-2 text-foreground" /> {item}
          </li>
        ))}
      </ul>
      <details className="mt-4 w-full border-t-2 border-border pt-3">
        <summary className="cursor-pointer text-xs font-black tracking-wide text-accent">View full inclusions</summary>
        {pkg.inherits ? (
          <p className="mb-2 mt-3 text-xs font-black tracking-widest text-muted-foreground uppercase">
            {INHERITED_LABEL[pkg.inherits]}
          </p>
        ) : null}
        <ul className={fullListClass}>
          {pkg.includes.map((item) => (
            <li key={item}>
              <PixelIcon glyph="◆" className="mr-2 text-foreground" /> {item}
            </li>
          ))}
        </ul>
      </details>
    </article>
  )
}
