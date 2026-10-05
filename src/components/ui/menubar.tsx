'use client'

import { Menu as MenubarPrimitive } from '@base-ui/react/menu'
import { Menubar as MenubarRoot } from '@base-ui/react/menubar'
import { cn } from 'cn'
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react'
import * as React from 'react'

/**
 * Base UI's Menubar is a bare styled container with no namespaced parts: the
 * menu behaviour lives on each child `Menu.Root`, exactly as Radix's
 * `Menubar.Menu` did. Radix's active-menu `value`/`onValueChange` pair is gone,
 * so `loop` is a prop on the child `MenubarMenu` instead of the bar.
 */
function Menubar({ className, ...props }: MenubarRoot.Props) {
  return (
    <MenubarRoot
      data-slot="menubar"
      className={cn('flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-xs', className)}
      {...props}
    />
  )
}

function MenubarMenu({ loop, ...props }: MenubarPrimitive.Root.Props & { loop?: boolean }) {
  return <MenubarPrimitive.Root data-slot="menubar-menu" loopFocus={loop} {...props} />
}

function MenubarGroup({ ...props }: MenubarPrimitive.Group.Props) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />
}

function MenubarPortal({ ...props }: MenubarPrimitive.Portal.Props) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />
}

function MenubarRadioGroup({ ...props }: MenubarPrimitive.RadioGroup.Props) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
}

function MenubarTrigger({ className, ...props }: MenubarPrimitive.Trigger.Props) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        'flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

function MenubarContent({
  className,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  side,
  children,
  ...props
}: MenubarPrimitive.Popup.Props &
  Pick<MenubarPrimitive.Positioner.Props, 'side' | 'sideOffset' | 'align' | 'alignOffset'>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.Positioner
        data-slot="menubar-positioner"
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
        <MenubarPrimitive.Popup
          data-slot="menubar-content"
          className={cn(
            'z-50 min-w-[12rem] origin-(--transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none transition-[opacity,transform,scale] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95',
            className,
          )}
          {...props}
        >
          {children}
        </MenubarPrimitive.Popup>
      </MenubarPrimitive.Positioner>
    </MenubarPortal>
  )
}

function MenubarItem({
  className,
  inset,
  variant = 'default',
  ...props
}: MenubarPrimitive.Item.Props & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
        className,
      )}
      {...props}
    />
  )
}

function MenubarCheckboxItem({ className, children, checked, ...props }: MenubarPrimitive.CheckboxItem.Props) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.CheckboxItemIndicator>
          <CheckIcon className="size-4" />
        </MenubarPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

function MenubarRadioItem({ className, children, ...props }: MenubarPrimitive.RadioItem.Props) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.RadioItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </MenubarPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: MenubarPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.GroupLabel
      data-slot="menubar-label"
      data-inset={inset}
      className={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
      {...props}
    />
  )
}

function MenubarSeparator({ className, ...props }: MenubarPrimitive.Separator.Props) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}

function MenubarSub({ ...props }: MenubarPrimitive.SubmenuRoot.Props) {
  return <MenubarPrimitive.SubmenuRoot data-slot="menubar-sub" {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenubarPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.SubmenuTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        'flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[inset]:pl-8 data-popup-open:bg-accent data-popup-open:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubmenuTrigger>
  )
}

function MenubarSubContent({
  className,
  sideOffset = 0,
  align = 'start',
  alignOffset = -3,
  side = 'right',
  children,
  ...props
}: MenubarPrimitive.Popup.Props &
  Pick<MenubarPrimitive.Positioner.Props, 'side' | 'sideOffset' | 'align' | 'alignOffset'>) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Positioner
        data-slot="menubar-sub-positioner"
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
        <MenubarPrimitive.Popup
          data-slot="menubar-sub-content"
          className={cn(
            'z-50 min-w-[8rem] origin-(--transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none transition-[opacity,transform,scale] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95',
            className,
          )}
          {...props}
        >
          {children}
        </MenubarPrimitive.Popup>
      </MenubarPrimitive.Positioner>
    </MenubarPrimitive.Portal>
  )
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
}
