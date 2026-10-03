import { MermaidDiagram } from '@/components/site/content/mermaid-diagram'

// A plain template literal, not String.raw: the diagram has no backslash
// escapes, and Bun's transpiler rewrites non-ASCII inside String.raw into a
// literal escape sequence. Vite (the browser) keeps the real characters.
export const CHAT_PIPELINE_DIAGRAM = `flowchart TB
  chat["01 · CHAT UI<br/>React chat + server-sent events"] --> api["02 · CHAT API<br/>Validate request + rate limit<br/>Verify fresh chat_message Turnstile token"]
  api --> verify{"03 · VERIFY SIGNED CONTEXT<br/>HMAC signature · 24 h expiry · 20-turn cap"}
  verify -->|Valid| history["04 · VERIFIED CONVERSATION CONTEXT<br/>Signed messages + topic anchors + shown projects<br/>The client cannot edit server-signed state"]
  verify -->|Invalid, edited, or expired| expired["STOP · CONTEXT REJECTED<br/>No screening, no source lookup, no answer model"]
  history --> jevctx["05 · JEV HISTORY CONTEXT DECISION<br/>Latest message + last 6 verified messages<br/>+ the single relevant topic anchor<br/>Pointers that resolve references, never evidence"]
  jevctx --> screen["06 · SAFETY + SCOPE SCREEN<br/>TypeSafe AI"]
  screen --> safe{"SAFE AND IN SCOPE?"}
  safe -->|Yes| intent{"CONTACT INTENT?<br/>From the same Jev screening request"}
  safe -->|Unsafe / out of scope / uncertain| blocked["STOP · BLOCKED<br/>No tools or answer model"]
  screen -->|Screening unavailable| failClosed["FAIL CLOSED<br/>Temporary unavailable response"]
  intent -->|Normal chat or uncertain| route{"07 · JEV SOURCE DECISION<br/>Per-tool use / skip / uncertain"}
  intent -->|Contact| handoff["CONTACT WORKFLOW · SEE THE SECOND DIAGRAM<br/>Jev only raises a pending offer; nothing is sent until you confirm<br/>Starting a contact session clears this conversation"]
  route -->|Approved sources| planner["08 · ARGUMENT PLANNER<br/>OpenRouter gets approved tool names only<br/>Question + UTC time + references + prior results"]
  route -->|No source needed| evidence["11 · RESULTS FOR THIS TURN"]
  planner -->|JSON tool calls| validate{"09 · VALIDATE ARGUMENTS<br/>Approved names only · maximum 4 calls<br/>Strict per-tool schemas"}
  planner -->|Missing calls or planner unavailable| fallback["DETERMINISTIC FALLBACK<br/>Prepare known arguments for approved tools only"]
  fallback --> validate
  validate -->|Valid| dispatch{"10 · DISPATCH READ-ONLY CALLS"}
  validate -->|Invalid| retryBudget{"One repair attempt<br/>still available?"}
  retryBudget -->|Yes| repair["REPAIR ARGUMENTS ONCE<br/>Planner receives validation feedback<br/>Same approved tool name + call id"]
  repair -->|Revalidate repaired JSON| validate
  retryBudget -->|No, or repair still invalid| rejected["STOP · ARGUMENTS REJECTED<br/>No source query runs<br/>Reply uses verified results only"]

  dispatch -->|query| rag["PERSONAL KNOWLEDGE<br/>Embed → pgvector search across every corpus<br/>Profile · projects · deep dives · interview · services"]
  dispatch -->|filters| projects["OWNED PROJECT CATALOGUE<br/>Structured database query · no RAG<br/>Language · software kind · dates · stars · forks · coding time<br/>Up to 10 records"]
  dispatch -->|category + range| stats["WAKATIME PUBLIC SHARE<br/>Activity / language / editor / OS / category"]
  dispatch -->|op + date range + optional project| historydb["WAKATIME HISTORY DB<br/>Project / language / daily / streak data"]
  dispatch -->|op + optional slug / page / limit| cms["PUBLISHED SITE CONTENT<br/>Payload projects · posts · changelogs · topics<br/>Plus list_pages for the site's own sections"]
  dispatch -->|No arguments| offers["COMMERCIAL OFFER<br/>Website packages, prices, inclusions, process<br/>And the Go Support Plan<br/>Prices, inclusions and workflow never come from RAG"]
  offers --> evidence
  projects -->|Inventory answer| evidence
  projects -->|Details also requested · next Jev decision| route
  rag --> rerank["RERANK KNOWLEDGE RESULTS<br/>Order candidate passages by relevance"]
  rerank --> relevance{"JEV RELEVANCE CHECK<br/>Does each passage directly support the query?"}
  relevance -->|Yes| keep["KEEP PASSAGE<br/>Eligible as answer evidence"]
  relevance -->|No / uncertain| discard["DISCARD PASSAGE<br/>Exclude from the LLM context"]
  keep --> ragResults["COLLECT ACCEPTED KNOWLEDGE<br/>If none pass, return no matching evidence"]
  discard --> ragResults
  ragResults --> evidence
  stats --> evidence
  historydb --> evidence
  cms --> evidence

  evidence --> prompt["12 · BUILD ANSWER CONTEXT<br/>Full verified chat history + this turn's evidence<br/>+ citations + trusted UTC clock"]
  prompt --> model["13 · OPENROUTER ANSWER MODEL<br/>Reads the whole conversation, not the question alone"]
  model --> stream["14 · STREAM REPLY<br/>Citations when available"]
  stream --> sign["15 · SIGN NEXT CONTEXT<br/>Server re-signs messages, anchors, project state<br/>Fresh token returned to the chat"]
  sign -.->|Next turn returns this token| chat`

