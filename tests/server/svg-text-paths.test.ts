import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { create as createFont, type Font } from 'fontkit'
import { renderSvgTextPaths } from '../../src/server/seo/svg-text-paths'

describe('Open Graph SVG text paths', () => {
  it('renders bundled font glyphs as vector paths instead of host-font text nodes', async () => {
    const archivoBytes = await readFile(
      new URL('../../src/server/seo/fonts/archivo-black-regular.ttf', import.meta.url),
    )
    const jetBrainsBytes = await readFile(
      new URL('../../src/server/seo/fonts/jetbrains-mono-variable.ttf', import.meta.url),
    )
    const title = renderSvgTextPaths(createFont(archivoBytes) as Font, 'LAST//OS', {
      x: 82,
      baselineY: 99,
      fontSize: 26,
      fill: '#ff7969',
    })
    const description = renderSvgTextPaths(createFont(jetBrainsBytes) as Font, 'hello world', {
      x: 86,
      baselineY: 250,
      fontSize: 24,
      fill: '#3c3b4a',
    })

    expect(title.match(/<path\b/g)).toHaveLength(8)
    expect(description.match(/<path\b/g)).toHaveLength(10)
    expect(title).not.toContain('<text')
    expect(description).not.toContain('<text')
    expect(title).toContain('fill="#ff7969"')
    expect(description).toContain('fill="#3c3b4a"')
  })
})
