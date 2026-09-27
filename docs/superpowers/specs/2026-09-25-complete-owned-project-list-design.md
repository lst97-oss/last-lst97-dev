# Owned Project Catalogue for Jev

Date: 2026-09-25
Status: Approved by user on 2026-09-25

## Goal

Give Jev a compact, reliable way to browse Nelson's full owned-project inventory without returning all 111 repositories at once. The tool should support queries across repository metadata and let Jev use RAG separately for deeper report details. Do not ask the user to choose a project category before looking up an inventory request.

The catalogue includes Nelson's owned public and private repositories. Third-party contributions remain separate. Current inventory is 89 public and 22 private repositories.

## User behavior

- Jev calls a dedicated `list_owned_projects` tool for inventory, browse, filter, and “show more” requests.
- Return at most 10 concise project records per call with a short summary, visibility, languages, software kind, topics, dates, stars, forks, and recorded coding time when available.
- For an unfiltered first batch, highlight the most-starred matching project first, then favor recently updated projects. An explicit sort request controls ordering.
- If the user asks for more, apply the current filter set and exclude project IDs already shown in signed conversation state. Never duplicate a previously returned project during continuation.
- Jev can call `search_knowledge` in a later routing step when the user also asks for detail about listed projects. The catalogue is a compact index; RAG reports remain the source for deeper descriptions and citations.
- Use `site_content` only for current published-showcase membership and links. It does not replace the owned-project inventory.

## Catalogue filters

`list_owned_projects` accepts optional filters for free-text query, programming languages, software kinds, topics, public/private visibility, created and updated date ranges, star ranges, fork ranges, and WakaTime time-spent ranges. It also supports sort field, sort direction, and a limit from 1 to 10.

Filter categories combine with AND. Multiple values within one category combine with OR. Date bounds are inclusive calendar days. WakaTime time defaults to the complete imported history unless a date range is supplied; missing coding time remains unknown. Time joins use a normalized exact repository basename, including an optional owner prefix, without fuzzy matching.

Software kind is multi-label and uses controlled values: `web_app`, `mobile_app`, `desktop_app`, `api_backend`, `cli_tool`, `library_package`, `automation_devtool`, `data_ml`, `game`, `infrastructure_devops`, `plugin_extension`, and `other`. Leave uncertain classification empty. A kind filter matches only explicitly classified projects. Topic matching combines GitHub topics and curated topics.

## Data and storage

- Store one structured row per owned public or private repository in `knowledge_projects`, in the dedicated knowledge database.
- Keep report chunks and vector search in `knowledge_chunks`. Direct catalogue listing must not embed, search, rerank, or call Jev relevance for the catalogue query.
- Update owned catalogue metadata in the same transaction as report chunks during normal indexing. A metadata-only GitHub API refresh can update the catalogue without cloning or re-embedding reports.
- Catalogue fields include canonical source identity, visibility, short summary, created/updated dates, stars, forks, primary language, language list, software kinds, GitHub topics, and curated topics. WakaTime seconds are joined from `wakatime_daily_projects` at query time.
- Contributions and other knowledge-source types never enter this table.
- Report Markdown renders creation/update dates, languages, GitHub topics, software kinds, and curated topics so a full reindex can rebuild the catalogue.

## Signed conversation state

Keep only trusted server-signed state: up to 200 unique owned project source IDs already shown, whether catalogue browsing has started, and the active project filters. Continue accepting old signed context versions. The model does not determine which IDs are excluded; the server adds them to the validated catalogue query.

## Failure behavior and privacy

- Query only verified rows already in the dedicated knowledge database. If the catalogue is unavailable or empty, report that outcome without fabricating projects.
- Include only owned source types `github` and `github-private`; never mix in contributions.
- Preserve accurate public/private labels and citation URLs. Private records may be described from their sanitized summaries, but do not imply their source is publicly accessible.
- Use bounded validated input and parameterized SQL. Do not return raw database rows or secrets.

## Acceptance criteria

- Jev has a first-class catalogue tool with validated filters and a maximum batch size of 10.
- Broad inventory requests call the tool without a category clarification.
- A request for project list plus deeper detail runs the catalogue first, then asks Jev for a fresh RAG routing decision.
- Continuations preserve filters and exclude all previously surfaced IDs.
- The first default batch highlights the star leader and favors recency; explicit sorts are honored.
- Language, kind, topic, visibility, date, star, fork, and WakaTime filters execute against database rows.
- All 111 owned repositories are represented; public/private counts and contribution exclusion are correct.
- README and RAG docs explain the table, filters, refresh, and reindex workflows.
