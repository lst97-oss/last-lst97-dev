# Decision-model moderation and routing prompts

This note governs `src/server/moderation`. It is the prompt-level reference for
the decision model — an OpenRouter-served, System One compatible decider
(`DECISION_MODEL`, default `perplexity/pplx-decider-v1.2`).
`src/server/chat/AGENTS.md` owns chat behaviour
and links here; this file owns what the decision model is asked, with which labels, and under
what thresholds. Keep it current whenever a prompt constant, criteria map, or
threshold changes.

The decision model never writes user-facing prose. It classifies, labels, and routes; the
OpenRouter planner prepares tool arguments and the responder writes the answer.

## Decision surface

Production wires the decision model through `src/server/moderation/runtime.ts`:
`getModerationService()` builds a `createSystemOneClient` fetch client against
OpenRouter's Decisions API (`https://openrouter.ai/api/alpha/decisions`), using
`DECISION_MODEL` (default `perplexity/pplx-decider-v1.2`) and `DECISION_API_KEY`
(falling back to `OPENROUTER_API_KEY`), and hands it to
`createDecisionClassifier(...)` from `decision-classifier.ts`, which owns the
four `ModerationClassifier` methods, each of which makes exactly one
`client.systemOne({ state, questions })` call. The same fetch client serves the
benchmark decider arms and the RAG relevance gate. It retries transient
failures (connection errors, timeouts,
429, 5xx) a bounded number of times with a jittered delay, honoring
`Retry-After` up to a 2s ceiling; non-transient failures and invalid responses
are never retried.

| Method | Used by | Decides |
|---|---|---|
| `classify` | normal chat, direct `/contact` | chat scope/safety/contact intent, or contact intent/safety |
| `classifyChatWithTools` | chat turn preparation | scope, safety, contact intent, and every source's use/skip/uncertain |
| `classifyContactWorkflow` | locked chat contact workflow | template-phase safety + template choice, form-phase safety + template fit |
| `routeTools` | later agent-loop steps | use/skip/uncertain per source, with this turn's evidence |

Client config: model from `DECISION_MODEL`, `timeoutMs: 5_000` per attempt,
`maxAttempts: 3` with a jittered 250 ms base delay (two retries), then give up.
A failed call throws; the service layer converts every throw into
`{ unavailable: true }` and the caller fails closed.

Answers are coerced through `decision/answers.ts`. `normalizeAnswers`
reads each answer into `{ choice, confidence }`; `confidence` is optional in
the System One schema, so an omitted value is filled from the answer's
probability map (the chosen label's entry first), and an answer with neither
yields `0`, which the gates treat as "not confident" — a normal rejection,
never an outage. Entries without a string `choice` are dropped, so
`requiredAnswer` and `readToolDecisions` keep throwing on unknown labels
exactly as before. `tests/server/decision-classifier.test.ts` pins both the
fill and the degradation.

## Prompt map

All constants live in `decision/prompts.ts`.

| Constant | Backs | Sent by |
|---|---|---|
| `chatScopeQuestion` + `chatScopeCriteria` | `scope` | `classify` (chat), `classifyChatWithTools` |
| `chatSafetyCriteria` | `safety` | `classify` (chat), `classifyChatWithTools` |
| `contactIntentQuestion` + `contactIntentCriteria` | `contact_intent` | `classify` (chat), `classifyChatWithTools` |
| `toolUseCriteria` + module-private `toolUseInstructions` (both read by `toolQuestions()`) | per-tool routing | `classifyChatWithTools`, `routeTools` |
| `TOOL_ROUTING_GUIDANCE` | `routing_guidance` inside serialized state | both routing serializers |
| `contactSubmissionIntentQuestion` + `contactCriteria` | `intent` | `classify` (contact channel) |
| `contactSubmissionSafetyQuestion` + `contactSubmissionSafetyCriteria` | `safety` | `classify` (contact channel) |
| `contactTemplateSelectionSafetyQuestion` | `safety` at template phase | `classifyContactWorkflow` |
| `contactFormSafetyQuestion` + `contactFormSafetyCriteria` | `safety` at form phase | `classifyContactWorkflow` |
| `contactTemplateSelectionQuestion` + `contactTemplateSelectionCriteria` | `template_choice` | `classifyContactWorkflow` |
| `contactFormTemplateFitQuestion` + `contactFormTemplateFitCriteria` | `template_fit` | `classifyContactWorkflow` |

Both contact-channel questions are specific to a message the visitor has already
chosen to submit, and both were tuned against the previous decision model's live scores rather
than written blind. Both carry the measured numbers in the comments in
`prompts.ts`; re-measure before rewording, because the wording is load-bearing
for confidence calibration and not just for readability.

### Calibrating the contact questions

Both contact questions are confidence-gated at `MODERATION_MIN_CONFIDENCE`, so
wording changes are behaviour changes, not style edits. Every rejected category
has to survive inside one `unsafe` description rather than as its own label:
measured against the previous decision model, a nine-label safety map scored a genuine
quotation request 0.69 and the server rejected it, while the binary form scored
the same message 0.89–0.94 and still scored script payloads, prompt injection,
secrets, threats, sexual content and spam 0.99–1.0.

The `intent` question must also be written for this context. Reusing
`contactIntentQuestion` — which decides whether a *chat turn* should start the
contact workflow — dropped a community-centre enquiry from 0.99 to 0.68.

When you change either one, re-run the live matrix before trusting it: benign
collab, bug report, quotation, long organisational enquiry, blunt/angry
complaint, and short quote must all clear 0.75, while spam, phishing, script
payloads, `javascript:` URIs, prompt injection, leaked credentials, sexual
content, and threats must all be blocked.

### Crafting for the decision models

Perplexity's Decisions API guide (`docs.perplexity.ai/docs/decisions/quickstart`,
read 2026-10-17) shapes how these prompts are built:

