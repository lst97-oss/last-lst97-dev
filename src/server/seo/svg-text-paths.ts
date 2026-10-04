import type { Font } from 'fontkit'

export type SvgTextPathOptions = {
  x: number
  baselineY: number
  fontSize: number
  fill: string
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

export function renderSvgTextPaths(font: Font, text: string, options: SvgTextPathOptions): string {
  const run = font.layout(text)
  const scale = options.fontSize / font.unitsPerEm
  const paths: string[] = []
  let penX = 0
  let penY = 0

  for (const [index, glyph] of run.glyphs.entries()) {
    const position = run.positions[index]
    if (!position) continue

    const x = options.x + (penX + position.xOffset) * scale
    const y = options.baselineY - (penY + position.yOffset) * scale
    const path = glyph.path.toSVG()

    if (path) {
      paths.push(
        `<path d="${path}" fill="${options.fill}" transform="translate(${formatNumber(x)} ${formatNumber(y)}) scale(${formatNumber(scale)} ${formatNumber(-scale)})"/>`,
      )
    }

    penX += position.xAdvance
    penY += position.yAdvance
  }

  return paths.join('\n')
}
