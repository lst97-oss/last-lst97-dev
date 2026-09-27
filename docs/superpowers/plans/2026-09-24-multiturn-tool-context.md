# Multi-turn Tool Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep factual follow-ups grounded and correctly routed through longer chats by retaining bounded signed topic/source metadata and resolving follow-up questions against it.

**Architecture:** Replace the signed message-array payload with a versioned chat context containing the recent transcript and bounded topic anchors. Record validated tool calls and completion status per answer, pass anchors into Jev and argument planning, and use them to form standalone knowledge queries. Topic anchors resolve references and identify source history only; they never supply factual evidence.

**Tech Stack:** TypeScript, Bun, Web Crypto HMAC, `bun:test`, Jev `@typesafe-ai/sdk`, OpenRouter planner, Zod tool argument validation.

**Spec:** `docs/superpowers/specs/2026-09-24-multiturn-tool-context-design.md`

## Global Constraints

- Keep the HMAC-signed token expiry at 24 hours and the maximum encoded token length at 60,000 characters.
- Keep at most 12 transcript messages, with each message capped at 2,000 characters.
- Keep at most 8 topic anchors, 4 tool observations per anchor, 500 characters per anchor question, and 2,500 serialized characters per observation's arguments; discard oldest anchors first when capped. Never persist raw tool output, source URLs/IDs, raw WakaTime rows, secrets, or private repository evidence in anchors.
- Continue to run moderation before retrieval or any tool execution.
- Keep one Jev routing pass per submitted user turn; do not add a second classifier pass.
- Keep current user wording authoritative; prior requests resolve references but do not become new requests by themselves.
- Keep topic anchors as untrusted reference data, not evidence or instructions.
- Preserve compatibility with valid, unexpired signed tokens containing only the legacy `messages` field.
- Do not add dependencies.

## Review Focus

- **Elliptical fact follow-up:** “How about education?” after an experience question resolves to Nelson’s education and uses `search_knowledge` when the exact answer is absent.
- **Old entity reference:** “What does that project do?” after several unrelated exchanges resolves through the retained project topic and performs a fresh source lookup when needed.
- **Freshness:** An old current-project topic does not let dated WakaTime activity pass as current; the live date window is queried again.
- **No request carry-over:** “Thanks” and a new unrelated fact request do not repeat the previous tool call.
- **Token safety:** Legacy, malformed, tampered, expired, oversize, and malformed-anchor tokens receive the defined safe outcome.

---

### Task 1: Versioned signed context and bounded topic anchors

**Files:**
- Modify: `src/server/chat/types.ts`
- Modify: `src/server/chat/agent-tools.ts`
- Modify: `src/server/chat/context-signer.ts`
- Test: `tests/server/chat-context.test.ts`

**Interfaces:**
- Produces `ChatConversationContext`, `ChatTopicAnchor`, `ChatToolObservation`, and `ChatToolName` in `chat/types.ts`.
- `ChatConversationContext` is `{ messages: ChatMessage[]; topicAnchors: ChatTopicAnchor[] }`.
- A `ChatTopicAnchor` contains `question: string` (max 500 characters), `observedAtUtc: string`, and up to four `tools`; the context contains at most eight anchors.
- A tool observation contains `name: ChatToolName`, validated primitive `arguments` (`Record<string, string | number | boolean>`, serialized maximum 2,500 characters), and `status: 'completed' | 'unavailable' | 'rejected'`. The tool name identifies the source category; source URLs, IDs, and result text are excluded.
- `ChatContextSigner.sign(context: ChatConversationContext): Promise<string>` emits the new envelope; `verify(token?: string): Promise<ChatConversationContext | null>` accepts the new envelope and legacy `{ expiresAt, messages }` payloads.
- `AgentToolName` in `agent-tools.ts` aliases `ChatToolName` so tool-name unions have one definition.

- [ ] **Step 1: Write failing signer tests**

