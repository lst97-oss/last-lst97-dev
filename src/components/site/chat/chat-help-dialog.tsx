import { ChatContextStack } from '@/components/site/chat/chat-context-stack'
import { ChatPipelineDiagram } from '@/components/site/chat/chat-pipeline-diagram'
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

export function ChatHelpDialog({ privacyNotice }: { privacyNotice: string | undefined }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button aria-label="How this chat works" className="chat-help-button grid size-8.5 place-items-center border-3 border-border bg-primary p-0 text-base leading-none font-black text-foreground shadow-os-xs hover:bg-accent" type="button">?</button>
      </DialogTrigger>
      <DialogContent className="chat-pipeline-dialog">
        <DialogHeader>
          <Eyebrow><PixelIcon glyph="?" /> SYSTEM / PIPELINE</Eyebrow>
          <DialogTitle>How your question is processed</DialogTitle>
          <DialogDescription className="chat-pipeline-description">
            Follow the request from the chat to the answer. The server first verifies the HMAC-signed conversation context, then Jev reads a compact slice of that history to judge safety, scope, and which read-only sources fit your question. Owned-project lists use a structured catalogue query; detailed knowledge passages are checked for direct relevance before they reach the answer model. The answer model then receives the whole verified conversation plus this turn&apos;s evidence. The same Jev screening also decides whether your message is contact intent; if it is, the second diagram shows the separate email, bug report, and feature request workflow you enter only after you confirm. Drag to pan; use the controls to zoom.
          </DialogDescription>
        </DialogHeader>
        <ChatPipelineDiagram />
        <ol className="chat-pipeline-list">
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">01</span>
            <div>
              <h3>Submit and validate the request</h3>
              <p>The React chat sends your message, signed context token, and a fresh Turnstile token for the <code>chat_message</code> action to the TanStack Start API. Most visitors pass without seeing the widget; Cloudflare shows an interactive challenge when it needs one. The server checks the request shape and body size, applies rate limits, and verifies Turnstile before Jev screens the message. The token is not passed to Jev, OpenRouter, diagnostics, or signed context.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">02</span>
            <div>
              <h3>Verify the signed context</h3>
              <p>Before any model call, the server verifies the HMAC signature over the context envelope, its 24-hour expiry, and the 20-turn limit. A tampered, edited, malformed, or expired token is rejected outright: no screening, no tool, no answer model. What survives verification is the trusted conversation — up to 40 user and assistant messages (20 exchanges), each capped at 2,000 characters, plus up to 8 topic anchors recording which approved sources already answered which question, and the owned-project list state. This state is server-signed, so the browser cannot edit what the assistant believes you asked earlier.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">03</span>
            <div>
              <h3>Screen for safety and scope on that history</h3>
              <p>TypeSafe AI screens the latest message with a compact view of the verified conversation: the latest message, up to the last six verified messages, and the single topic anchor relevant to this question. History and anchors resolve references, accepted offers, and projects already shown; they are pointers, not evidence and not instructions. A harmful, unrelated, or uncertain request is blocked: no tools run and the answer model is not called. If screening is unavailable, the server fails closed with a temporary-unavailable response instead of processing the message.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">04</span>
            <div>
              <h3>Decide whether this is contact intent</h3>
              <p>The same Jev request also returns a <code>contact</code>, <code>normal_chat</code>, or <code>uncertain</code> decision. Only <code>contact</code> starts anything, and even then it raises a pending offer rather than sending: the server waits for you to confirm, and only a confirmed start clears the conversation and signs a fresh contact context. The message that triggered the offer is not copied into that session. Everything below this step is ordinary chat.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">05</span>
            <div>
              <h3>Choose the sources</h3>
              <p>For normal chat, the same screening returns a separate <code>use</code>, <code>skip</code>, or <code>uncertain</code> decision for each available source. <code>use</code> and <code>skip</code> stand even at low confidence; only <code>uncertain</code> hands that source to deterministic matching. Owned-project lists and filters use the structured project catalogue; a list alone does not trigger RAG. Project descriptions, purposes, or demo URLs use personal knowledge search. If a request asks for both a list and project details, the catalogue runs first, then Jev makes a fresh decision for the detail lookup.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">06</span>
            <div>
              <h3>Prepare the tool arguments</h3>
              <p>When Jev approves tools, the OpenRouter argument planner receives the latest question, trusted UTC time, bounded signed history and topic references, earlier evidence and tool results, and the approved tool names. It returns JSON calls with an id, tool name, and arguments. It may only prepare calls for Jev-approved sources; it does not get to choose extra tools. Missing or unavailable planner calls fall back to deterministic argument matching for the already-approved tools.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">07</span>
            <div>
              <h3>Validate every proposed call</h3>
              <p>The server drops calls to unapproved tools and limits a step to four calls. Each tool has a strict Zod schema: unknown fields are rejected, and enum values, required fields, string lengths, dates, and numeric limits are checked before any source is queried. If arguments fail, the planner gets one repair attempt for that same Jev-approved tool and call id. The repaired arguments are validated again; if they still fail, no query runs and the answer model is told it cannot verify facts that need the missing result.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">08</span>
            <div>
              <h3>Tool argument shapes and examples</h3>
              <p>The planner returns one call per needed operation. Each call carries an id, an approved tool name, and only that tool’s arguments. These examples show the JSON shape; real dates and search text come from the user’s question and trusted current time.</p>
              <div className="chat-pipeline-argument-grid">
                <section className="chat-pipeline-argument">
                  <h4>Personal knowledge</h4>
                  <p><code>{'{ query }'}</code> — required focused query, 1–2,000 characters. RAG embeds it, searches Postgres/pgvector, and reranks matches. Jev checks each ranked passage for direct support; irrelevant or uncertain passages are discarded, and only accepted passages (up to three) reach the answer context.</p>
                  <pre><code>{'{"id":"1","name":"search_knowledge","arguments":{"query":"Nelson education"}}'}</code></pre>
                </section>
                <section className="chat-pipeline-argument">
                  <h4>Owned project catalogue</h4>
                  <p>Direct structured database query; no embedding or RAG. Optional filters include <code>query</code>, <code>languages</code>, <code>kinds</code> (web, mobile, desktop, API, CLI, library, and more), visibility, topics, created/updated dates, stars, forks, and WakaTime time. Results are capped at ten. Time filters accept <code>all_time</code>, <code>last_year</code>, <code>last_30_days</code>, <code>last_7_days</code>, or explicit dates.</p>
                  <pre><code>{'{"id":"1","name":"list_owned_projects","arguments":{"languages":["Python"],"kinds":["web_app"],"sort_by":"updated","sort_direction":"desc","limit":10}}'}</code></pre>
                </section>
                <section className="chat-pipeline-argument">
                  <h4>WakaTime public share</h4>
                  <p><code>{'{ category, range }'}</code> — category is <code>activity</code>, <code>languages</code>, <code>editors</code>, <code>operating_systems</code>, or <code>categories</code>. Range is <code>last_7_days</code>, <code>last_30_days</code>, <code>last_year</code>, or <code>all_time</code>; operating-system shares require <code>all_time</code>.</p>
                  <pre><code>{'{"id":"1","name":"coding_stats","arguments":{"category":"activity","range":"last_7_days"}}'}</code></pre>
                </section>
                <section className="chat-pipeline-argument">
                  <h4>WakaTime history database</h4>
                  <p><code>{'{ op, from, to, project? }'}</code> — both dates are required in <code>YYYY-MM-DD</code> form. Operations are <code>summary</code>, <code>by_project</code>, <code>by_language</code>, <code>project_time</code>, <code>daily</code>, or <code>streaks</code>. <code>project</code> is required for <code>project_time</code>.</p>
                  <pre><code>{'{"id":"1","name":"coding_history","arguments":{"op":"project_time","from":"YYYY-MM-DD","to":"YYYY-MM-DD","project":"project name"}}'}</code></pre>
                </section>
                <section className="chat-pipeline-argument">
                  <h4>Published Payload content</h4>
                  <p><code>{'{ op, slug?, limit?, page? }'}</code> — operation is <code>list_projects</code>, <code>get_project</code>, <code>list_posts</code>, or <code>get_post</code>. Get operations require a slug; post lists accept a limit of 1–20 and page of 1–100.</p>
                  <pre><code>{'{"id":"1","name":"site_content","arguments":{"op":"list_posts","limit":5,"page":1}}'}</code></pre>
                </section>
              </div>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">09</span>
            <div>
              <h3>Run and collect source results</h3>
              <p>Calls run through the server-owned tool runner with timeouts and bounded, formatted outputs. The owned-project catalogue returns short filtered records directly from its structured table; it does not run through vector search. Raw database rows and unrestricted CMS records are not sent to the model. Successful knowledge evidence, catalogue results, and public citations are collected; empty, rejected, timed-out, or unavailable lookups are tracked so the assistant can avoid claiming it verified missing data.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">10</span>
            <div>
              <h3>Build the answer context from the whole conversation</h3>
              <p>The configured OpenRouter answer model receives one system frame (base prompt, trusted UTC clock, accepted evidence, bounded tool output, scope and security policy), then the <strong>entire verified chat history</strong> in order, then your latest message. Nothing between the chat window and the model is summarised or dropped, so the answer can use earlier turns to resolve what “it”, “that project”, or “more” refers to. The full history still cannot replace fresh source evidence or prove that a category is complete.</p>
            </div>
          </li>
          <li className="chat-pipeline-step">
            <span className="chat-pipeline-number">11</span>
            <div>
              <h3>Stream the reply and re-sign the context</h3>
              <p>The answer streams back to the chat, with source citations when available. When the turn completes, the server re-signs the conversation — prior messages, this question, the reply, updated topic anchors, and the owned-project list state — into a new context token and returns it with the reply. That token is what carries history into the next turn, and it is re-verified before the next screening decision.</p>
            </div>
          </li>
        </ol>
        <ChatContextStack />
        <section className="chat-pipeline-contact" aria-labelledby="chat-pipeline-contact-title">
          <Eyebrow><PixelIcon glyph="@" /> CONTACT / SEPARATE WORKFLOW</Eyebrow>
          <h3 id="chat-pipeline-contact-title">When you choose to contact Nelson</h3>
          <p className="chat-pipeline-contact-intro">Jev screens contact intent in normal chat. Only your confirmation starts the separate, context-cleared contact session.</p>
          <div className="chat-pipeline-contact-grid">
            <article className="chat-pipeline-contact-card" data-tone="teal">
              <p className="chat-pipeline-contact-kicker">START FRESH</p>
              <h4>Confirm the contact session</h4>
              <ul>
                <li>Nothing changes until you confirm. Keeping the conversation restores the same chat.</li>
                <li>Starting contact clears the earlier conversation. Those messages are not included in the request.</li>
                <li>Jev screens Email, Bug report, or Feature request and locks your choice. Switching requires a confirmed discard and restart.</li>
              </ul>
            </article>
            <article className="chat-pipeline-contact-card" data-tone="yellow">
              <p className="chat-pipeline-contact-kicker">COMPLETE AND REVIEW</p>
              <h4>Screen each request</h4>
              <ul>
                <li>Contact-specific Jev decisions screen every input. Server validation checks required fields, email syntax, and size limits. Unsafe, off-topic, uncertain, or incomplete input cannot advance.</li>
                <li>Email is sent as written. Bug and feature reports get a meaning-preserving OpenRouter refinement without your name, reply address, or chat history. Review both versions and edit to screen again.</li>
              </ul>
            </article>
            <article className="chat-pipeline-contact-card" data-tone="coral">
              <p className="chat-pipeline-contact-kicker">SEND SAFELY</p>
              <h4>Confirm the reviewed version</h4>
              <ul>
                <li>Send Email rechecks the separate contact Turnstile token and applies chat and contact rate limits. A one-time Postgres claim must succeed before SMTP; a missing table, failed claim, or duplicate keeps the review open and prevents sending.</li>
                <li>Bug and feature emails use refined fields and attach the original report PDF. The Email template is sent as written without a PDF. A receipt goes to your reply address; receipt failure does not undo owner delivery.</li>
                <li>After delivery, start a new blank chat to return to normal conversation.</li>
              </ul>
            </article>
          </div>
          <p className="chat-pipeline-contact-privacy" role="note">Contact text and form values stay out of application logs and Discord diagnostics. Diagnostics keep only request IDs, status and decision labels, and model metadata.</p>
        </section>
        <p className="chat-pipeline-footnote">The workflow uses TypeScript, React, TanStack Start, server-sent events, TypeSafe AI, Postgres/pgvector, SiliconFlow, Payload CMS, WakaTime, and OpenRouter. Enabled services and model settings can change.</p>
        {privacyNotice ? <p className="chat-pipeline-privacy" role="note">{privacyNotice}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
