'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * Base UI has no `asChild`: the primitive renders the child element as itself
 * instead of wrapping it, via its `render` prop. `asChild` stays on the public
 * signature because the trigger call sites pass a fully styled `<Button>` and
 * that element must remain the trigger itself, not its parent.
 */
function DialogTrigger({ asChild = false, children, ...props }: DialogPrimitive.Trigger.Props & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      render={asChild ? (React.Children.only(children) as React.ReactElement) : undefined}
      children={asChild ? undefined : children}
      {...props}
    />
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ asChild = false, children, ...props }: DialogPrimitive.Close.Props & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      render={asChild ? (React.Children.only(children) as React.ReactElement) : undefined}
      children={asChild ? undefined : children}
      {...props}
    />
  )
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  bodyClassName,
  viewportClassName,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** Class names for the body column inside the scroll area. */
  bodyClassName?: string
  /** Class names for the scroll area's viewport, which owns the dialog padding. */
  viewportClassName?: string
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed top-[50%] left-[50%] z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border bg-background shadow-lg outline-none transition-[opacity,transform,scale] duration-200 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        <ScrollArea
          data-dialog-scroll=""
          className="min-h-0 flex-1"
          viewportProps={{ className: cn('p-6', viewportClassName), tabIndex: 0 }}
        >
          <div className={cn('flex flex-col gap-4', bodyClassName)}>{children}</div>
        </ScrollArea>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-popup-open:bg-accent data-popup-open:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && <DialogPrimitive.Close render={<Button variant="outline">Close</Button>} />}
    </div>
  )
}

function DialogTitle({ ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className="text-lg leading-none font-semibold" {...props} />
}

function DialogDescription({ ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description data-slot="dialog-description" className="text-sm text-muted-foreground" {...props} />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
