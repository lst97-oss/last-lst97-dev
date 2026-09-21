import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'

export const Route = createFileRoute('/demo-theme')({ component: DemoTheme })

function DemoTheme() {
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-background p-8 text-foreground">
        <h1 className="text-2xl font-bold">Solarized theme demo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Button / Input / Dialog on Solarized light + dark tokens.
        </p>
        <button
          className="mt-4 rounded border border-border px-3 py-1 text-sm"
          onClick={() => {
            const next = !dark
            setDark(next)
            document.documentElement.classList.toggle('dark', next)
          }}
          type="button"
        >
          Toggle {dark ? 'light' : 'dark'}
        </button>
        <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="button-variants">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="icon button">
            ★
          </Button>
        </div>
        <div className="mt-4 max-w-sm">
          <Input placeholder="Solarized input" />
        </div>
        <div className="mt-4">
          <Dialog>
            <DialogTrigger className="rounded bg-primary px-4 py-2 text-primary-foreground">
              Open dialog
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Solarized dialog</DialogTitle>
              <DialogDescription>Radix primitives themed with Solarized tokens.</DialogDescription>
              <div className="mt-4 flex justify-end">
                <DialogClose className="rounded border border-border px-3 py-1 text-sm">
                  Close
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