- **Group facets of one decision; split competing candidates.** The guide says
  `pplx-decider-v1.2` benefits from grouping related questions, while
  `pplx-decider-flash-v1.2` is grouping-sensitive and wants one question per
  request by default. The chat call groups scope + safety + contact intent +
  every tool's use/skip as facets of one routing decision, which is the
  documented good grouping; the relevance gate sends one document per request.
  The same question scores differently depending on its grouping, so keep
  grouping fixed when comparing runs or tuning thresholds.
- **`choice` criteria are applicability rules.** Each option's description
  should say when that option applies. `confidence` is the model's own
  certainty — not the top probability; it drops when the runner-up is close —
  and that is what the 0.6 gate consumes.
- **Thresholds need margin.** Identical requests usually return identical
  numbers to about the second decimal. 0.6 was revalidated flat across
  0.50–0.90 by the decision-model benchmark.
- **Retries honor `Retry-After`.** 429/5xx are retried in
  `system-one-client.ts` using the header's delay, capped at 2s per delay.
- **Aliases move; versioned names do not.** `pplx-decider-latest` follows the
  newest version and Perplexity's guidance is to revalidate thresholds when
  the model changes; production pins `perplexity/pplx-decider-v1.2` through
  `DECISION_MODEL`.
- **Name the real corpora and pin the vocabulary production misses.** The tool
  descriptions name the material kinds the index actually holds — profile
  facts, project deep-dives, interview Q&A, blog essays, repository reports —
  and draw three boundary pairs the decider confused: “post / article / blog”
  is publication state on `site_content` but written content and recorded
  views on `search_knowledge`; “this site” is what it publishes
  (`site_content`) versus how it is built (`search_knowledge`); and coding
  time is exactly one of `coding_stats` (preset aggregates, no project, no
  explicit date) or `coding_history` (projects, dates, breakdowns, series,
  trends, streaks). The routing corpus pins each line
  (`post-latest-informal`, `blog-where-to-read`, `written-about-ai-testing`,
  `post-content-opinion`, `site-implementation-not-services`,
  `coding-yesterday`, `opinion-ai-code-review`), and the chat surface scores
  the production path with an exact tool set (`chat-post-latest`,
  `chat-written-about-ai`, `chat-opinion-code-cheap`,
  `chat-site-implementation`).
- **Prompts are not the backstop for a missed call.** `agent/tool-selection.ts`
  adds an owner-voice guard: `OWNER_VOICE_FRAME` (“do you think”, “your
  view/take”, “have you written”, “you wrote”) combined with
  `OWNER_VOICE_TOPIC` forces one `search_knowledge` call when a recorded view
  or written answer exists, even if the decision model skipped every source.
  `tests/server/chat-tool-selection.test.ts` pins the forced path and the
  assistant-capability negative.

