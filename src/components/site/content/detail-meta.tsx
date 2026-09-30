import { CalendarDays, Clock3, Plus, RotateCcwClock } from 'lucide-react'

/**
 * One byline field. The icon is decorative — the label beside it is the
 * accessible text — so it is hidden from assistive tech rather than repeated
 * as an aria-label.
 */
function MetaField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.5} />
      <span>{label}</span>
      <span aria-hidden="true">/</span>
      <span>{value}</span>
    </span>
  )
}

/**
 * The byline strip shared by every content detail page (blog note, changelog
 * entry, project). One component rather than a per-route copy: the fields, the
 * uppercase treatment, and the label order were duplicated across three files
 * and had already drifted into three different shapes.
 *
 * Each field renders nothing when absent, and the strip renders nothing at all
 * when no field has a value, so a document missing every date reserves no space.
 */
export function DetailMeta({
  published,
  created,
  updated,
  readingTime,
}: {
  published?: string | null
  created?: string | null
  updated?: string | null
  readingTime?: string | null
}) {
  if (!published && !created && !updated && !readingTime) return null

  return (
    <div className="detail-meta mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-black tracking-widest text-muted-foreground uppercase">
      {published ? <MetaField icon={CalendarDays} label="PUBLISHED" value={published} /> : null}
      {created ? <MetaField icon={Plus} label="CREATED" value={created} /> : null}
      {updated ? <MetaField icon={RotateCcwClock} label="UPDATED" value={updated} /> : null}
      {readingTime ? <MetaField icon={Clock3} label="READ" value={readingTime} /> : null}
    </div>
  )
}
