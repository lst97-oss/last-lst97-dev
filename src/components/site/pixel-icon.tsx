import { cn } from "cn"

type PixelIconProps = {
  glyph: string
  label?: string
  className?: string
}

export function PixelIcon({ glyph, label, className }: PixelIconProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        'inline-block min-w-[1em] text-center leading-none font-black text-accent',
        className,
      )}
    >
      {glyph}
    </span>
  )
}
