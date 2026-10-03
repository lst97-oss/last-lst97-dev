# Jev moderation and decision prompts

This note governs `src/server/moderation`. It is the prompt-level reference for
Jev, the TypeSafe decision model. `src/server/chat/AGENTS.md` owns chat behaviour
and links here; this file owns what Jev is asked, with which labels, and under
what thresholds. Keep it current whenever a prompt constant, criteria map, or
threshold changes.

Jev never writes user-facing prose. It classifies, labels, and routes; the
OpenRouter planner prepares tool arguments and the responder writes the answer.

## Decision surface

`createTypeSafeClassifier(apiKey)` (`typesafe-classifier.ts`) is the only export.
It builds one `TypeSafeClient` and returns the four `ModerationClassifier`
methods, each of which makes exactly one `client.systemOne({ state, questions })`
call:

| Method | Used by | Decides |
|---|---|---|
| `classify` | normal chat, direct `/contact` | chat scope/safety/contact intent, or contact intent/safety |
| `classifyChatWithTools` | chat turn preparation | scope, safety, contact intent, and every source's use/skip/uncertain |
| `classifyContactWorkflow` | locked chat contact workflow | template-phase safety + template choice, form-phase safety + template fit |
| `routeTools` | later agent-loop steps | use/skip/uncertain per source, with this turn's evidence |

Client config: `defaultModel: 'jev-latest'`, `timeout: 5_000`, retries disabled
(`maxRetries: 0`), `logLevel: 'off'`. A failed call throws; the service layer
converts every throw into `{ unavailable: true }` and the caller fails closed.

Answers are coerced through `typesafe-classifier/answers.ts`. `requiredAnswer`
throws on an unknown label or non-finite confidence; `readToolDecisions` does
the same per tool.

## Prompt map

All constants live in `typesafe-classifier/prompts.ts`.

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
chosen to submit, and both were tuned against live `jev-latest` scores rather
than written blind. Both carry the measured numbers in the comments in
`prompts.ts`; re-measure before rewording, because the wording is load-bearing
for confidence calibration and not just for readability.

### Calibrating the contact questions

Both contact questions are confidence-gated at `MODERATION_MIN_CONFIDENCE`, so
wording changes are behaviour changes, not style edits. Every rejected category
has to survive inside one `unsafe` description rather than as its own label:
measured against `jev-latest`, a nine-label safety map scored a genuine
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

## Label sets are contracts

The keys of a criteria map are the only labels Jev may return for that question,
and `requiredAnswer` throws on anything else. That throw surfaces as
`{ unavailable: true }` and an HTTP 503, never as a wrong-category error.

How each consumer supplies the accepted list differs, and that difference is the
trap:

- The direct contact channel derives it with `Object.keys(criteria)`, so the map
  and its consumer cannot drift.
- The chat contact workflow still passes hand-written arrays to `requiredAnswer`
  (`typesafe-classifier.ts`). Those are duplicated label lists and they are the
  place drift happens: a label added to `contactFormSafetyCriteria` is rejected
  at runtime until that array is updated too.

Two consequences worth internalising:

- Adding a label is a behaviour change on every path that uses that map, not a
  prompt edit. It changes what the server accepts.
- Never hand-maintain a parallel array of accepted labels. Derive it from the map
  keys, as the contact channel does.

## Two contact paths, deliberately different

The direct `/contact` page and the locked chat contact workflow both screen with
Jev but are not the same path.

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
through `isConfident` in `service.ts`, and it gates **every** Jev safety and
contact-intent decision — chat scope safety, chat contact workflow screening,
tool routing confidence, and the direct `/contact` screen alike. Changing it is
not a contact-only change.

It was `0.75` until 2026-10-02. The floor dropped to `0.6` after the contact
questions were calibrated (see above), because by then every hostile category
scored `0.99`–`1.0` and the remaining rejections were borderline-but-genuine
messages. At `0.75` a nine-label safety map rejected a real quotation request at
`0.69`; the binary rewrite fixed the wording, and the lower floor adds margin
for unusual phrasing on top of that.

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

## Prompt budget

`tests/server/typesafe-classifier.test.ts` pins
`JSON.stringify(requestBody.questions).length < 12_000` on the chat-and-tools
path. Measured headroom is roughly 1,400 characters. The contact-channel
constants are not in that payload, so they are unconstrained by this budget.

Measure after any prompt edit rather than eyeballing it:

```bash
bun -e 'import("./src/server/moderation/typesafe-classifier/prompts.ts").then(p=>{const t=["search_knowledge","list_owned_projects","coding_stats","coding_history","site_content","services"];const q=JSON.stringify({scope:{q:p.chatScopeQuestion,c:p.chatScopeCriteria},safety:{q:"x",c:p.chatSafetyCriteria},contact_intent:{q:p.contactIntentQuestion,c:p.contactIntentCriteria},...Object.fromEntries(t.map(x=>[x,{q:"x",c:p.toolUseCriteria}]))});console.log(q.length)})'
```

Several tests pin exact prompt substrings — `'portfolio assistant'` in the
assistant-usage pin, and the chat-scope wording. Re-pin them to the substring
expressing the new intent when you reword. Never delete an assertion and never
loosen one so both old and new wording pass.

## Change checklist

When changing a Jev prompt or criteria map:

1. Update this file's prompt map and label-set sections if a constant is added,
   renamed, or re-pointed.
2. Update the consumer's accepted-label list in the same change, or derive it
   from the map keys.
3. Update `tests/server/typesafe-classifier.test.ts` for request shape and
   `tests/server/moderation.test.ts` for gating behaviour.
4. Re-measure the prompt budget above.
5. Re-pin any exact-wording assertion to the new intent rather than loosening it.
6. If the change touches the contact screens, update `src/server/chat/AGENTS.md`
   so the two files do not drift.
