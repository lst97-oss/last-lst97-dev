# Plans — historical record

**Nothing in this directory is a completion signal.** These are dated design and
implementation plans, kept for provenance. Most shipped with their checkboxes
still unticked, because the plan was written before the work and the boxes were
never ticked afterwards.

Treat the code as authoritative, not these documents:

- `AGENTS.md` and the per-directory `src/server/{knowledge,chat,moderation}/AGENTS.md`
- the committed Payload migrations in `src/migrations/`
- the test suite

Only `2026-09-25-guided-project-discovery.md` carries a `Status:` header
("Implemented and verified"). The rest have none, so do not infer status from
their presence here.

Two known-divergent items called out in the root `AGENTS.md`, since the code
moved past them after the plan was written:

- The 2026-09-24 embeddings spec/plan names a `.cn` SiliconFlow host. The code
  uses `https://api.siliconflow.com/v1`.
- The 2026-09-24 multiturn spec/plan describes 12-message / 60,000-char
  transcript caps. The code uses `MAX_CHAT_TURNS = 20`,
  `MAX_CHAT_CONTEXT_MESSAGES = MAX_CHAT_TURNS * 2`, and
  `MAX_CHAT_CONTEXT_TOKEN_CHARS = 1_500_000`, all in `src/lib/chat-limits.ts`.

Operational documentation lives in `docs/` proper — `docs/wakatime-history.md`
and `docs/security/vercel-ingress.md` — and in `AGENTS.md`.