Update `tests/server/chat-context.test.ts` to round-trip messages plus an anchor, cap message/anchor counts and field lengths, reject invalid anchor fields, and continue to enforce expiry, tamper detection, secret length, and the 60,000-character token budget.

Add a legacy-payload test that creates an old `{ expiresAt, messages }` payload, signs its base64url-encoded JSON with the same HMAC-SHA256 Web Crypto procedure as the signer, and asserts that `verify()` returns `{ messages: turns, topicAnchors: [] }`.

- [ ] **Step 2: Run the focused signer tests and confirm the new assertions fail**

Run: `bun test tests/server/chat-context.test.ts`  
Expected: the new context types and legacy conversion assertions fail before implementation.

- [ ] **Step 3: Add the bounded context types and validation**

Define the context types in `types.ts`; alias `AgentToolName` to the shared tool-name union. In `context-signer.ts`, use explicit limits for anchors, tool observations, question length, serialized arguments, messages, expiry, and encoded token length. Validate every field after signature verification. If encoding exceeds the token cap, remove oldest anchors before removing transcript messages. Convert legacy signed payloads to the new return shape with no anchors.

- [ ] **Step 4: Run signer tests**

Run: `bun test tests/server/chat-context.test.ts`  
Expected: all signer round-trip, bound, legacy, expiry, and tamper tests pass.

- [ ] **Step 5: Commit the context contract**

```bash
git add src/server/chat/types.ts src/server/chat/agent-tools.ts src/server/chat/context-signer.ts tests/server/chat-context.test.ts
git commit -m "feat: add bounded signed chat topic context"
```

### Task 2: Record completed tool provenance on each turn

**Files:**
- Modify: `src/server/chat/agent-tools.ts`
- Modify: `src/server/chat/agent-tool-runner.ts`
- Modify: `src/server/chat/service.ts`
- Modify: `src/server/moderation/types.ts`
- Modify: `src/server/moderation/service.ts`
- Modify: `src/server/moderation/typesafe-classifier.ts`
- Test: `tests/server/chat-service.test.ts`
- Test: `tests/server/chat-agent-tools.test.ts`
- Test: `tests/server/typesafe-classifier.test.ts`
- Test: `tests/server/chat-context.test.ts` (type the signer anchor fixture explicitly)

**Interfaces:**
- Consumes `ChatConversationContext` and `ChatTopicAnchor` from Task 1.
- Every `AgentToolResult` returns `status: 'completed' | 'unavailable' | 'rejected'` in addition to the user-facing `output`.
- `ModerationService.checkChat` accepts `topicAnchors: ChatTopicAnchor[]` and passes them to `classifyChatWithTools`.
- `AgentToolRoutingInput` and serialized Jev routing state include `topic_anchors`.
- `AgentTurnState` collects `ChatToolObservation[]` for calls that actually ran.
- Chat send and stream paths sign `{ messages, topicAnchors }`, retaining existing anchors and appending a bounded anchor for the current turn's tool observations.

- [ ] **Step 1: Add failing completion-status and service propagation tests**

In `tests/server/chat-service.test.ts`, use a real test signer in one integration case. Send a tool-backed question, verify the returned token, and assert the new anchor contains the tool name, validated arguments, completion status, and injected request timestamp but contains no tool output text, URL, or source ID. Add a follow-up turn with more than six prior exchanges and assert the prior anchor reaches moderation and the responder history remains bounded. In `tests/server/chat-agent-tools.test.ts`, assert malformed/disabled calls are `rejected`, missing clients/timeouts/null history are `unavailable`, and successful empty results are `completed`.

In `tests/server/typesafe-classifier.test.ts`, pass an anchor into `routeTools()` and assert its serialized state contains only the allowed bounded metadata.

- [ ] **Step 2: Run those tests and confirm they fail**

