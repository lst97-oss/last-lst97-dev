# How Zita splits decision, tool arguments and answer generation across separate models

- **Category:** AI Architecture
- **Source ID:** last-os-ai-pipeline
- **URL:** https://www.lst97.dev/projects/last-os
- **Visibility:** Public

The assistant is not one model call. A visitor message passes through a fixed pipeline — validation, rate limit, Turnstile, moderation and scope, source decision, tool planning, knowledge retrieval, response generation, streamed answer — and each stage has a separate responsibility. The split exists because three of those jobs are genuinely different problems: classification, argument construction, and prose generation. Collapsing them into a single prompt is simpler to write and much harder to reason about, because a model asked to decide *which* source to use is also free to quietly decide to use none.

Three model roles run in sequence.

**Jev is the decision model.** It is the only component that decides scope, safety, and source selection. For an ordinary chat turn it answers whether the request is in scope, whether it is safe, and which of the available sources should be used — each labelled `use`, `skip`, or `uncertain`. Once retrieval has happened it runs a second, separate judgement on whether the retrieved evidence actually looks relevant, which is what gates what reaches the responder. It also evaluates contact intent on every chat turn, and it runs the form-screening judgements (template choice, contact-mode safety, and template fit) once a contact session has started. Jev never writes visitor-facing text.

The `uncertain` label is the only path that may delegate to deterministic routing. A `use` or `skip` decision is authoritative regardless of routing confidence, which means the model can say "I don't know" and the system still has defined behaviour for that case instead of falling back to "search everything".

**The OpenRouter planner prepares tool arguments.** It receives the tool names Jev approved and may produce arguments only for those names. It cannot add a source, and it is allowed one repair of a rejected call without changing that call's tool name or id. So tool *authority* belongs to Jev and tool *arguments* belong to the planner — splitting those is what stops a planner from inventing a capability the decision stage refused.

**The OpenRouter responder writes the answer.** It receives the latest visitor message, the verified conversation history, the retrieved evidence, and bounded tool summaries. It owns language and presentation: it is Zita in the third person when asked about itself, and speaks in Nelson's first person when answering about Nelson's work or commercial services. It has no authority over source selection and is given no way to request a new tool mid-answer.

The loop between planner and responder runs for up to four steps. This matters for requests that need one fact to decide what to fetch next: "show me all of your projects and explain the G-NAF one" first retrieves the catalogue, and only after seeing that catalogue does a fresh Jev decision determine whether project-detail search is needed. Predicting both retrievals up front would mean either always paying for both or guessing wrong. Instead each step re-evaluates against the results of the previous one.

Tool execution is bounded on three axes at once. Every tool has a fixed Zod schema, so a malformed call is rejected before it reaches any source; every call runs under a timeout, so a slow source cannot hold the turn open; and every result is truncated before the responder sees it — 600 characters normally, 6,000 when the result carries retrieval project source ids, with the SSE summary further capped at 400. That last cap is the one worth stating plainly, because raising it is always the tempting fix: a tool whose output grows past its budget silently loses its tail to the model while still appearing in the DOM, so the contract is expected to stay concise rather than the limit being moved.

The tools themselves are read-only. `search_knowledge` retrieves project and writing detail; `list_owned_projects` serves the owned repository catalogue with server-computed totals; `coding_stats` reads current WakaTime aggregates; `coding_history` queries the imported warehouse; `site_content` reads published Payload entries; `services` retrieves the commercial offer. None of them can construct SQL, touch the filesystem, or run a command, so a hallucinated tool call has no dangerous action available to it.

Contact intent is evaluated semantically on every normal chat turn, but a `contact` label only produces a *pending* transition — the server waits for the visitor to confirm before opening a contact session. The triggering message is not copied into the contact session, and prior chat history is cleared when the transition is confirmed, so a report about a bug never smuggles the surrounding conversation into an email to the operator.