# LAST//OS v0.3.0

Sixteen commits since [v0.2.2](https://github.com/lst97-oss/last-lst97-dev-web/releases/tag/v0.2.2). v0.2.2 repaired the mobile scroll architecture; this release gives the site something to show — a public `/services` page, two new retrieval corpora, and a `Tags` vocabulary — and hardens the parts that were quietly wrong underneath.

## Services

`/services` is now a real page rather than a section buried in `/about`. Packages, add-ons, the delivery process, and the Go Support Plan each render from `src/lib/services/packages.ts`, which is the single source of truth for prices, inclusions, and technology lists. The page and its JSON-LD read the same module, so a price cannot drift between what a visitor sees and what a search engine reads.

The service copy is also indexed. `src/data/services/` holds 23 hand-authored documents split by offering — `packages/` for new builds, `support/` for the Go Support Plan. The folder is the only source of truth for which offering a document describes: `parseServicesDocument` rejects an unknown folder rather than guessing, because the two offerings are priced on different scales and A$100 deliberately means different things in each. A mistyped path fails the index run instead of silently merging build pricing into support pricing.

Chat gains a `services` tool that answers pricing and delivery questions from that corpus. It is Jev-routed like every other tool, with routing cases pinning when it should be selected.

## Project deep dives

Ten new documents under `src/data/projects/<project>/` cover the three projects that get asked about in depth — G-NAF Address Autocomplete, SmartPlay HK OSS, and Wat Wat New Zealand — one document per topic. They explain how a mechanism actually works rather than restating a repository summary, so chat can describe a pipeline, an algorithm, or a measured result.

The containing folder is authoritative for two things: which project a document belongs to, and whether that project is public. `parseProjectDocument` rejects a `**Visibility:**` line that disagrees with the folder rather than trusting the prose, because a wrong folder attributes a chunk to the wrong build — or invites the responder to imply a private repository is viewable.

Wat Wat New Zealand is private. Its chunks are retrievable and carry a `private` citation badge; the model may describe what such a project does, its technology, and its structure, but the policy forbids claiming a visitor can view the source.

## Topics and tags

Projects now carry `topics` and `tags` relationships alongside `technologies`. The new `Tags` collection ships with migration `20261001_101754_add_project_tags_topics`, registered in `src/migrations/index.ts` with its `.json` snapshot — the next generated migration is diffed against that snapshot, so it must land intact.

`projects/` is seeded by a single runner. `seed:content` discovers seeds per collection directory and runs them sequentially; `seed:projects`, `seed:posts`, and `seed:change-logs` narrow the run. The three per-project npm scripts are gone. Empty directories contribute nothing and are not an error, so `posts/` and `change-logs/` are wired but not yet populated.

## Rich content

A ` ```mermaid ` fence now renders as an actual diagram instead of a code listing. The fence becomes a Lexical `Code` block tagged `language: 'mermaid'`, which is exactly what the rich-text converter keys on. Each diagram carries a stable block id so React keeps the same mermaid instance across renders rather than remounting, and its accessible name is taken from the nearest preceding heading.

## Without JavaScript

The site no longer depends on hydration arriving. An inline head script marks `js-enabled` immediately and `js-hydrated` after an 8-second fail-open timer, and a fixed no-JS notice is shown only when hydration provably did not happen. The notice is plain text so script-blocking extensions cannot remove it.

`inspectBrowserCapabilities` reports missing required APIs, so the chat page, the contact form, and the health poll each declare what they need. A browser without `fetch` or `AbortController` gets a capability boundary rather than a broken page, and the health provider reports `offline` instead of throwing.

## Other changes

- **Route progress bar** — transitions are modelled in a pure, router-free module so the timing is testable without a browser.
- **Melbourne temperature** — moved from a client effect to the `_site` loader, reading the Bureau of Meteorology series first and falling back to an Open-Meteo forecast, with a one-hour cache. That is what removed it as a boot-gate case: it is correct during SSR rather than appearing late, and the browser no longer makes a weather request per visitor.
- **Contact report PDF**, and the customer receipt is now separated from the internal notification — including the quotation and support-plan subjects that previously fell through to a generic "New message".
- **Contact refinement is a convenience, never a gate.** A failed or malformed model reply falls back to the visitor's own validated words instead of dead-ending the workflow with an "unavailable" toast.
- **Long articles are readable again.** Payload's preflight zeroes every element margin, so paragraphs stacked flush against each other with no gap at all. `.rich-text` now spaces them in `em`, matching what the chat pipeline already did.
- **`scripts/` is grouped by concern** — `knowledge/`, `dev/`, `database/`, `assets/`, `seeding/` — behind one depth-independent repo-root helper.
- **Payload admin styling** no longer loses to the site stylesheet, via an explicit cascade-layer order.

## Verification

- `bun test` — **979 pass, 3 skip, 0 fail** across 146 files (6410 assertions)
- `bunx tsc --noEmit` — **0 errors**
- `npx -y react-doctor@latest` — **100/100, no issues found**, at the project root and at scan roots `src`, `src/components`, `src/routes`, and `tests`
- `docker build -t lastos-verify:local .` — **exit 0** through the whole `bun run build` chain including `generate:types`; the image boots, the container reports `healthy`, and `GET /api/site/health` returns `{"status":"ok"}`
- Indexers run live: services 23 documents / 57 chunks, interview 34 / 54, project docs 10 / 32, GitHub reindex 133 reports / 763 chunks
- `seed:projects` — 3/3, and a rerun creates 0 rows (every seed is a slug-keyed upsert)
- Paragraph spacing measured in headless Chromium at 18px between adjacent paragraphs, 18px above and below lists, last block flush

## Known issues

- **The `carousel.tsx` `reInit` listener leak is suppressed, not fixed.** The effect subscribes `api.on('reInit', onSelect)` and its cleanup only detaches `select`, so re-inits accumulate listeners. No app code imports `<Carousel>`, so it is exempted in `doctor.config.ts` rather than patched. If a page adopts it, `api?.off('reInit', onSelect)` must be added to the cleanup first. This is a real defect, not a false positive.
- **48 of the 61 shadcn wrappers in `src/components/ui/` are imported by zero app code.** They are excluded from the react-doctor scan as generated-style output. Deleting them is a separate decision and was not taken here.
- **`react-doctor` was reporting 100/100 while a scoped scan found 35 findings.** The scan root decides whether a finding reads `src/components/…`, `components/…`, or `site/…`, and every suppression was written in one form. `doctor.config.ts` now lists all three. Worth knowing before trusting a clean react-doctor result.
- **`vercel-client-ip.ts` still imports `node:net`.** Bun 1.4 has no `isIP` equivalent, and a hand-rolled IPv6 validator in the rate-limiting path would be worse than the stdlib. It also has no direct test coverage.
- **The 3 skips are not coverage.** They are the two pgvector integration blocks, which stay skipped unless `KNOWLEDGE_TEST_DATABASE_URL` is exported. That variable is still absent from `.env.example`.
- **Cloudflare Turnstile does not issue a token in headless Chromium.** The widget renders but no iframe appears and `POST /api/site/chat` returns 403. The chat stream, the contact workflow, and a server-rejected contact submit are all exercisable in a browser; a successful delivery-to-send round trip is not, and is covered by handler tests instead.
- **`posts/` and `change-logs/` seed directories are empty.** The runner is wired for both; nothing populates them yet.
- **`docs/knowledge-rag.md` is referenced but does not exist.** Two dated plans name it as a deliverable and it was never committed. The RAG bring-up and the closed source-type list currently live only in `AGENTS.md` and `src/server/knowledge/AGENTS.md`.

## Docs

- [`AGENTS.md`](https://github.com/lst97-oss/last-lst97-dev/blob/dev/AGENTS.md) — repository conventions, verification traps, and the closed RAG source-type list
- [`src/server/knowledge/AGENTS.md`](https://github.com/lst97-oss/last-lst97-dev/blob/dev/src/server/knowledge/AGENTS.md) — the three-file rule for registering a source type, and the folder-as-truth rules for both corpora
- [`docs/superpowers/plans/README.md`](https://github.com/lst97-oss/last-lst97-dev/blob/dev/docs/superpowers/plans/README.md) — why the unticked boxes in that directory are not a completion signal

## Licence

MIT — Copyright (c) 2026 Sio Tou Lai.