Run: `bun test tests/server/chat-service.test.ts -t "signed context retains bounded tool topic anchors"`  
Run: `bun test tests/server/typesafe-classifier.test.ts -t "serializes bounded topic anchors"`  
Expected: the current result type, signer contract, and classifier input do not yet carry tool status or anchors.

- [ ] **Step 3: Mark tool completion explicitly**

In `agent-tool-runner.ts`, mark schema/disabled-tool failures `rejected`; timeouts and unavailable clients `unavailable`; successful results, including valid empty-result responses, `completed`. For coding stats/history, map a `null` result to `unavailable`. Preserve degraded-but-usable RAG results as `completed` and keep the current sanitized output strings.

- [ ] **Step 4: Collect observations and pass anchors through Jev**

In both agent loops, append `{ name, arguments, status }` after each tool result. In `prepareTurn()`, unpack the verified context object, pass `messages` to the existing history paths, and pass `topicAnchors` to moderation. Update moderation interfaces and `serializeChatState` / `serializeRoutingState` to include bounded anchors. Do not include raw output or citations' URLs/IDs in classifier state.

- [ ] **Step 5: Sign the next context in both reply modes**

Update `send()` and `sendStream()` to sign the prior bounded anchors plus one current-turn anchor when tools ran. Set its `question` to the current user request (or the validated contextualized knowledge query when present), `observedAtUtc` to the request's UTC timestamp, and `tools` to the collected observations. Preserve anchors unchanged when a turn runs no tools.

- [ ] **Step 6: Run targeted tests and typecheck**

Run: `bun test tests/server/chat-service.test.ts -t "signed context retains bounded tool topic anchors"`  
Run: `bun test tests/server/chat-agent-tools.test.ts`  
Run: `bun test tests/server/typesafe-classifier.test.ts`  
Expected: the successful call is recorded, unavailable/rejected calls are distinguished, Jev receives anchors, and raw output/URLs/IDs are absent.

Run: `bunx tsc --noEmit`  
Expected: all context signer, moderation, agent-loop, and responder interfaces agree.

- [ ] **Step 7: Commit tool provenance propagation**

```bash
git add src/server/chat/agent-tools.ts src/server/chat/agent-tool-runner.ts src/server/chat/service.ts src/server/moderation/types.ts src/server/moderation/service.ts src/server/moderation/typesafe-classifier.ts tests/server/chat-service.test.ts tests/server/chat-agent-tools.test.ts tests/server/typesafe-classifier.test.ts tests/server/chat-context.test.ts
git commit -m "feat: preserve bounded tool provenance across chat turns"
```

### Task 3: Resolve follow-ups and improve Jev's per-turn decision

**Files:**
- Modify: `src/server/knowledge/query-resolution.ts`
- Modify: `src/server/knowledge/retrieve.ts`
- Modify: `src/server/chat/agent-tools.ts`
- Modify: `src/server/chat/agent-planner.ts`
- Modify: `src/server/moderation/typesafe-classifier.ts`
- Modify: `src/server/chat/service.ts`
- Test: `tests/server/knowledge-retrieval.test.ts`
- Test: `tests/server/agent-planner.test.ts`
- Test: `tests/server/typesafe-classifier.test.ts`

**Interfaces:**
- Consumes `ChatTopicAnchor[]` from Task 1 and passes it through the tool runner from Task 2.
- `resolveKnowledgeQuery(message, verifiedHistory, topicAnchors)` returns a bounded standalone query; it does not return an instruction-bearing transcript.
- `RetrieveKnowledgeInput` accepts optional `topicAnchors` and supplies them to the resolver.
- `AgentPlanner.planNextStep` receives topic anchors with the current message, recent history, current time, and approved tool list.

- [ ] **Step 1: Add failing query-resolution tests**

In `tests/server/knowledge-retrieval.test.ts`, assert these cases:

