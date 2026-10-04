import { Buffer } from 'node:buffer'
import sharp from 'sharp'
import { z } from 'zod'
import {
  SITE_NAME,
  SITE_OG_IMAGE_DESCRIPTION_LIMIT,
  SITE_OG_IMAGE_HEIGHT,
  SITE_OG_IMAGE_TITLE_LIMIT,
  SITE_OG_IMAGE_WIDTH,
} from '@/lib/seo/site-seo'
import artworkDataUrl from './og-artwork.webp?inline'

const INK = '#17171f'
const INK_SOFT = '#3c3b4a'
const YELLOW = '#ffd34e'
const CORAL = '#ff7969'
const DISPLAY_FONT = 'Arial Black, Impact, sans-serif'
const BODY_FONT = 'Helvetica Neue, Arial, sans-serif'
const TITLE_MAX_CHARS_PER_LINE = 28
const TITLE_MAX_LINES = 2
const DESCRIPTION_MAX_CHARS_PER_LINE = 41
const DESCRIPTION_MAX_LINES = 4
const TITLE_FONT_SIZE = 62
const TITLE_LINE_HEIGHT = 76
const DESCRIPTION_FONT_SIZE = 29
const DESCRIPTION_LINE_HEIGHT = 39
const BRAND_FONT_SIZE = 26
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'

const imageRequestSchema = z.object({
  title: z.string().trim().min(1).max(SITE_OG_IMAGE_TITLE_LIMIT),
  description: z.string().trim().max(SITE_OG_IMAGE_DESCRIPTION_LIMIT),
})

const artworkBytes = decodeArtworkDataUrl(artworkDataUrl)

function decodeArtworkDataUrl(value: string): Uint8Array {
  const separator = value.indexOf(',')
  if (separator < 0 || !value.startsWith('data:image/webp;base64,')) {
    throw new Error('OG artwork must be an inline WebP data URL')
  }

  const decoded = atob(value.slice(separator + 1))
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

function normalizeText(value: string): string {
  const withoutControlCharacters = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < 32 || codePoint === 127 ? ' ' : character
  }).join('')

  return withoutControlCharacters.replace(/\s+/g, ' ').trim()
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fitAtWordBoundary(value: string, maxChars: number): string {
  let visible = ''
  for (const word of value.split(' ')) {
    const candidate = visible ? `${visible} ${word}` : word
    if (candidate.length > maxChars) break
    visible = candidate
  }

  return visible || value.slice(0, maxChars).trimEnd()
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = normalizeText(value).split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length <= maxCharsPerLine) {
      line = candidate
      continue
    }

    if (lines.length === maxLines - 1) {
      const visible = fitAtWordBoundary(candidate, maxCharsPerLine - 1)
      return [...lines, `${visible}…`]
    }

    if (line) lines.push(line)
    if (word.length > maxCharsPerLine) return [...lines, `${word.slice(0, maxCharsPerLine - 1)}…`]
    line = word
  }

  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

function renderOverlay(title: string, description: string): Uint8Array {
  const titleLines = wrapText(title, TITLE_MAX_CHARS_PER_LINE, TITLE_MAX_LINES)
  const descriptionLines = wrapText(description, DESCRIPTION_MAX_CHARS_PER_LINE, DESCRIPTION_MAX_LINES)
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="82" y="${216 + index * TITLE_LINE_HEIGHT}" font-family="${DISPLAY_FONT}" font-size="${TITLE_FONT_SIZE}" font-weight="900" fill="${INK}">${escapeXml(line)}</text>`,
    )
    .join('\n')
  const descriptionStartY = 216 + titleLines.length * TITLE_LINE_HEIGHT + 28
  const descriptionMarkup = descriptionLines
    .map(
      (line, index) =>
        `<text x="86" y="${descriptionStartY + index * DESCRIPTION_LINE_HEIGHT}" font-family="${BODY_FONT}" font-size="${DESCRIPTION_FONT_SIZE}" font-weight="600" fill="${INK_SOFT}">${escapeXml(line)}</text>`,
    )
    .join('\n')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SITE_OG_IMAGE_WIDTH}" height="${SITE_OG_IMAGE_HEIGHT}" viewBox="0 0 ${SITE_OG_IMAGE_WIDTH} ${SITE_OG_IMAGE_HEIGHT}">
    <rect x="82" y="76" width="24" height="24" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/>
    <text x="122" y="99" font-family="${BODY_FONT}" font-size="${BRAND_FONT_SIZE}" font-weight="900" letter-spacing="2" fill="${CORAL}">${SITE_NAME} / PAGE</text>
    ${titleMarkup}
    ${descriptionMarkup}
  </svg>`

  return new TextEncoder().encode(svg)
}

export function createOpenGraphImageGetHandler() {
  return async ({ request }: { request: Request }): Promise<Response> => {
    const url = new URL(request.url)
    const parsed = imageRequestSchema.safeParse({
      title: url.searchParams.get('title'),
      description: url.searchParams.get('description') ?? '',
    })

    if (!parsed.success) {
      return new Response('Invalid Open Graph image request', {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }

    try {
      const image = await sharp(artworkBytes)
        .composite([{ input: Buffer.from(renderOverlay(parsed.data.title, parsed.data.description)) }])
        .webp({ quality: 92, effort: 6 })
        .toBuffer()

      return new Response(image, {
        headers: {
          'cache-control': CACHE_CONTROL,
          'content-length': String(image.byteLength),
          'content-type': 'image/webp',
        },
      })
    } catch {
      return new Response('Unable to render Open Graph image', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
  }
}
