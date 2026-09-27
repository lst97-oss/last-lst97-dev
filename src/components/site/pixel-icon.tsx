type PixelIconProps = {
  glyph: string
  label?: string
}

export function PixelIcon({ glyph, label }: PixelIconProps) {
  return (
    <span aria-hidden={label ? undefined : true} aria-label={label} className="pixel-icon">
      {glyph}
    </span>
  )
}
