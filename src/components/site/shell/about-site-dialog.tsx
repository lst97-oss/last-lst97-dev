import { Braces, Code2, Database, FileText, Heart, MonitorSmartphone, Scale, Server, Sparkles } from 'lucide-react'

import { Eyebrow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SITE_NAME } from '@/lib/seo/site-seo'

/** One row of the spec table, mirroring the About-this-Mac panel it is modelled on. */
function SpecRow({ icon: Icon, label, value }: { icon: typeof Braces; label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <Icon aria-hidden="true" className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} />
        <span>{value}</span>
      </dd>
    </div>
  )
}

/**
 * "About this site", in the spirit of the macOS About-this-Mac panel: the
 * product identity, then a label/value spec table, then the licence.
 *
 * The values are the real stack this site is built on, not a marketing list —
 * see `package.json` for the source of truth and `src/server/**` for the
 * services behind them. Anything user-configurable ("Enabled services") is
 * deliberately omitted, because a static panel cannot know what a given
 * deployment has switched on.
 */
export function AboutSiteDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label="About this site"
          className="system-about-button inline-flex min-h-9 items-center gap-1.5 border-2 border-primary px-2.5 py-1 text-xs leading-none font-black tracking-widest text-primary uppercase hover:border-accent hover:bg-accent hover:text-foreground sm:px-2"
          type="button"
        >
          <Sparkles aria-hidden="true" className="size-3.5 self-center" strokeWidth={2.5} />
          {/* Icon-only below sm: the system bar has no room for a label, and
              the aria-label above still names the control for screen readers. */}
          <span className="hidden sm:inline">ABOUT THIS SITE</span>
        </button>
      </DialogTrigger>
      <DialogContent className="about-site-dialog">
        <DialogHeader>
          <Eyebrow>
            <PixelIcon glyph="◆" /> SYSTEM / ABOUT
          </Eyebrow>
          <DialogTitle>{SITE_NAME}</DialogTitle>
          <DialogDescription>
            A pixel-art personal operating system for ideas, projects, and conversations. This panel describes the
            software you are talking to, and the licence it ships under.
          </DialogDescription>
        </DialogHeader>

        <dl className="about-site-specs">
          <SpecRow icon={Braces} label="Application" value={SITE_NAME} />
          <SpecRow icon={Sparkles} label="Kind" value="Personal OS · portfolio & notes" />
          <SpecRow icon={MonitorSmartphone} label="Frontend" value="React 19 · TypeScript" />
          <SpecRow icon={Server} label="Framework" value="TanStack Start · Vite" />
          <SpecRow icon={Database} label="Runtime" value="Bun" />
          <SpecRow icon={Server} label="Server" value="Nitro · server-sent events" />
          <SpecRow icon={Database} label="Content" value="Payload CMS · PostgreSQL" />
          <SpecRow icon={Braces} label="Retrieval" value="pgvector · SiliconFlow rerank" />
          <SpecRow icon={Heart} label="Chat models" value="TypeSafe · OpenRouter" />
        </dl>

        <div className="about-site-actions">
          <a
            className="about-site-button"
            href="https://github.com/lst97-oss/last-lst97-dev-web"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Code2 aria-hidden="true" className="size-4" strokeWidth={2.5} />
            View source
          </a>
          <a className="about-site-button" href="/llms.txt" rel="noopener">
            <FileText aria-hidden="true" className="size-4" strokeWidth={2.5} />
            llms.txt
          </a>
        </div>

        <p className="about-site-licence">
          <Scale aria-hidden="true" className="mx-auto mb-2 size-4 opacity-70" strokeWidth={2.5} />
          <strong>MIT License.</strong> Copyright (c) 2026 Sio Tou Lai. Permission is hereby granted, free of charge, to
          any person obtaining a copy of this software and associated documentation files (the &ldquo;Software&rdquo;),
          to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
          merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
          Software is furnished to do so, subject to the conditions of the MIT licence.
        </p>
      </DialogContent>
    </Dialog>
  )
}
