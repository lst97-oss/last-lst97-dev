'use client'

import { Combobox as CommandPrimitive } from '@base-ui/react/combobox'
import { cn } from 'cn'
import { SearchIcon } from 'lucide-react'
import * as React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Built on Base UI's Combobox rather than cmdk. The two are NOT
 * interchangeable, and the difference is load-bearing:
 *
 * cmdk took plain JSX children and filtered them itself by scanning the DOM.
 * Base UI renders items from the `items` prop on the Root — `Collection` maps
 * over `filteredItems`, which is `EMPTY_ARRAY` when no `items` is given
 * (`combobox/root/AriaCombobox.js:272-277`). So every item here is produced by a
 * `Collection` render function, and a caller MUST pass `items` to `Command` or
 * nothing renders. This is the one behavioural break from the cmdk wrapper.
 *
 * Base UI's `Root` also renders no DOM element, so — unlike cmdk's `Command`,
 * which was a real `<div>` — it has no `className`. The painted surface moved to
 * `CommandContent` (the `Popup`), and `Command` is now purely the state root.
 * `filter` is cmdk's `shouldFilter`: pass `null` to filter externally via
 * `filteredItems`, or a predicate to filter here.
 */
function Command({ ...props }: CommandPrimitive.Root.Props<string, false, string>) {
  return <CommandPrimitive.Root data-slot="command" {...props} />
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  // The Root is a state container, not a DOM element, so it never accepted a
  // render function as a child; plain nodes are the whole contract.
  children?: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={className} viewportClassName="p-0" showCloseButton={showCloseButton}>
        {/* `className` cannot ride on the Root (it renders no element), so the
            palette's layout classes go on the content surface instead. The
            caller supplies `items` on `CommandContent`'s Root when it has any. */}
        <Command modal>
          <CommandContent className="**:data-[slot=command-input-wrapper]:h-12 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group-heading]]:text-muted-foreground [&_[data-slot=command-group]]:px-2 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3 [&_[data-slot=command-item]_svg]:h-5 [&_[data-slot=command-item]_svg]:w-5">
            {children}
          </CommandContent>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ...props }: CommandPrimitive.Input.Props) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b px-3">
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  )
}

/** The painted surface — Base UI's Popup, which is where the old cmdk `<div>` lives. */
function CommandContent({ className, children, ...props }: CommandPrimitive.Popup.Props) {
  return (
    <CommandPrimitive.Portal>
      <CommandPrimitive.Positioner className="z-50" sideOffset={4}>
        <CommandPrimitive.Popup
          data-slot="command-content"
          className={cn(
            'z-50 flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground outline-none',
            className,
          )}
          {...props}
        >
          {children}
        </CommandPrimitive.Popup>
      </CommandPrimitive.Positioner>
    </CommandPrimitive.Portal>
  )
}

function CommandList({ className, ...props }: CommandPrimitive.List.Props) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
      {...props}
    />
  )
}

/**
 * Renders only when the filter matches nothing. Base UI requires `items` on the
 * Root for this to work, and its root must stay mounted so the polite
 * screen-reader announcement is consistent — never conditionally render it.
 */
function CommandEmpty({ ...props }: CommandPrimitive.Empty.Props) {
  return <CommandPrimitive.Empty data-slot="command-empty" className="py-6 text-center text-sm" {...props} />
}

function CommandGroup({ className, items, ...props }: CommandPrimitive.Group.Props) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      items={items}
      className={cn(
        'overflow-hidden p-1 text-foreground [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CommandLabel({ className, ...props }: CommandPrimitive.GroupLabel.Props) {
  return (
    <CommandPrimitive.GroupLabel
      data-slot="command-group-heading"
      className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }: CommandPrimitive.Separator.Props) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 h-px bg-border', className)}
      {...props}
    />
  )
}

/** The highlighted state is `data-highlighted`, not cmdk's `data-selected="true"`. */
function CommandItem({ className, ...props }: CommandPrimitive.Item.Props) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:bg-accent data-selected:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Renders the `items` a Collection maps over. Base UI has no equivalent of
 * cmdk's implicit list: without this, and without `items` on the Root, the
 * combobox renders zero rows.
 */
function CommandCollection({ children }: CommandPrimitive.Collection.Props) {
  return <CommandPrimitive.Collection data-slot="command-collection">{children}</CommandPrimitive.Collection>
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandCollection,
  CommandContent,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandLabel,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
