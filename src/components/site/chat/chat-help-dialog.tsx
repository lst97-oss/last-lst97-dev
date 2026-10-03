import { ChatContextStack } from '@/components/site/chat/chat-context-stack'
import { ChatPipelineContact } from '@/components/site/chat/chat-pipeline-contact'
import { ChatPipelineDiagram } from '@/components/site/chat/chat-pipeline-diagram'
import { ChatPipelineSteps } from '@/components/site/chat/chat-pipeline-steps'
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

/**
 * The help dialog is a frame: the trigger, the header, and the slot order. Its
 * content is three static sections that each own their own markup — the Mermaid
 * pipeline diagram (`ChatPipelineDiagram`), the numbered prose walkthrough
 * (`ChatPipelineSteps`), and the separate contact workflow
 * (`ChatPipelineContact`) — plus the context stack.
 */
export function ChatHelpDialog({ privacyNotice }: { privacyNotice: string | undefined }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label="How this chat works"
          className="chat-help-button grid size-8.5 place-items-center border-3 border-border bg-primary p-0 text-base leading-none font-black text-foreground shadow-os-xs hover:bg-accent"
          type="button"
        >
          ?
        </button>
      </DialogTrigger>
      <DialogContent className="chat-pipeline-dialog">
        <DialogHeader>
          <Eyebrow>
            <PixelIcon glyph="?" /> SYSTEM / PIPELINE
          </Eyebrow>
          <DialogTitle>How your question is processed</DialogTitle>
          <DialogDescription className="chat-pipeline-description">
            Every message takes the same route through the server. The order below is the order the code runs: nothing
            reaches an answer model before the screening, context verification, and source decisions that precede it.
            The diagram shows the separate email, bug report, feature request, quotation, and support plan workflow you
            enter only after you confirm. Drag to pan; use the controls to zoom.
          </DialogDescription>
        </DialogHeader>
        <ChatPipelineDiagram />
        <ChatPipelineSteps />
        <ChatContextStack />
        <ChatPipelineContact />
        <p className="chat-pipeline-footnote">
          The workflow uses TypeScript, React, TanStack Start, server-sent events, TypeSafe AI, Postgres/pgvector,
          SiliconFlow, Payload CMS, WakaTime, and OpenRouter. Enabled services and model settings can change.
        </p>
        {privacyNotice ? (
          <p className="chat-pipeline-privacy" role="note">
            {privacyNotice}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
