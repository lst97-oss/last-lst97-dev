/**
 * Renders the default social card at `public/og/default.png`.
 *
 * OpenSEO's crawl of the live site flagged one code-level defect: every page
 * whose head is built by `createPageMeta` pointed `og:image`/`twitter:image`
 * at the favicon SVG. Slack, Discord, LinkedIn and X rasterise that URL, and
 * SVG is not in the OG image spec, so the card renders blank. The card has to
 * be a real PNG of OG's canonical 1200x630 ratio.
 *
 * Run with `bun run generate:og-image`; the PNG is committed because it must
 * resolve as a static asset with a stable URL and no build-time rasteriser in
 * the request path.
 */
import sharp from 'sharp'

const WIDTH = 1200
const HEIGHT = 630
const OUTPUT_PATH = new URL('../public/og/default.png', import.meta.url)

/** Brand palette, mirrored from src/styles/globals.css. */
const CREAM = '#fff7df'
const INK = '#17171f'
const INK_SOFT = '#4a4a55'
const YELLOW = '#ffd34e'
const CORAL = '#ff7969'
const TEAL = '#64d8c4'

/** `Arial Black` matches `--font-display` in src/styles/tokens.css. */
const DISPLAY_FONT = 'Arial Black, Impact, sans-serif'
const BODY_FONT = 'Helvetica Neue, Arial, sans-serif'

/**
 * Wraps to a fixed width instead of measuring text: sharp rasterises SVG
 * without a shaping engine, so overlong lines would silently overflow the
 * card instead of wrapping.
 */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && candidate.length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderCard(): string {
  const descriptionLines = wrap('A pixel-art personal operating system for ideas, projects, and conversations.', 46)

  const description = descriptionLines
    .map(
      (line, index) =>
        `<text x="80" y="${372 + index * 34}" font-family="${BODY_FONT}" font-size="27" fill="${INK_SOFT}">${escapeXml(line)}</text>`,
    )
    .join('\n    ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${CREAM}"/>
  <rect x="0" y="0" width="${WIDTH}" height="14" fill="${CORAL}"/>
  <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="${TEAL}"/>
  <rect x="28" y="28" width="${WIDTH - 56}" height="${HEIGHT - 56}" fill="none" stroke="${INK}" stroke-width="6"/>
  <rect x="46" y="46" width="${WIDTH - 92}" height="${HEIGHT - 92}" fill="none" stroke="${INK}" stroke-width="2"/>

  <rect x="80" y="96" width="46" height="46" fill="${YELLOW}" stroke="${INK}" stroke-width="4"/>
  <text x="152" y="140" font-family="${DISPLAY_FONT}" font-size="58" fill="${INK}" letter-spacing="2">LAST//OS</text>

  <text x="80" y="248" font-family="${DISPLAY_FONT}" font-size="86" fill="${INK}">Personal system</text>
  <text x="80" y="336" font-family="${DISPLAY_FONT}" font-size="86" fill="${INK}">online</text>

  ${description}

  <line x1="80" y1="524" x2="${WIDTH - 80}" y2="524" stroke="${INK}" stroke-width="3"/>
  <rect x="80" y="552" width="22" height="22" fill="${CORAL}" stroke="${INK}" stroke-width="3"/>
  <text x="120" y="572" font-family="${BODY_FONT}" font-size="26" font-weight="bold" fill="${INK}">www.lst97.dev</text>
</svg>`
}

const png = await sharp(Buffer.from(renderCard())).png({ compressionLevel: 9 }).toBuffer()

await Bun.write(OUTPUT_PATH, png)

const { width, height } = await sharp(png).metadata()
console.log(`Wrote ${OUTPUT_PATH.pathname} (${width}x${height}, ${png.byteLength} bytes)`)
