/**
 * Publishes the prepared pixel-art card at `public/og/default.webp`.
 *
 * The source is kept in `src/server/seo/og-artwork.webp`; the same source is
 * embedded into the runtime renderer that adds page-specific SEO text.
 *
 * Run with `bun run generate:og-image`.
 */
import { projectRoot } from '../project-root'

const WIDTH = 1200
const HEIGHT = 630
const INPUT_PATH = `${projectRoot}/src/server/seo/og-artwork.webp`
const OUTPUT_PATH = `${projectRoot}/public/og/default.webp`

const artwork = await Bun.file(INPUT_PATH).arrayBuffer()
const { width, height } = await new Bun.Image(artwork).metadata()

if (width !== WIDTH || height !== HEIGHT) {
  throw new Error(`OG artwork must be ${WIDTH}x${HEIGHT}; received ${width}x${height}`)
}

await Bun.write(OUTPUT_PATH, artwork)
console.log(`Wrote ${OUTPUT_PATH} (${width}x${height}, ${artwork.byteLength} bytes)`)