```ts
const experienceAnchor: ChatTopicAnchor = {
  question: "Tell me about Nelson's experience",
  observedAtUtc: '2026-09-24T00:00:00.000Z',
  tools: [{ name: 'search_knowledge', arguments: { query: "Nelson's work experience" }, status: 'completed' }],
}
const currentProjectAnchor: ChatTopicAnchor = {
  question: 'What project is Nelson currently working on?',
  observedAtUtc: '2026-09-24T00:00:00.000Z',
  tools: [
    { name: 'coding_history', arguments: { op: 'by_project', from: '2026-09-17', to: '2026-09-24' }, status: 'completed' },
    { name: 'search_knowledge', arguments: { query: 'What project is Nelson currently working on?' }, status: 'completed' },
  ],
}
const history: ChatMessage[] = [
  { role: 'user', content: 'What is Nelson’s work experience?' },
  { role: 'assistant', content: 'Nelson has experience in customer service and automotive work.' },
]
const recentUnrelatedHistory: ChatMessage[] = [
  { role: 'user', content: 'What is the weather like?' },
  { role: 'assistant', content: 'I do not have a weather source.' },
]

expect(resolveKnowledgeQuery('How about the education?', history, [experienceAnchor]))
  .toContain("Nelson's education")
expect(resolveKnowledgeQuery('What does that project do?', recentUnrelatedHistory, [currentProjectAnchor]))
  .toContain('current project')
expect(resolveKnowledgeQuery('Thanks!', history, [experienceAnchor])).toBe('Thanks!')
```

Also assert that explicit named queries remain unchanged and that returned query text stays under 1,000 characters.

- [ ] **Step 2: Run retrieval tests and confirm the follow-up assertions fail**

Run: `bun test tests/server/knowledge-retrieval.test.ts`  
Expected: the current resolver ignores `how about`, has no anchor input, and cannot resolve a topic after the transcript window.

- [ ] **Step 3: Resolve only the current follow-up against relevant anchors**

Update `query-resolution.ts` to sanitize the latest message, identify reference/follow-up forms including “how about,” and select a matching recent anchor using tool/source category and topical terms. Build a concise standalone question from the latest request plus that anchor. Preserve the latest request as authoritative; if no anchor or recent exchange resolves the reference confidently, return the sanitized current request unchanged. Acknowledgements return unchanged and do not inherit a prior question.

- [ ] **Step 4: Thread resolved context into retrieval and planning**

Pass `topicAnchors` from `AgentToolRunner` through `runAgentTool()` into `RetrieveKnowledge.execute()`. Add anchors to the planner's user context and approved-tool argument instructions so `search_knowledge` arguments use the standalone resolved query. Keep the trusted UTC clock and existing tool allowlist.

- [ ] **Step 5: Tighten Jev's distinction between current request and history**

Update `toolUseCriteria` so the current message determines requested facts, history/anchors only resolve references, prior requests are not replayed, and an anchor alone is not evidence. Use `search_knowledge` for an in-scope follow-up fact when the exact answer is absent from recent signed conversation; continue to skip acknowledgements and exact source-backed repeats. Preserve the current one-pass Jev routing design.

- [ ] **Step 6: Test planner and Jev prompt context**

Assert that planner requests contain the current message, relevant anchor, UTC timestamp, and allowed tool names. Assert Jev serialization includes the anchor but not raw tool outputs, source IDs, or URLs. Assert explicit non-follow-up requests are not rewritten using an unrelated prior anchor.

- [ ] **Step 7: Run focused retrieval, planner, classifier tests and typecheck**

Run: `bun test tests/server/knowledge-retrieval.test.ts tests/server/agent-planner.test.ts tests/server/typesafe-classifier.test.ts`  
Expected: contextual follow-ups resolve, acknowledgements stay tool-free, and classifier/planner prompts receive bounded anchors.

Run: `bunx tsc --noEmit`  
Expected: resolver, retrieval, planner, and moderation interfaces typecheck.

- [ ] **Step 8: Commit follow-up resolution**