Prompt-craft check 2026-10-17 (grouped chat call, five samples each): three
criteria edits plus one corpus reword flipped every measured `v1.2` chat miss —
“What is your email address?” scores `safe` 0.68–0.70 (was `secret_extraction`
0.38), “Thanks, that helps!” `assistant_usage` 1.00 (was `general_knowledge`
0.23), site criticism keeps `contact_intent` `normal_chat` 0.79–0.83 (was
`uncertain` 0.13), and an unambiguous on-behalf request scores `on_behalf`
0.94–0.96. Hostile controls held: secret-extraction attacks stayed 0.99–1.00
on both models.

Tool-routing craft, same day, measured on the extended corpus (97 routing
cases, 59 chat cases, three repeats each): pass one scored routing 78.4%
exact-set (228/291 records) and exposed three deterministic regressions from
the first wording — interview-style questions went unretrieved, a
named-project “explain” question also picked up the catalogue, and “break down
by language” went to the shares instead of the warehouse. Pass two —
software-development questions named in the `search_knowledge` description,
skills and ownership-versus-contribution exclusions, a breakdown sentence on
`coding_stats`, and the bare-language rule in `general_knowledge` — reached
**86.6% exact-set (252/291 records, 84/97 cases) with chat at 100% benign
pass, 0 false rejects, 0 hostile false accepts, 12/12 exact tool sets, and 0
errors across 468 calls**. The 13 remaining case misses are all pre-existing
over-fires: negative or out-of-scope questions the scope gate blocks before
tools run, plus three site-publication questions that also pick up
`search_knowledge` (one extra relevance-gated call, never a missing one).

## Label sets are contracts

The keys of a criteria map are the only labels the decision model may return for that question,
and `requiredAnswer` throws on anything else. That throw surfaces as
`{ unavailable: true }` and an HTTP 503, never as a wrong-category error.

How each consumer supplies the accepted list differs, and that difference is the
trap:

- The direct contact channel derives it with `Object.keys(criteria)`, so the map
  and its consumer cannot drift.
- The chat contact workflow still passes hand-written arrays to `requiredAnswer`
  (`decision-classifier.ts`). Those are duplicated label lists and they are the
  place drift happens: a label added to `contactFormSafetyCriteria` is rejected
  at runtime until that array is updated too.

Two consequences worth internalising:

- Adding a label is a behaviour change on every path that uses that map, not a
  prompt edit. It changes what the server accepts.
- Never hand-maintain a parallel array of accepted labels. Derive it from the map
  keys, as the contact channel does.

## Two contact paths, deliberately different

The direct `/contact` page and the locked chat contact workflow both screen with
the decision model but are not the same path.

| | Direct `/contact` | Chat contact workflow |
|---|---|---|
| Session marker | `direct_contact_page` | `fresh_contact_only` |
| State | submitted message, framed as untrusted data | phase, selected template, message, submitted fields |
| Questions | `intent` + `safety` | `safety` + `template_fit` / `template_choice` |
| Passed to the email | after both questions pass at `submitContactMessage` | after the form-phase screen at `submitForm` |
| Turnstile | `contact` action, before screening | `contact` action, at final confirmation |

Do not unify them. The chat workflow's template-fit decision is meaningless on a
page that has no template, and its accepted-label list is frozen against an
already-shipped path. The direct page has no template to fit, so `intent` plus a
full `safety` question is the right pair there.

`checkContact` judges intent **before** safety so a spam submission is never
described to the safety model, and returns a bare `{ allowed: false }` with no
reason: the HTTP handler turns it into a generic 422, and no screening category
may leak to whoever submitted the message.

## Thresholds and over-rejection

`MODERATION_MIN_CONFIDENCE` (default `0.6`) is declared in
`src/server/env-schema.ts` and read once in `runtime.ts`. It is applied only
through `isConfident` in `service.ts`, and it gates **every** decision-model safety and
contact-intent decision — chat scope safety, chat contact workflow screening,
tool routing confidence, and the direct `/contact` screen alike. Changing it is
not a contact-only change.

