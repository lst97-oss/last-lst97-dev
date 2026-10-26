/**
 * Live system status badge hosted on `status.lst97.dev`.
 *
 * Zero Vercel Fluid cost: the badge document and its polling live outside the
 * `__server` lambda. It replaces the header's old `● ONLINE` indicator, which
 * polled `/api/site/health` from every open tab.
 */
export function StatusBadge() {
  return (
    <a href="https://status.lst97.dev" aria-label="Open system status" className="system-status-embed max-sm:hidden">
      <iframe
        src="https://status.lst97.dev/embed-badges/live-status?align=start&background-light=ffffff00&text-light=000000&background-dark=00000000&text-dark=ffffff"
        width="190"
        height="30"
        loading="lazy"
        title="Live system status"
        scrolling="no"
        frameBorder="0"
        style={{ colorScheme: 'light dark', border: 0, overflow: 'hidden', display: 'inline-flex' }}
      />
      <noscript>
        <span>STATUS</span>
      </noscript>
    </a>
  )
}
