import { cn } from 'cn'
import { PixelIcon } from '@/components/site/pixel-icon'
import type { ServiceInfoSection } from '@/lib/services/packages'

// The same muted surface pairs /contact already uses for its three panels
// (_site.contact.tsx), so the services page adds no new colour values.
const TONE_CLASS: Record<ServiceInfoSection['tone'], string> = {
  info: 'bg-info-muted',
  warning: 'bg-warning-muted',
  success: 'bg-success-muted',
  error: 'bg-error-muted',
}

export function ServiceInfoPanel({ section }: { section: ServiceInfoSection }) {
  return (
    <details className={cn('border-2 border-border p-5 shadow-os-sm', TONE_CLASS[section.tone])} id={section.id}>
      <summary className="service-info-panel__summary--markerless cursor-pointer">
        <span className="mb-2 block text-xs leading-snug font-black tracking-widest text-accent uppercase">
          {section.title}
        </span>
        <span className="block text-lg leading-tight font-black">{section.lead}</span>
      </summary>
      <ul className="m-0 mt-4 flex list-none flex-col gap-3 border-t-2 border-border/50 p-0 pt-4 text-xs leading-relaxed font-bold">
        {section.items.map((item) => (
          <li key={item}>
            <PixelIcon glyph="◆" className="mr-2 text-foreground" /> {item}
          </li>
        ))}
      </ul>
    </details>
  )
}