It was `0.75` until 2026-10-02. The floor dropped to `0.6` after the contact
questions were calibrated (see above), because by then every hostile category
scored `0.99`–`1.0` and the remaining rejections were borderline-but-genuine
messages. At `0.75` a nine-label safety map rejected a real quotation request at
`0.69`; the binary rewrite fixed the wording, and the lower floor adds margin
for unusual phrasing on top of that.

Checked again on 2026-10-17 with the decision-model benchmark (chat sweeps
0.50–0.90 for the previous model and `perplexity/pplx-decider-v1.2`): both are flat
across the sweep, so chat outcomes are label-driven rather than
confidence-driven and `0.6` stays. The deciders also returned confidence and
probabilities on every captured decision, so optional confidence never broke
the gate; the contact and relevance failures observed for the OpenRouter route
were transient request errors, and `system-one-client.ts` absorbs most of them
with bounded retries (post-fix: 3 `unavailable` + 9 errors of 2,256 `v1.2`
calls; 7 of the 9 are the SDK-bound relevance gate, which the migration moves
onto the retrying client).

The two failure modes pull in opposite directions:

- **Over-rejection** blocks real enquiries. It is the failure that actually
  occurred. A genuine quotation request once scored `0.71` against the old gate.
- **Under-rejection** lets hostile content reach the inbox. Measured at `0.6`,
  XSS, prompt injection, leaked credentials, threats, sexual content, and spam
  all still score `0.99`–`1.0`, so the gap is wide.

When a legitimate submission is rejected, fix the criterion wording first.
Lowering the threshold globally is the blunt instrument and moves every path at
once; reach for it only with measured evidence that the wording is already
correct.

Scope confidence is deliberately not gated on the chat path — it produced too
many false `uncertain` rejections on genuine owner questions. Only safety
confidence gates, plus an explicit `uncertain` scope label.

## Untrusted data

The latest message, conversation history, topic anchors, submitted contact
fields, retrieved evidence, and tool outputs are data, never instructions. Every
state serializer states this, and the criteria descriptions tell the model to
ignore embedded directions. Do not strip that framing to save tokens: it is the
highest-value instruction in an injection-resistance task.

Contact message text and form values must never reach application logs or
Discord diagnostics. The direct contact path deliberately passes no
`ModerationDiagnosticsObserver`. Keep it that way.

## The scope question separates asking from producing

`technical_question` is an **in-scope** label, so its description used to be
the trap that let unrelated requests through: it claimed to cover
"TypeScript/JavaScript language questions" with nothing excluding work
product, so "please output a typescript" scored in scope and the responder
wrote a generic snippet. The criteria now draw the line explicitly:

- `technical_question` is understanding, comparison, advice, or a
  recommendation Nelson would give — "asks for understanding, comparison, or
  advice, not for produced code".
- `general_knowledge` owns every request that asks the assistant to *produce*
  something instead of answer: code or text to write, generate, complete,
  refactor, or debug in any language or subject; a role-play or different
  persona; or an action to run, edit, deploy, book, pay, schedule, or send.
- `chatScopeQuestion` states the same exclusion once, plus the **follow-up
  rule**: a turn that only adds detail to, or narrows the output of, such a
  request is that same out-of-scope request. That rule is what stops the
  reported "please output a typescript" → "A code snippet demo" pair, where
  each turn read as a harmless short question in isolation.

`general_knowledge` also states the **bare-mention rule**: a terse or fragmented
mention of that work product ("a code snippet demo", "output a typescript") is
the same request, not an ambiguous one. Without it the very first probe run
left that exact turn at `uncertain` 0.64 with no history. It was never a leak —
`service.ts` treats an explicit `uncertain` scope label as a hard block — but
the visitor gets the rephrase prompt instead of the scope message, so the rule
belongs in the label rather than in the gate.

Measured against the previous decision model on 2026-10-06, final wording, 44 cases: **28
out-of-scope all `general_knowledge`, 16 in-scope all accepted, zero
`uncertain`.** The reported turn 0.99, its follow-up 1.00, bare "A code snippet
demo" 0.97, "Code." 0.92. Out-of-scope floor was "pay my invoice for me" 0.56
and "optimise this sorting algorithm" 0.64. In-scope floor was "what is your
experience with Go?" 0.66 and "why did you choose pgvector for this site?"
0.65. Through the service layer the reported turn returns
`{ allowed: false, reason: 'out_of_scope' }` and a genuine offer question still
returns `{ allowed: true }`.

