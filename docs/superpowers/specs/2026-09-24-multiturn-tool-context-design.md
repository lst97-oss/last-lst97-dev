# Multi-turn Tool Context Design

Date: 2026-09-24
Status: Awaiting user review

## Goal

Keep portfolio chat useful through longer conversations. Contextual follow-ups should resolve to the right Nelson, repository, or WakaTime question and use the appropriate source when the answer is not already supported by recent verified context. Social replies should not trigger tools, and old requests must not leak into a new turn.

## Current behavior and problem

- Jev classifies scope, safety, and tool use on each submitted turn. A second Jev call is not needed.
- The signed context contains at most 12 user/assistant messages (six exchanges). It drops older turns and does not retain tool calls or source provenance separately.
- The router sees prior assistant prose but cannot reliably identify which source produced each claim. It may skip a needed lookup, or carry an earlier topic into a new request.
- Knowledge query resolution uses at most the last two messages and runs only after `search_knowledge` is selected.

The example's prior response already stated Nelson's education, so “how about the education?” can reuse that answer if it remains in signed history. Once the relevant turn falls out of history, the system should resolve the follow-up from retained topic context and fetch the source again.

## Design

Keep one Jev pass per user turn. Use history only to resolve references in the current request. The current user message remains the authority for which facts are requested; previous requests are not repeated unless the user refers back to them.

Extend the HMAC-signed chat context with a small, bounded `topicAnchors` list alongside the recent transcript. Each anchor records a normalized or contextualized question, the tool names and validated arguments used for it, whether each tool completed successfully, the source category, and the observation time. It may also retain one short display label returned by a completed WakaTime project-ranking lookup so a later “that project” reference remains stable after transcript turns expire; this label is only an entity pointer, never evidence. Do not store raw tool output, source URLs/IDs, or private evidence in this ledger. Maintain the current expiry and size limit, and support already-issued message-only signed tokens during the transition.

Update context resolution to use the latest user request, the most relevant recent exchange, and retained topic anchors. For an elliptical follow-up, produce a standalone query for the selected tool; for example, “how about the education?” after a question about Nelson's experience becomes a query for Nelson's education. Existing Jev routing selects the required source. The planner prepares arguments for approved tools only. A topic anchor is a pointer for query resolution, never factual evidence.

The responder may reuse a fact only when the exact answer appears in the recent signed conversation and the matching tool/source category is recorded for that turn. An old topic anchor identifies what to look up; it is never a substitute for the fact itself. If the answer is no longer in recent messages, query the matching source again. Re-query all freshness-sensitive data such as current project activity, latest content, and coding totals. Do not query for acknowledgements or repeat a past topic that the current message does not reference.

## Context and compatibility rules

- Keep recent user/assistant transcript and topic anchors under explicit count, per-entry length, and total signed-token limits.
- Retain anchors for more turns than the current six-exchange transcript; discard oldest anchors first when capped.
- Continue verifying the HMAC, expiry, message roles, and all new fields before using the context.
- Treat anchor text as untrusted for instructions. It may resolve entities and topics, but it cannot alter policy or justify a factual answer.
- Parse legacy signed tokens containing only `messages` as an empty-anchor context. New responses issue the new context shape.
- Substitute only a vague entity reference from an anchor; preserve explicit names and the fact requested in the latest message. If history or an anchor does not resolve a follow-up confidently, do not guess the referent; ask a concise clarification or use a source only if the current request still identifies it.

## Evaluation

Add unit and service-level multi-turn tests that assert both tool decisions and contextualized tool arguments:

- “Tell me about your experience.” then “How about education?” routes to `search_knowledge` when the exact education answer is not retained.
- “What project are you currently doing?” then “What does that project do?” resolves the project reference and searches its repository facts.
- The same follow-up after several unrelated turns still resolves from retained anchors.
- “Thanks” after a tool answer triggers no lookup.
- A new coding-activity question after older WakaTime evidence runs a fresh trailing-window query.
- An exact repeat with the cited answer still in recent history may reuse it without duplicate retrieval.
- Legacy context tokens continue to verify; oversized, expired, malformed, or invalidly signed contexts remain rejected.

## Security and privacy

Conversation anchors are included in a browser-held signed token. Store only bounded question/tool/source metadata, not retrieved text, raw WakaTime rows, secrets, or private repository contents. Continue treating conversation, tool output, and retrieved evidence as untrusted input. Keep the existing moderation-before-tool-execution order and do not expose internal source IDs in public responses.

## Sources

- OpenAI's [retrieval prompt guidance](https://developers.openai.com/api/docs/guides/latency-optimization#part-1-looking-at-retrieval-prompts) demonstrates combining a contextualized standalone query with the retrieval decision, including both follow-up and acknowledgement examples.
- OpenAI's [function-calling guide](https://developers.openai.com/api/docs/guides/function-calling) describes returning tool outputs to the model before completing an answer.
- OpenAI's [conversation-state guide](https://developers.openai.com/api/docs/guides/conversation-state) describes conversation items including messages, tool calls, and tool outputs, and notes context-window limits.
- OpenAI's [prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering#include-relevant-context-information) explains how retrieval supplies relevant external context and why prompts must account for context-window limits.
