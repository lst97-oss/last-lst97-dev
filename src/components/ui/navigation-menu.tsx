'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { cva } from 'class-variance-authority'
import { cn } from 'cn'
import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'

/**
 * Radix took `delayDuration` (200ms) and `skipDelayDuration`; Base UI renames
 * them to `delay` (default 50ms) and `closeDelay`, so the hover-open feel is
 * faster by default. The 200ms default is preserved here so an existing call
 * site that set neither keeps the site’s previous feel.
 */
function NavigationMenu({
  className,
  children,
  viewport = true,
  delay = 200,
  ...props
}: NavigationMenuPrimitive.Root.Props & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      delay={delay}
      className={cn('group/navigation-menu relative flex max-w-max flex-1 items-center justify-center', className)}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn('group flex flex-1 list-none items-center justify-center gap-1', className)}
      {...props}
    />
  )
}

function NavigationMenuItem({ className, ...props }: NavigationMenuPrimitive.Item.Props) {
  return (
    <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn('relative', className)} {...props} />
  )
}

const navigationMenuTriggerStyle = cva(
  'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-disabled:pointer-events-none data-disabled:opacity-50 data-popup-open:bg-accent/50 data-popup-open:text-accent-foreground data-popup-open:hover:bg-accent data-popup-open:focus:bg-accent',
)

function NavigationMenuTrigger({ className, children, ...props }: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      {...props}
    >
      {children}{' '}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[popup-open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        'top-0 left-0 w-full p-2 pr-2.5 data-[activation-direction=right]:translate-x-52 data-[activation-direction=left]:-translate-x-52 md:absolute md:w-auto',
        'group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

function NavigationMenuViewport({ className, ...props }: NavigationMenuPrimitive.Viewport.Props) {
  return (
    <div className={cn('absolute top-full left-0 isolate z-50 flex justify-center')}>
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          'origin-top-center relative mt-1.5 h-[var(--positioner-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow outline-none transition-[opacity,transform,scale] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 md:w-[var(--positioner-width)]',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[active]:bg-accent/50 data-[active]:text-accent-foreground data-[active]:hover:bg-accent data-[active]:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Base UI has no navigation-menu indicator: the Base UI registry exposes
 * `NavigationMenu.Icon` (an open/close chevron) instead. This export is kept so
 * the import surface is unchanged, but it renders inert and paints nothing —
 * the CSS that drove Radix's `data-[state=visible]`/`data-[state=hidden]` has no
 * Base UI attribute to key on.
 */
function NavigationMenuIndicator({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="navigation-menu-indicator" className={cn('hidden', className)} {...props} />
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