Re-measure both directions before trusting any rewording here. The positive
controls matter as much as the negatives, because the failure this fixed was
silent over-inclusion, not a rejection.

Refined 2026-10-17, after the measurement above (which used the earlier
wording): generic software-development questions stay in scope only in their
interview form — explaining, comparing, or asking Nelson’s view on an industry
topic — and are answered from his recorded experience; opinions count as
answerable whether the material lives in the interview corpus, a blog post, or
the RAG index. A request for a decision or hands-on help on the visitor’s own
project or work (“should I use server components or client components for a
dashboard like this?”, “review my schema”, “improve my algorithm”) is out of
scope even though it is technical. The decision-model benchmark corpus pins
both sides (`chat-technical-interview-style`, `chat-opinion-vibe-coding`,
`chat-opinion-ai-juniors`, `chat-out-own-project-advice`,
`chat-out-review-my-schema`); re-measure the scope matrix with the new wording
before trusting counts.

First measurement with the new wording (2026-10-17, previous model, chat prompt,
five samples per message): “review my schema” flips from `technical_question`
to `general_knowledge` (0.74–0.82); “should I use server components or client
components for a dashboard like this?” weakens from 1.00 to 0.60–0.68
`technical_question` but still passes — the one corpus case the refinement does
not yet bind; “How would you handle the remaining cents when splitting an
expense?” was already `general_knowledge` (0.96+) under the previous wording,
so scenario-style interview hypotheticals are a pre-existing gap, not a
regression. The decision-model benchmark corpus reports both as baseline
misses.

## Prompt budget

`tests/server/decision-classifier.test.ts` pins
`JSON.stringify(requestBody.questions).length < 13_000` on the chat-and-tools
path. The ceiling moved from 12,000 to 13,000 on 2026-10-17, when production
moved to `perplexity/pplx-decider-v1.2` (256K context): the extra room pays for
corpus vocabulary in the source descriptions without trading away accuracy
wording. **Everything else is measured, not estimated** — the measurement
command below stubs every question text with `"x"` and undercounts, so log
`JSON.stringify(requestBody.questions).length` inside the budget test itself.
It was 11,849 before the 2026-10-06 scope change, 11,986 after it, 11,981
after the 2026-10-17 technical-scope refinement (interview-style questions stay
in scope, visitor-project decisions and hands-on help do not, and opinions on
recorded topics are answerable), 11,984 after the same day's contact-criteria
craft, and 12,104 after the tool-vocabulary craft and owner-voice guard — about
900 characters of headroom under the new ceiling. The contact-channel constants
are not in that payload, so they are unconstrained by this budget.

Measure after any prompt edit rather than eyeballing it:

```bash
bun -e 'import("./src/server/moderation/decision/prompts.ts").then(p=>{const t=["search_knowledge","list_owned_projects","coding_stats","coding_history","site_content","services"];const q=JSON.stringify({scope:{q:p.chatScopeQuestion,c:p.chatScopeCriteria},safety:{q:"x",c:p.chatSafetyCriteria},contact_intent:{q:p.contactIntentQuestion,c:p.contactIntentCriteria},...Object.fromEntries(t.map(x=>[x,{q:"x",c:p.toolUseCriteria}]))});console.log(q.length)})'
```

Several tests pin exact prompt substrings — `'portfolio assistant'` in the
assistant-usage pin, and the chat-scope wording. Re-pin them to the substring
expressing the new intent when you reword. Never delete an assertion and never
loosen one so both old and new wording pass.

## Change checklist

When changing a decision prompt or criteria map:

1. Update this file's prompt map and label-set sections if a constant is added,
   renamed, or re-pointed.
2. Update the consumer's accepted-label list in the same change, or derive it
   from the map keys.
3. Update `tests/server/decision-classifier.test.ts` for request shape and
   `tests/server/moderation.test.ts` for gating behaviour.
4. Re-measure the prompt budget above.
5. Re-pin any exact-wording assertion to the new intent rather than loosening it.
6. If the change touches the contact screens, update `src/server/chat/AGENTS.md`
   so the two files do not drift.
