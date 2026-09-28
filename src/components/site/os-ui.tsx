import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from "cn"
import type { ReactNode } from 'react'
import { PixelIcon } from '@/components/site/pixel-icon'

const pixelButtonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2.5 border-3 border-border bg-card px-3.5 py-2 text-xs font-black tracking-wider text-foreground uppercase shadow-os-sm transition-all duration-100 ease-out hover:not-disabled:translate-x-0.5 hover:not-disabled:translate-y-0.5 hover:not-disabled:shadow-os-hover disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      tone: {
        paper: 'bg-card',
        coral: 'bg-accent',
        yellow: 'bg-primary',
        teal: 'bg-secondary',
      },
    },
    defaultVariants: { tone: 'paper' },
  },
)

type PixelButtonProps = {
  children: ReactNode
  className?: string
  tone?: VariantProps<typeof pixelButtonVariants>['tone']
} & (
  | ({ as?: 'button' } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ as: 'span' } & React.HTMLAttributes<HTMLSpanElement>)
)

export function PixelButton({ children, className, tone, as, ...rest }: PixelButtonProps) {
  if (as === 'span') {
    return (
      <span className={cn(pixelButtonVariants({ tone }), className)} {...(rest as React.HTMLAttributes<HTMLSpanElement>)}>
        {children}
      </span>
    )
  }
  return (
    <button className={cn(pixelButtonVariants({ tone }), className)} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('m-0 mb-3 text-xs leading-snug font-black tracking-widest text-accent uppercase', className)}>
      {children}
    </p>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-block border-2 border-border bg-primary px-1.5 py-0.5 text-xs font-black text-foreground', className)}>
      {children}
    </span>
  )
}

export function TagRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap gap-1.5', className)}>{children}</div>
}

export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3', className)}>{children}</div>
}

export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-6xl flex-col gap-6', className)}>{children}</div>
  )
}

export function CountBadge({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('group inline-flex items-center gap-1.5 border-2 border-border bg-secondary px-2 py-1 text-xs font-black whitespace-nowrap', className)} {...rest}>
      {children}
    </span>
  )
}

export function PageHeading({
  icon,
  eyebrow,
  title,
  lead,
  badge,
  className,
}: {
  icon: string
  eyebrow: string
  title: string
  lead?: string
  badge?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('page-heading mb-7 flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch', className)}>
      <div>
        <Eyebrow><PixelIcon glyph={icon} /> {eyebrow}</Eyebrow>
        <h1 className="mb-0">{title}</h1>
        {lead ? <p className="lead-copy mt-4">{lead}</p> : null}
      </div>
      {badge}
    </div>
  )
}

export function CardLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('mt-auto pt-3 text-xs font-black tracking-wider text-accent', className)}>
      {children}
    </span>
  )
}

export function ProjectStatus({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex border-2 border-border bg-success-muted px-1.5 py-1 text-xs font-black tracking-wider text-foreground', className)}>
      {children}
    </span>
  )
}

export function EmptyPanel({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex min-h-36 flex-col items-start justify-center gap-1.5 border-3 border-dashed border-muted-foreground p-6 text-muted-foreground', className)} {...rest}>
      {children}
    </div>
  )
}

export const formErrorClass = 'm-0 border-3 border-border bg-accent px-3 py-2.5 text-xs font-extrabold'

export { pixelButtonVariants }
