# Multi-turn tool use and retrieval

Research checked 2026-09-24 against current first-party OpenAI API guidance. This note applies to the portfolio chat's Jev routing, knowledge retrieval, and WakaTime tools.

## Recommendation

Run the tool decision again on **every user turn**, using the current message plus enough recent conversation to resolve references. Do not make tool use depend on whether the first turn used a tool, and do not treat an earlier assistant answer as authoritative evidence. A short follow-up such as “how about the education?” should be contextualized to a standalone request about Nelson's education, then routed to the knowledge source. A short social response such as “thanks” should not trigger retrieval.

OpenAI's retrieval guidance demonstrates combining two decisions: rewrite the latest message into a self-contained query using prior conversation, then decide whether that contextualized query needs retrieval. It recommends using the last few messages as context and gives paired retrieval and no-retrieval examples. This supports improving Jev's per-turn context and examples before adding many narrowly specialized routing branches. See [Latency optimization: query contextualization and retrieval check](https://developers.openai.com/api/docs/guides/latency-optimization#part-1-looking-at-retrieval-prompts).

## Preserve evidence across turns

Keep conversation state sufficient to resolve follow-ups, but distinguish user/assistant text from tool evidence. Retain tool calls and their results with the associated tool name, arguments, and source/date metadata where practical. Feed the relevant prior evidence back into the response when it supports the current answer; if it is missing, stale, or the new question needs current facts, call the source again. Never treat a prior assistant claim as a source. OpenAI's conversation-state docs describe carrying messages, tool calls, and tool outputs across turns; function-calling guidance shows the tool result being returned to the model and the loop continuing until the model can answer. See [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state) and [Function calling](https://developers.openai.com/api/docs/guides/function-calling).

For long chats, preserve a bounded recent transcript plus a compact, explicit state summary (resolved people/topics, user constraints, and evidence references); retrieve the underlying records rather than stuffing a growing transcript or large tool payload into every prompt. OpenAI notes that context windows are finite and its retrieval guidance constrains contextualization to recent messages. A summary should help resolve references, not replace source evidence. See [Prompt engineering: context windows and retrieval](https://developers.openai.com/api/docs/guides/prompt-engineering#include-relevant-context-information).

## What to change and evaluate

- Keep Jev's routing pass on every turn. Provide it the current turn, recent relevant turns or a compact state summary, trusted current time, and the available tool descriptions.
- Have the routing step produce both a standalone/contextualized query and tool decision(s). Use that resolved query for tool arguments so pronouns and ellipses do not reach search literally.
- Tell the responder to use retrieved evidence and its provenance; it may use recent tool evidence already present in context, but must fetch again when the question is freshness-sensitive or evidence is absent.
- Add multi-turn routing evaluations: “What project are you currently doing?” → “What does that project do?”; “Tell me about your experience.” → “How about education?”; same follow-up after many unrelated turns; “thanks” after a tool answer; and a current-data follow-up after stale evidence. Assert both the resolved query and expected tool call, not only final prose.

The user's sample suggests the missing behavior is principally **turn-aware query contextualization plus evidence-aware re-routing**, rather than a much longer initial prompt. Keep stable assistant identity/policy in the initial prompt; put the current contextualized question and selected source evidence into each turn's runtime context. OpenAI's prompt guidance likewise separates high-level instructions from relevant retrieved context and advises testing prompt changes against representative examples.
