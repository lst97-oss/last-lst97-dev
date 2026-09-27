import type { PublicCitation } from '../../server/knowledge/retrieve'

function safeHttpHref(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function ChatCitations({ citations }: { citations: PublicCitation[] }) {
  const safeCitations = citations.flatMap((citation) => {
    const href = safeHttpHref(citation.url)
    return href && citation.title.trim() ? [{ ...citation, href }] : []
  })
  if (safeCitations.length === 0) return null

  return (
    <div
      aria-label="Sources"
      className="chat-citations mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/20 pt-2 text-[11px] leading-relaxed"
    >
      <span className="text-[9px] font-black tracking-[0.12em] text-[var(--os-yellow)]">SOURCES</span>
      {safeCitations.map(({ id, title, href, isPublic }) => (
        <span key={`${id}-${href}`} className="inline-flex items-center gap-1">
          <a
            href={href}
            rel="noreferrer noopener"
            target="_blank"
            className="font-medium text-[var(--os-yellow)] underline decoration-1 underline-offset-2 hover:text-[var(--os-paper)]"
          >
            [{id}] {title}
          </a>
          {isPublic ? null : (
            <span className="rounded-sm border border-[var(--os-yellow)]/60 px-1 font-bold text-[8px] uppercase tracking-[0.08em] text-[var(--os-yellow)]">
              private
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