// The contact workflow owns separate signed states and cannot fall through to
// normal chat, so it is drawn as its own diagram. Folding it into the request
// pipeline as a subgraph forced Mermaid into one tall column: the return edges
// to the chat cross the cluster boundary, so its layout direction is ignored.
export const CHAT_CONTACT_FLOW_DIAGRAM = `flowchart TB
  entry["PENDING CONTACT OFFER<br/>Signed confirmation state · the triggering message is not copied into it<br/>Nothing is sent without your confirmation"]
  entry -->|Keep chatting| declined["NORMAL CHAT CONTINUES<br/>The same signed conversation is restored"]
  entry -->|Start contact session| session["FRESH CONTACT SESSION<br/>Signed template_selection state<br/>Earlier chat messages are cleared and never emailed"]
  session --> template["JEV TEMPLATE SCREEN<br/>The allow-listed choice is screened, then locked<br/>Email · Bug report · Feature request · Quotation · Support plan"]
  template -->|Approved template| form["FILL AND SCREEN THE FORM<br/>Jev: safety · template intent · per-field presence<br/>Server: allowed fields · sizes · required values · reply email"]
  template -.->|Discard with confirmation| blank
  form -->|Missing or invalid fields| form
  form -->|Unsafe · out of scope · uncertain| stop
  form -->|Approved and valid| kind{"BUG, FEATURE, OR QUOTATION CONTENT?"}
  form -.->|Discard with confirmation| blank
  kind -->|Yes| refine["OPENROUTER REFINEMENT<br/>Meaning-preserving clarity edit · strict structured output<br/>No name, reply address, or chat history"]
  kind -->|No · Email is sent as written| review
  refine -->|Valid refinement| review["REVIEW BOTH VERSIONS<br/>Original and refined text shown together<br/>HMAC proof binds approval to this exact pair"]
  refine -->|Provider unavailable or invalid output| refineStop["STOP · REFINEMENT UNAVAILABLE<br/>Original text stays in the form · no review or send"]
  review -.->|Edit the request| form
  review -->|Send email| send["SEND GATE<br/>Contact Turnstile recheck · contact and chat rate limits<br/>One-time claim blocks a duplicate send"]
  send -->|Turnstile or rate limit failure| review
  send -->|Postgres claim unavailable or already used| claimStop["STOP · CLAIM NOT COMPLETED<br/>Review state is preserved · SMTP is not called"]
  send -->|Atomic Postgres claim succeeds| mail["OWNER EMAIL, THEN YOUR RECEIPT<br/>Bug / feature / quotation / support plan: refined fields + original report PDF<br/>Email: sent as written · no PDF attachment"]
  mail -->|Owner email accepted| out["DELIVERED<br/>A failed receipt never undoes delivery<br/>A new blank chat is the only way back to normal conversation"]
  mail -->|Owner email error| deliveryStop["DELIVERY ERROR<br/>Review remains · no automatic resend"]
  declined --> blank["SIGN BLANK NORMAL CHAT<br/>Jev screens the next turn from scratch"]
  stop["STOP · CONTACT REQUEST NOT ADVANCED<br/>Unsafe, out of scope, uncertain, or unavailable<br/>No email is sent and the signed state is unchanged"]`

type DiagramKey = 'request' | 'contact'

const DIAGRAMS: readonly { key: DiagramKey; source: string; title: string; note: string; ariaLabel: string }[] = [
  {
    key: 'request',
    source: CHAT_PIPELINE_DIAGRAM,
    title: 'Chat request flow',
    note: 'A normal question: the request is screened, optionally looks up sources, and answers.',
    ariaLabel: 'Top-to-bottom diagram of the chat request and its optional data sources',
  },
  {
    key: 'contact',
    source: CHAT_CONTACT_FLOW_DIAGRAM,
    title: 'Contact workflow',
    note: 'Only reached when Jev labels your message contact intent and you confirm. It cannot fall through back to normal chat.',
    ariaLabel:
      'Top-to-bottom diagram of the email, bug report, feature request, quotation, and support plan contact workflow',
  },
]

export function ChatPipelineDiagram() {
  return (
    <div className="chat-pipeline-diagram-shell">
      {DIAGRAMS.map(({ key, source, title, note, ariaLabel }) => (
        <section className="chat-pipeline-diagram-panel" key={key} aria-label={title}>
          <p className="chat-pipeline-diagram-title">{title}</p>
          <p className="chat-pipeline-diagram-caption">{note}</p>
          {/* `key` doubles as the render discriminator: without it the two
              diagrams in this document would share a mermaid render id and the
              second would fail into an empty error box. */}
          <MermaidDiagram id={`chat-${key}`} source={source} label={ariaLabel} />
        </section>
      ))}
      <p className="chat-pipeline-diagram-hint">
        FLOW DIRECTION: TOP → BOTTOM · SOURCE LOOKUPS RUN ONLY WHEN RELEVANT · THE CONTACT WORKFLOW RUNS ONLY AFTER JEV
        LABELS CONTACT INTENT AND YOU CONFIRM
      </p>
    </div>
  )
}
