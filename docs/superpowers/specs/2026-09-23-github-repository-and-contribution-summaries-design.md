# GitHub Repository and Contribution Summaries

## Goal

Replace metadata/README-only GitHub exports with evidence-backed summaries built from shallow repository clones, and add summaries of Nelson's contributions to third-party repositories. Publishable Markdown must not contain credentials or sensitive configuration, including summaries generated from private repositories.

## User requirements

- Inspect repository contents, not only GitHub metadata or README text.
- For every owned repository, summarize project purpose, the problem it addresses, and its features; report tracked-file counts, evidence-supported design patterns, frameworks, and technology stack.
- Discover third-party repositories Nelson contributed to and describe both each repository and his actual contribution there.
- Keep outputs in `src/data/github/`, separated by repository visibility. Private repository summaries become Git-trackable by removing the private-folder ignore rule, but the task must not stage or push files.
- Retain the owner context already supplied: Nelson / LST97, full-stack developer building useful open-source tools, and the supplied GitHub and LinkedIn profile links. Preserve public WakaTime profile context where its endpoint returns usable data.
- Keep private source code local; do not send it to a hosted LLM or other third party for summarization.

## Architecture

Extend the existing `knowledge:github:sync` command with three distinct stages:

1. **Inventory and contribution discovery.** Use authenticated `gh` calls to enumerate repositories owned by `lst97` and GitHub contribution repositories across the user's contribution years. Union commit, pull-request, issue, and pull-request-review repositories, then classify repositories by owner and visibility. Only third-party repositories with evidence of a contribution receive contribution reports. A capped or permission-limited response must be recorded as incomplete rather than represented as exhaustive.
2. **Temporary local inspection.** Clone repositories into an isolated temporary directory using shallow, blob-filtered clones. Read an allowlist of project documentation, manifests/lockfiles, directory trees, source and test paths, and contribution metadata. Do not emit raw source files or arbitrary README passages into the generated summary. Compute tracked file totals and useful file-kind counts from Git's tracked tree. Derive stack and pattern claims from manifests and concrete path/content evidence; distinguish documented facts from inference, and state when the repository does not provide enough evidence.
3. **Safe Markdown and indexing.** Render deterministic Markdown from the extracted facts. Run content/path-based secret and sensitive-data checks before writing or indexing. Skip/replace unsafe evidence, and fail the affected report closed when sensitive material cannot be confidently removed. Write owned repositories to `src/data/github/public/` or `src/data/github/private/`; write third-party reports to corresponding public/private contribution folders. Remove the private-folder `.gitignore` entry only as part of this behavior. Private RAG documents must remain `is_public=false`; public retrieval continues to filter strictly on `is_public=true`.

Generated repository reports should contain these sections where supported:

- Project purpose and problem addressed
- Main features/capabilities
- Repository metadata and visibility
- Tracked-file totals and grouped counts (source, tests, docs, configuration, assets/other)
- Frameworks, languages, and technology stack with manifest/path evidence
- Design/architecture patterns, with evidence paths and an `inferred` label when not explicit
- Contribution summary for third-party repositories: contribution kinds and counts, authored PRs/issues and their titles/status/URLs when available, plus commit-contribution counts and representative evidence
- Evidence/limits, including omitted or inaccessible content and API truncation

## Security and privacy

- Keep all cloning and parsing local. Do not transmit private repository source, READMEs, identifiers, or contribution records to OpenRouter, SiliconFlow, or any hosted model.
- Exclude `.env*`, credentials, key/certificate files, secret stores, dumps, logs, generated dependency trees, and other sensitive paths from inspection. Do not copy file contents wholesale into Markdown.
- Apply secret-pattern and sensitive-value checks to every generated Markdown document, including the existing public/private outputs. Tests must cover representative GitHub, cloud, API, and private-key patterns without printing matched values.
- Keep repo cloning temporary and ensure cleanup on success, failure, and termination paths.
- Never stage, commit, push, or publish the private summaries automatically. Removing the ignore rule only makes them trackable in this workspace; a later human commit/push could disclose private repository names, purpose, and architecture.
- Do not log private repository names, contribution text, matched secret values, or raw GitHub API errors. Report aggregate counts and sanitized failure categories only.
- Maintain the public RAG retrieval filter and test that private source chunks never appear in public search.

## Failure behavior

- If a clone or content read fails for one repository, preserve any prior good report/index entry for that repository and mark the run incomplete; do not silently overwrite it with an empty summary.
- If GitHub contribution scopes or API limits prevent complete discovery, state this in a safe run summary and avoid deleting previously indexed contribution records based on an incomplete inventory.
- If a report contains a high-confidence secret or sensitive value that cannot be safely redacted, do not write or index that report; fail that repository's refresh and retain its last-known-good content.
- Temporary clone cleanup must run even when one repository fails.

## Acceptance criteria

1. All currently owned public and private repositories are inspected from cloned repository content, and each resulting report includes the requested facts with evidence and uncertainty labels.
2. Third-party contribution repositories across all available years are discovered and receive summaries of the project and Nelson's contribution evidence.
3. Private Markdown is no longer excluded by `.gitignore`, but remains uncommitted/unpushed and passes the same sensitive-content gate as public Markdown.
4. No high-confidence secret patterns or excluded sensitive paths appear in generated reports; tests prove the filter without exposing test secrets in output.
5. Private indexed chunks remain non-public, and public retrieval cannot return private repository or contribution content.
6. Existing owner profile/WakaTime context remains available in Markdown/RAG without fabricating missing activity details.
7. Unit tests cover GitHub payload normalization, contribution aggregation, file inventory/stack/pattern extraction, uncertainty labeling, report rendering, sensitive-content rejection/redaction, clone cleanup, and preservation of last-known-good records on partial failure.
8. Full `bun test`, `bun run typecheck`, and `git diff --check` pass. No file is staged, committed, or pushed as part of implementation.

## Constraints and open implementation detail

- GitHub CLI is authenticated locally; the installed scopes and API visibility determine which private contribution records are available. Do not expand auth scopes automatically. Any required scope escalation must be requested from the user.
- Use `gh repo clone` with Git clone flags forwarded after `--`; official CLI documentation supports forwarding clone flags and specifying a destination directory: https://cli.github.com/manual/gh_repo_clone.
- GitHub GraphQL contribution collections provide repository-grouped commit, pull-request, issue, and review data; private/internal contributions require the documented `read:user` scope: https://docs.github.com/en/graphql/reference/users.
- The current working checkout has no configured Git origin, so its remote visibility cannot be verified. This does not block local generation, but reinforces that private summaries must not be staged or pushed automatically.
