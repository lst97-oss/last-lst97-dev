/**
 * Renders the default social card at `public/og/default.webp`.
 *
 * OpenSEO's crawl of the live site flagged one code-level defect: every page
 * whose head is built by `createPageMeta` pointed `og:image`/`twitter:image`
 * at the favicon SVG. Slack, Discord, LinkedIn and X all rasterise that URL, and
 * SVG is not in the OG image spec, so the card renders blank. The card has to
 * be a real raster at OG's canonical 1200x630 ratio.
 *
 * WebP rather than PNG: every major platform accepts it (LinkedIn was the last
 * holdout, Dec 2024), and the flat brand fills survive a lossy encode exactly
 * — measured 0 delta on every solid probe — at 41% fewer bytes than the PNG,
 * which matters against Slack's ~500KB soft limit. The raster is emitted
 * straight from the SVG, so no intermediate PNG is ever written.
 *
 * Run with `bun run generate:og-image`; the file is committed because it must
 * resolve as a static asset with a stable URL and no build-time rasteriser in
 * the request path.
 */
import sharp from 'sharp'
import { projectRoot } from '../project-root'

const WIDTH = 1200
const HEIGHT = 630

/** Lossy quality, tuned against the flat palette rather than by eye. */
const QUALITY = 86

// Resolved from the repo root, not from `import.meta.url`: a script-relative
// URL silently wrote to `scripts/public/og/` instead of `public/og/`, so the
// card the site actually serves was never the one this script regenerated.
const OUTPUT_PATH = `${projectRoot}/public/og/default.webp`

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

// `removeAlpha()` is a no-op on this SVG raster (it rasterises fully opaque),
// but it guarantees the committed card carries no fourth channel, which is what
// made the original PNG 40KB for a flat-colour graphic.
const webp = await sharp(Buffer.from(renderCard())).removeAlpha().webp({ quality: QUALITY, effort: 6 }).toBuffer()

await Bun.write(OUTPUT_PATH, webp)

const { width, height } = await sharp(webp).metadata()
console.log(`Wrote ${OUTPUT_PATH} (${width}x${height}, ${webp.byteLength} bytes)`)
