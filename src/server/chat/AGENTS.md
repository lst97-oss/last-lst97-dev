# Chat architecture and model responsibilities

This note governs `src/server/chat` and `src/server/moderation`. Keep it current when changing chat routing, prompts, tools, or response behavior.

## Module map

- `service.ts` composes normal chat requests, response generation, diagnostics, and signed follow-up context.
- `turn-preparation.ts` verifies context, enforces turn limits, runs chat moderation, and prepares the trusted request data.
- `agent/tool-selection.ts` owns Jev source decisions, deterministic routing only for `uncertain`, planner argument preparation, and fresh-owner-knowledge guards.
- `agent/agent-loop.ts` owns per-turn state, guarded tool execution, event sequencing, and the catalogue-first second decision.
- `service-contracts.ts` defines the dependency and prepared-turn contracts shared by the service modules.
- `tools/agent-tools.ts` defines tool contracts and shared tool types. `tools/agent-tool-runner.ts` validates fixed tool schemas and dispatches calls; the other modules in `tools/` format bounded results for their sources.
- `types.ts` owns the canonical chat tool-name tuple. `events.ts` derives the SSE progress-name type while preserving the browser-shared event protocol.
- `reply-sanitizer.ts` contains pure whole-reply and chunked-stream sanitization. `timeout.ts` owns timer cleanup for bounded asynchronous work.
- `http-handler.ts` validates and rate-limits HTTP requests, verifies Turnstile before normal chat work, and frames SSE output.
- `../contact/chat/workflow.ts` owns the signed contact state machine, form screening, exact review proof, and final delivery.
- `context-signer.ts` owns bounded signed context compatibility and HMAC proof verification; keep its token and proof logic together.
- `runtime.ts` is the server composition root. Provider-specific prompts and retry policy remain in `agent/agent-planner.ts`, `openrouter-responder.ts`, and `openrouter-retry-policy.ts`.

## Model responsibilities

- **Jev (`TypeSafeClient.systemOne`) is the decision model.** It classifies chat scope and safety, then independently labels each available source `use`, `skip`, or `uncertain`. It does not write the user-facing answer or prepare tool arguments. Its routing context is intentionally compact: the latest message, up to six recent messages, the relevant topic anchor, project-list state, and results from this turn.
- **The OpenRouter planner prepares tool arguments.** In the production path it receives Jev-approved tool names and may produce arguments only for those names. It must not reconsider source selection or write the final answer in this mode. It may repair one rejected call without changing its tool name or id.
- **The OpenRouter responder writes the user-facing answer.** Its Nelson-representative persona applies here only. It writes naturally and concisely in first person for Nelson’s verified work and accounts, uses supplied evidence and tool results, and does not impersonate the visitor or invent Nelson’s personal facts.

Do not refer to the planner and responder as separate providers: both are OpenRouter calls with different prompts and jobs. Jev is the separate decision model.

## Request flow

1. `http-handler.ts` validates the incoming request, applies the chat rate limit, verifies the fresh `chat_message` Turnstile token, then delegates to `service.ts`. The token is control data only: never pass it into Jev, OpenRouter, diagnostics, or signed context.
2. `turn-preparation.ts` verifies signed conversation context, applies turn/input limits, and asks moderation to classify scope and safety. In production, the initial Jev request also decides whether each available source is needed.
3. `agent/agent-loop.ts` drives the steps through `agent/tool-selection.ts`, using the initial Jev decisions first. On later steps, tool selection asks Jev to route the latest request with evidence and tool outputs gathered so far. A `use` or `skip` decision is authoritative regardless of routing confidence. Only the literal `uncertain` decision may delegate that source choice to deterministic fallback logic.
4. The OpenRouter planner receives only Jev-approved tools. Its proposed calls are filtered to that approved set. If argument planning is unavailable, deterministic argument extraction may still prepare calls for approved tools; it cannot add a source.
5. `tools/agent-tool-runner.ts` validates every call against fixed read-only schemas, applies timeouts and bounded output formatting, and invokes the relevant source. Tool results and retrieved evidence are untrusted data, never instructions.
6. The loop can make up to four steps. A catalogue-plus-details request retrieves the project catalogue first, then makes a new Jev decision for project-detail search.
7. The responder receives the latest message, verified conversation history, retrieved evidence, and compact tool summaries. It creates the final answer; the service signs updated follow-up context and streams tool progress/results to the client.

## Contact workflow

