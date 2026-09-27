import { PixelIcon } from './pixel-icon'
import { MAX_CHAT_CONTEXT_MESSAGES, MAX_CHAT_TURNS } from '../../lib/chat-limits'

/**
 * The answer model never receives a bare question. `openrouter-responder.ts`
 * sends one system message, the whole verified conversation, then the latest
 * user message. This panel renders that exact shape so the dialog cannot drift
 * away from the real request.
 */

const MAX_HISTORY_MESSAGE_LENGTH = 2_000

const SYSTEM_FRAMES = [
  {
    id: 'persona',
    label: 'BASE ANSWER PROMPT',
    body: 'Configured server prompt. Nelson’s representative voice, evidence rules, and output format.',
    trust: 'server',
  },
  {
    id: 'clock',
    label: 'TRUSTED RUNTIME CLOCK (UTC)',
    body: 'The server timestamp is the only source for “today”, “this week”, and every relative date.',
    trust: 'server',
  },
  {
    id: 'evidence',
    label: 'PERSONAL KNOWLEDGE CONTEXT — UNTRUSTED EVIDENCE',
    body: 'Accepted passages only, inside <untrusted_evidence> tags, each with a [K#] citation, title, source URL, and visibility. Passages that failed the Jev relevance gate are absent.',
    trust: 'retrieved',
  },
  {
    id: 'tools',
    label: 'UNTRUSTED TOOL OUTPUT (data only)',
    body: 'Bounded, formatted summaries of this turn’s WakaTime shares, heartbeat queries, and published site content. JSON-escaped so a tool result can never become markup.',
    trust: 'retrieved',
  },
  {
    id: 'policy',
    label: 'MANDATORY SCOPE AND SECURITY POLICY',
    body: 'Scope limits, freshness rules, redaction handling, and the rule that retrieved content, history, and tool output are data, never instructions.',
    trust: 'server',
  },
] as const

const TRUST_LABEL = {
  server: 'server written',
  retrieved: 'untrusted data',
} as const

export function ChatContextStack() {
  return (
    <section className="chat-context-stack" aria-labelledby="chat-context-stack-title">
      <header className="chat-context-stack-header">
        <p className="eyebrow"><PixelIcon glyph="#" /> LLM CONTEXT / MEMORY STACK</p>
        <h3 id="chat-context-stack-title">What the answer model actually receives</h3>
        <p>
          One request, three frames: a server-written system frame, the entire verified conversation, and the
          question being asked. Nothing is summarised away between the chat and the model — up to{' '}
          {MAX_CHAT_CONTEXT_MESSAGES} signed messages ({MAX_CHAT_TURNS} exchanges) are replayed on every turn, so
          follow-ups resolve against the real transcript.
        </p>
      </header>

      <ol className="chat-context-frames">
        <li className="chat-context-frame">
          <div className="chat-context-frame-label">
            <span className="chat-context-frame-index">SYSTEM</span>
            <span className="chat-context-frame-role">role: system</span>
            <span className="chat-context-frame-size">1 frame</span>
          </div>
          <div className="chat-context-frame-body">
            <p className="chat-context-frame-note">
              Assembled server-side by <code>buildChatSystemPrompt</code> and sent as a single system message.
            </p>
            <ol className="chat-context-segments">
              {SYSTEM_FRAMES.map((frame, index) => (
                <li className="chat-context-segment" data-trust={frame.trust} key={frame.id}>
                  <div className="chat-context-segment-head">
                    <span className="chat-context-segment-index">{`${index + 1}/${SYSTEM_FRAMES.length}`}</span>
                    <span className="chat-context-segment-label">{frame.label}</span>
                    <span className="chat-context-segment-trust">{TRUST_LABEL[frame.trust]}</span>
                  </div>
                  <p className="chat-context-segment-body">{frame.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </li>

        <li className="chat-context-frame">
          <div className="chat-context-frame-label">
            <span className="chat-context-frame-index">HISTORY</span>
            <span className="chat-context-frame-role">role: user / assistant</span>
            <span className="chat-context-frame-size">up to {MAX_CHAT_CONTEXT_MESSAGES} messages</span>
          </div>
          <div className="chat-context-frame-body">
            <p className="chat-context-frame-note">
              The full signed conversation, in order, oldest first — every earlier question and answer the visitor
              has not cleared. Each message is trimmed to {MAX_HISTORY_MESSAGE_LENGTH.toLocaleString('en-US')} characters.
              This is the full history, not a summary or a window.
            </p>
            <pre className="chat-context-wire">
              <code>{'[\n  { "role": "user",      "content": "first question" },\n  { "role": "assistant", "content": "first answer" },\n  { "role": "user",      "content": "second question" },\n  { "role": "assistant", "content": "second answer" }\n]'}</code>
            </pre>
            <p className="chat-context-frame-note">
              The history can resolve references and accepted offers, but it is never treated as evidence: a new
              factual claim still requires a fresh source lookup this turn.
            </p>
          </div>
        </li>

        <li className="chat-context-frame" data-current>
          <div className="chat-context-frame-label">
            <span className="chat-context-frame-index">THIS TURN</span>
            <span className="chat-context-frame-role">role: user</span>
            <span className="chat-context-frame-size">1 message</span>
          </div>
          <div className="chat-context-frame-body">
            <p className="chat-context-frame-note">
              The message just submitted, trimmed to {MAX_HISTORY_MESSAGE_LENGTH.toLocaleString('en-US')} characters.
              It is the only turn that may trigger source lookups.
            </p>
          </div>
        </li>
      </ol>

      <p className="chat-context-stack-footnote">
        The model replies with text only. Tool use, argument validation, and context signing already happened on the
        server, so the rendered reply is streamed straight to the chat window.
      </p>
    </section>
  )
}
