# LST97 Portfolio

Nelson’s portfolio site and chat assistant. The app is built with TanStack Start and Payload CMS. The chat can answer from current published site content, an indexed personal knowledge base, WakaTime data, and a structured catalogue of owned GitHub repositories.

## Development

```sh
bun install
bun --bun run dev
```

See [Personal knowledge chat (RAG)](docs/knowledge-rag.md) for the isolated knowledge database, GitHub report indexing, and project catalogue workflow.

## Project catalogue

The chat’s `list_owned_projects` tool reads a structured table in the dedicated knowledge database. It returns up to ten short project records and supports filters for text, programming languages, software kinds, topics, visibility, created and updated dates, stars, forks, and imported WakaTime time. WakaTime time filters accept `all_time`, `last_year`, `last_30_days`, or `last_7_days`, as well as explicit dates. The `coding_history` tool uses the same range presets for per-project breakdowns and named-project totals. The model can combine catalogue results with `search_knowledge` when it needs deeper source evidence. Repository reports remain in the vector index for project details and citations. Run `bun run knowledge:github:catalog` to refresh catalogue metadata from GitHub without re-embedding the reports.

The catalogue includes repositories Nelson owns, both public and private. Contributions remain separate. Software kinds are curated labels such as `web_app`, `mobile_app`, `desktop_app`, `api_backend`, and `cli_tool`; an unknown kind stays unclassified until reviewed. First results highlight the star leader and then favor recent updates. Follow-up batches exclude projects already shown in the signed conversation context.