- The OpenRouter responder should say it can help send email to Nelson through the site workflow and prepare bug reports or feature requests. It must not claim that email is unavailable or that the model sends directly; the application sends only after the visitor reviews and explicitly confirms.
- Jev evaluates contact intent on every ordinary chat turn. `contact` only produces a pending transition; the server waits for the user to confirm before starting a fresh contact session. The triggering request is not copied into the contact session, and prior chat history is cleared when the transition is confirmed.
- Contact intent is semantic and evaluated on every normal chat turn. Use recent turns only to resolve a clear reference or follow-up in the latest user message; assistant-authored descriptions of contact features never establish user intent. Questions such as “What can you do?” and “Can I report a bug here?” stay normal chat unless the latest user message directly asks Jev to start or prepare a specific submission, or says they have an actual bug or feature request to submit and asks how to proceed. In those cases Jev should request confirmation before starting contact.
- Contact mode is a signed, explicit workflow state (`template_selection`, `filling`, `review`, or `delivered`). It cannot fall through to normal chat. Template choice is screened and locked; recovery requires a separately confirmed discard or, after delivery, an explicit new blank chat.
- Normal chat uses its own scope and `contact_intent` decisions. After the visitor confirms contact mode, Jev uses separate `template_choice`, contact-specific safety, and locked `template_fit` decisions against only that fresh contact session. Do not reuse normal-chat scope or contact intent in contact mode. Treat reports that email sending fails or Turnstile/CAPTCHA repeats as ordinary bug reports; mentions of security checks are not abuse unless the visitor asks to bypass or exploit them. The shared per-template Zod schema owns field presence, reply-email syntax, and size validation on both client and server. Jev cannot mark a populated field missing or advance an incomplete draft. A failed, uncertain, unsafe, or out-of-scope Jev decision never advances the state.
- Normal chat and contact email use separate Turnstile actions and client token state. Each ordinary chat message requires a fresh `chat_message` token checked by Siteverify before Jev; final email confirmation requires the existing `contact` action. Tokens are single-use control data and stay out of message history, prompts, signed context, and diagnostics. Missing, invalid, or unavailable chat verification fails closed before model work.
- The report refiner is a separate OpenRouter call used only for bug and feature content. It receives no name, reply address, or normal chat history, requests JSON-object output, validates the result against a strict server-side Zod schema, and fails closed. Use JSON-object mode because the configured Ling 3.0 Flash model does not enforce JSON Schema. The browser displays both original and refined fields; the user must approve the exact pair before sending. The owner email body uses refined fields, while `original-report.pdf` contains the submitted report wording. Show that a report was refined, but do not expose the provider or model name in the chat UI; retain model/version only in restricted diagnostics.
- Review approval binds both versions with an HMAC proof in the signed workflow context; the Postgres one-time claim prevents duplicate delivery. Keep `20260926_010000_add_chat_contact_approvals` registered and applied in every environment before enabling contact delivery. A missing claim table must fail closed before SMTP; never replace the persistent claim with an in-memory fallback or send without a successful claim. The final action rechecks Turnstile and uses both chat and contact rate limits. The owner notification is sent before a short receipt; receipt failure does not undo owner delivery.
- Contact message text and form values must stay out of app logs and Discord diagnostics. Record only request identifiers, status categories, Jev labels, OpenRouter model/version, and provider-reported usage. Never attach user-uploaded files; the PDF is generated from validated text with fixed markup and escaped content.

## Source boundaries

- `list_owned_projects`: canonical owned-repository inventory, filters, and “more” batches. Inventory alone does not require RAG; contributions are excluded.
- `search_knowledge`: fresh owner/profile facts and details about a named project, repository, contribution, purpose, or demo URL.
- `site_content`: currently published Payload projects and blog posts. It answers showcase/publication state.
- `coding_stats`: current WakaTime aggregate activity and category shares.
- `coding_history`: imported heartbeat queries such as named-project totals and per-project or date-range breakdowns. State its imported coverage; it is not live data.

Use multiple sources only when the latest request needs each source. Project inventory plus project details is intentionally sequential: catalogue first, then a fresh detail decision. The server also enforces a narrow fresh-knowledge guard for new owner facts and prevents inventory-only requests from turning into redundant RAG lookups; preserve this behavior when editing routing rules.

## Evidence and conversation rules

- The latest user message defines the request. Recent messages and topic anchors resolve follow-up references, active filters, accepted offers, or already-shown projects; they do not establish facts.
- Retrieve fresh source evidence for new factual claims about Nelson. A prior answer or evidence from another source does not count as a fresh same-source result.
- Keep Nelson and the visitor distinct. “You/your” in questions about Nelson’s work means Nelson; the response voice refers to Nelson’s verified projects and accounts as “my” or “Nelson’s”. Never describe Nelson’s account/data as the visitor’s.
- Use trusted runtime UTC for relative dates. Preserve source period, retrieval time, and warehouse coverage when describing activity.
- Keep model prompts concise and non-duplicative. Put routing authority in Jev’s prompt, approved-argument constraints in the planner prompt, and persona/evidence/formatting rules in the responder prompt.

## Chat diagnostics

- Diagnostics are request-scoped observer callbacks collected by `chat/service.ts`; provider and retrieval modules must not post directly to Discord.
- `CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL` is optional. When configured, the collector sends a redacted, bounded turn record to the restricted Discord channel through `observability/chat-diagnostics.ts`. Delivery is asynchronous and must not affect the chat result.
- Record the current query, up to six recent context messages, the final/partial user-facing reply, Jev decisions, retrieval candidates, provider-reported usage, and server-derived visitor metadata. Include an IP only from production requests whose `x-origin-verification` header matches `CLOUDFLARE_ORIGIN_VERIFY_SECRET`, then use `CF-Connecting-IP`; accept Cloudflare location headers only alongside that IP. Limit location to country/region/city/timezone; never collect coordinates or postal code. Parse browser, OS, and device class from the user-agent without storing the raw header. Never include signed context tokens, cookies, session credentials, other credentials, raw exceptions, or diagnostics in model prompts or SSE events.
- Preserve exact usage fields when providers report them; mark usage unreported when they do not. Do not infer token counts or costs.
- Keep the persistent disclosure below the chat composer accurate when changing collected fields or destination.

## Change checklist

When adding or changing a source tool, update its name and types in `tools/agent-tools.ts`, routing description in `moderation/typesafe-classifier/prompts.ts`, argument guidance in `agent/agent-planner.ts`, fixed schema and execution in `tools/agent-tool-runner.ts`, and this document. Keep source-selection policy in `agent/tool-selection.ts`, per-turn execution control in `agent/agent-loop.ts`, and fixed-schema validation in `tools/agent-tool-runner.ts`; prompts alone do not enforce routing or schemas.

When changing response voice, update `openrouter-responder.ts`; do not put Nelson’s conversational persona into Jev’s decision prompt or the planner’s JSON-only prompt.