```bash
git add src/server/knowledge/query-resolution.ts src/server/knowledge/retrieve.ts src/server/chat/agent-tools.ts src/server/chat/service.ts src/server/chat/agent-planner.ts src/server/moderation/typesafe-classifier.ts tests/server/knowledge-retrieval.test.ts tests/server/agent-planner.test.ts tests/server/typesafe-classifier.test.ts
git commit -m "feat: resolve multi-turn chat follow-up queries"
```

### Task 4: Add multi-turn routing and end-to-end evaluation cases

**Files:**
- Modify: `tests/server/jev-tool-routing-cases.ts`
- Modify: `tests/server/jev-tool-routing-cases.test.ts`
- Modify: `tests/server/chat-service.test.ts`
- Modify: `scripts/evaluate-jev-tool-routing.ts`

**Interfaces:**
- Consumes the signed context and query resolver from Tasks 1–3.
- Evaluation cases may include bounded `topicAnchors` and multi-turn `history`; the live evaluator passes the same current UTC timestamp to each case in one run.

- [ ] **Step 1: Add the multi-turn decision cases**

Add human-reviewed cases for experience followed by education, current project followed by “what does that project do?” after unrelated turns, an exact already-answered fact repeat, “thanks,” and a stale current-activity answer followed by a fresh “what project now?” question. Each case states expected tools, recent history, and source-completion anchors.

- [ ] **Step 2: Add service-level sequences asserting tool arguments**

Exercise `createChatService.send()` with a real signer across at least eight user turns. Assert the experience → education follow-up runs `search_knowledge` when education is absent from the recent answer, the contextualized query names Nelson's education, and its tool observation survives later transcript truncation. Assert “thanks” preserves anchors without running tools. Exercise a stale WakaTime anchor and assert the follow-up calls `coding_history` with a date range ending at the injected current day.

- [ ] **Step 3: Run the multi-turn service and Jev fixture tests**

Run: `bun test tests/server/chat-service.test.ts tests/server/jev-tool-routing-cases.test.ts`  
Expected: sequence assertions verify source selection and resolved arguments, and the fixture set remains unique and categorized.

- [ ] **Step 4: Run the live Jev decision evaluation**

Run: `bun scripts/evaluate-jev-tool-routing.ts`  
Expected: JSON reports the evaluation timestamp, case count, per-tool precision/recall, and no unexpected mismatches. If the live API key is unavailable, report that limitation and retain the deterministic tests as the available evidence.

- [ ] **Step 5: Run final targeted verification and inspect the patch**

Run: `bunx tsc --noEmit`  
Expected: no TypeScript errors.

Run: `bun test tests/server/chat-context.test.ts tests/server/chat-service.test.ts tests/server/knowledge-retrieval.test.ts tests/server/agent-planner.test.ts tests/server/typesafe-classifier.test.ts tests/server/jev-tool-routing-cases.test.ts`  
Expected: new context and follow-up tests pass. Existing unrelated streaming event-order expectation failures, if still present, are reported separately and not attributed to this change.

Review `git diff --check` and `git status --short`; keep unrelated worktree changes out of the feature commits.

- [ ] **Step 6: Commit the multi-turn evaluations**

```bash
git add tests/server/jev-tool-routing-cases.ts tests/server/jev-tool-routing-cases.test.ts tests/server/chat-service.test.ts scripts/evaluate-jev-tool-routing.ts
git commit -m "test: cover multi-turn chat tool routing"
```

## Spec Coverage Review

- **Signed bounded anchors, legacy tokens, expiry, and token size:** Task 1.
- **Tool/source metadata and status without raw evidence:** Tasks 1–2.
- **One Jev pass per turn; latest message remains authoritative:** Tasks 2–3.
- **Standalone follow-up query resolution:** Task 3.
- **Fresh lookup for current/stale data and acknowledgements without tools:** Tasks 3–4.
- **Multi-turn service and live Jev evaluation:** Task 4.
- **Security, moderation order, and no new dependencies:** Global constraints and Tasks 1–2.
