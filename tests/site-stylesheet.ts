import { Window } from 'happy-dom'

/**
 * `src/styles.css` is only a `@layer` declaration plus `@import` statements, and
 * happy-dom never resolves `@import`. Loading it directly therefore leaves
 * `sheet.cssRules` empty and every computed-style lookup returns "". Inline the
 * entry and each relative partial it pulls in, in the order the browser applies
 * them, so a style assertion reads what the site actually ships.
 */
export async function loadSiteStylesheet(): Promise<string> {
  const entryUrl = new URL('../src/styles.css', import.meta.url)
  const entry = await Bun.file(entryUrl).text()
  const partialUrls = [...entry.matchAll(/@import\s+"(\.[^"]+)";/g)].map(
    (match) => new URL(match[1] as string, entryUrl),
  )
  const partials = await Promise.all(partialUrls.map((url) => Bun.file(url).text()))

  return [entry, ...partials].join('\n')
}

/** Creates a browser window with the full resolved site stylesheet attached. */
/**
 * `HTMLStyleElement` resolves to happy-dom's class here but to lib.dom's
 * interface under tsc, so the return type names happy-dom's own element type.
 */
export async function createSiteStyleWindow(): Promise<{
  window: Window
  styleElement: Window['document']['head']['children'][number]
}> {
  const window = new Window()
  const styleElement = window.document.createElement('style')
  styleElement.textContent = await loadSiteStylesheet()
  window.document.head.append(styleElement)

  return { window, styleElement }
}
