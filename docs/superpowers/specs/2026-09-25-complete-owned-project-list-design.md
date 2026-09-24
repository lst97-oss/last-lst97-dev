# Guided Project Discovery for Jev

Date: 2026-09-25
Status: Awaiting user review

## Goal

Help users discover Nelson's work without sending all 111 owned repository summaries to Jev or dumping all 111 into a reply. The first broad project-list request should ask what kind of project the user wants. If the user insists on a complete list, Jev should return a short, useful selection instead: the most-starred project first, highlighted, followed by recent projects. Third-party contributions remain separate.

The current local corpus represents 89 public and 22 private owned repositories. The selection should include visibility labels and only summaries supported by the indexed repository records.

## Current failure

`site_content({op: "list_projects"})` reads only published Payload showcase entries. The knowledge search uses vector similarity, reranking, and a three-source result limit, so it cannot reliably enumerate or rank the full set of owned repositories. Repository records already live in the knowledge database under owned source types `github` and `github-private`.

## Interaction design

1. For a broad, unfiltered question about Nelson's project list, Jev asks one short clarification about the kind of project the user wants to hear about. It does not query or return the entire inventory on this first turn.
2. A follow-up that names a category or kind uses ordinary semantic retrieval to answer with matching verified project records.
3. If the user repeats or insists on seeing the full list, Jev queries the owned repository inventory and returns a batch of at most 10 entries. The first batch puts the highest-star-count repository first with a clear “Most starred” label, then the nine most recently updated other repositories. Later requests return the next unshown recent entries, up to 10 at a time. Never repeat a repository already provided in this project-list sequence. When there are no more unshown entries, say so without repeating earlier results.
4. Ask about or list third-party contributions separately; do not mix them into the owned project results.

## Data and retrieval design

- Reuse the existing Jev-facing `search_knowledge({query})` tool; no new model-facing tool name or argument schema is needed.
- Add an internal direct database listing path for the repeated full-list case. Query distinct owned records only from `knowledge_chunks` source types `github` and `github-private`; exclude `github-contrib` and `github-contrib-private`.
- Use the first indexed chunk per repository, which contains the retrieval summary and metadata. Parse `Stars / forks` and `Last updated` only from their explicit indexed metadata labels. The current source reports carry these values in chunk text; `source_updated_at` is not populated by the report renderer.
- Select one most-starred repository and up to nine other repositories by descending verified last-updated date. Unknown metrics sort after known values. Use a stable name order to break ties. Do not infer a missing star count, update date, or project purpose.
- Keep normal semantic retrieval for named-project, category, and factual questions. The broad first-turn clarification and repeated-full-list behavior must be selected from the latest message plus minimal recent signed context, not inferred from old unrelated transcript content.
- Store `clarificationAsked` and owned repository IDs already surfaced during project discovery/list replies in the signed conversation context. Validate and bound these fields; do not rely on the model to remember its previous output. Filter these IDs from later shortlist batches. An explicit request for details about a named project may still discuss that project again.
- Keep the existing 1,200-token answer limit for the short clarification and 10-item batch. Do not pass the 111-row result into Jev; the server selects and formats only the next small result set.
- Cite each selected record using its actual repository source and visibility. Public entries may link to their canonical GitHub URL. Private entries must be marked private and must not be described as publicly viewable.
- Preserve `site_content` for questions specifically about currently published showcase projects.

## Safety and fallback behavior

- Only return records actually found in the database; if the inventory is empty or unavailable, state that Jev could not retrieve it rather than substituting a partial history answer.
- If no stars are present, omit the “most starred” distinction and select by recency. If dates are missing, rank those entries after dated records.
- Never expose third-party contribution records as projects owned by Nelson.
- Never invent a summary where source evidence is absent; use a brief unknown-purpose label or omit the summary.
- Keep private-project visibility labels accurate and avoid claims that a visitor can access private source code.

## Verification criteria

- A first broad project-list question asks one clarification and does not return an inventory.
- A follow-up specifying a project kind uses semantic knowledge retrieval.
- Repeated insistence returns at most 10 unshown owned projects per response, with the highest verified star count first on the first batch and recent projects thereafter.
- Several project-discovery/list follow-ups never repeat an already surfaced repository ID; after all candidates are shown, Jev says there are no additional unshown projects.
- Returned entries are sourced from owned public/private rows only, with correct visibility and citations; contributions are excluded.
- Missing dates, stars, summaries, or database results do not lead to fabricated claims.
- Existing named-project retrieval and published showcase behavior remain unchanged.
