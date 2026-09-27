# CantoLyr

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/CantoLyr.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; persists or queries application data; uses a distributed or explicit cache; implements ai or language-model features.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Persists or queries application data
- Technology: PostgreSQL, TypeScript, Python

## Repository metadata
- **Repository:** lst97/CantoLyr
- **Visibility:** public
- **URL:** https://github.com/lst97/CantoLyr
- **Default branch:** dev
- **Last updated:** 2025-09-21T14:36:23Z
- **Primary language:** TypeScript
- **License:** Apache License 2.0
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- TypeScript (1,282,023 bytes)
- Python (66,615 bytes)
- Shell (17,958 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; persists or queries application data; uses a distributed or explicit cache; implements ai or language-model features.
Evidence: `src/infrastructure/adapters/vector/ChromaSearchService.ts`, `src/shared/utils/jsonlParser.ts`, `src/application/ports/LlmGroupedSelector.ts`, `src/application/use-cases/ComposeLineUseCase.ts`, `src/infrastructure/adapters/database/lexicon/LexiconReadRepository.ts`, `src/infrastructure/adapters/database/lexicon/LexiconWriteRepository.ts`, `src/infrastructure/adapters/llm/prompts/mvpGroupedSelectionPrompt.ts`, `src/application/use-cases/SearchUseCase.ts`, `src/infrastructure/adapters/cache/InMemoryCache.ts`, `src/application/ports/index.ts`, `src/application/ports/LlmReranker.ts`, `src/application/services/mvpPrefilter.ts`, `src/infrastructure/adapters/http/routes/searchRoutes.ts`, `src/main.ts`, `src/application/ports/Cache.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/infrastructure/adapters/vector/ChromaSearchService.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/shared/utils/jsonlParser.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/application/ports/LlmGroupedSelector.ts`, `src/application/use-cases/ComposeLineUseCase.ts`, `src/infrastructure/adapters/database/lexicon/LexiconReadRepository.ts`, `src/infrastructure/adapters/database/lexicon/LexiconWriteRepository.ts`, `src/infrastructure/adapters/llm/prompts/mvpGroupedSelectionPrompt.ts` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `src/application/use-cases/ComposeLineUseCase.ts`, `src/application/use-cases/SearchUseCase.ts`, `src/infrastructure/adapters/cache/InMemoryCache.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `src/application/ports/index.ts`, `src/application/ports/LlmGroupedSelector.ts`, `src/application/ports/LlmReranker.ts`, `src/application/services/mvpPrefilter.ts`, `src/application/use-cases/ComposeLineUseCase.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/infrastructure/adapters/http/routes/searchRoutes.ts`, `src/main.ts` (**inferred**)
- Defines the Cache Stats type or service — Evidence: `src/application/ports/Cache.ts` (**inferred**)
- Defines the Cache Options type or service — Evidence: `src/application/ports/Cache.ts` (**inferred**)
- Defines the Cache type or service — Evidence: `src/application/ports/Cache.ts` (**inferred**)
- Defines the Grouped Selection Input type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Group Selection type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Grouped Selection Result type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Llm Config type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Llm Grouped Selector type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Reranks input — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Defines the Ranking Item type or service — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Reranks result — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Defines the Llm Reranker type or service — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Defines the Line Semantics type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator Input type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator Output type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator Config type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyric Line DTO type or service — Evidence: `src/application/ports/LyricsRepo.ts` (**inferred**)

## Tracked files
- **8205 tracked files** in total
- Source: 89; tests: 17; documentation: 22; configuration: 16; assets/other: 8061

## Repository structure
- Inspected 49 source files from the cloned repository (bounded for safety).
- `.github/` (3 tracked files)
- `chroma/` (5 tracked files)
- `crawler/` (37 tracked files)
- `data/` (8063 tracked files)
- `docs/` (3 tracked files)
- `memory/` (2 tracked files)
- `prisma/` (1 tracked files)
- `scripts/` (20 tracked files)
- `src/` (53 tracked files)
- `templates/` (4 tracked files)
- `tests/` (3 tracked files)
- `src/application/ports/Cache.ts`
- `src/application/ports/index.ts`
- `src/application/ports/LlmGroupedSelector.ts`
- `src/application/ports/LlmReranker.ts`
- `src/application/ports/LyricsAnnotator.ts`
- `src/application/ports/LyricsRepo.ts`
- `src/application/ports/ReadingRepo.ts`
- `src/application/ports/WriteRepo.ts`
- `src/application/services/mvpPrefilter.ts`
- `src/application/use-cases/ComposeLineUseCase.ts`
- `src/application/use-cases/index.ts`
- `src/application/use-cases/RecordFeedbackUseCase.ts`
- `src/application/use-cases/SearchUseCase.ts`
- `src/domain/entities/Entry.ts`
- `src/domain/entities/index.ts`
- `src/domain/entities/Reading.ts`
- `src/domain/services/index.ts`
- `src/domain/services/RankCombiner.ts`
- `src/domain/value-objects/index.ts`
- `src/domain/value-objects/ToneMap.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/infrastructure/adapters/vector/ChromaSearchService.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/shared/utils/jsonlParser.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/application/ports/LlmGroupedSelector.ts`, `src/application/use-cases/ComposeLineUseCase.ts`, `src/infrastructure/adapters/database/lexicon/LexiconReadRepository.ts`, `src/infrastructure/adapters/database/lexicon/LexiconWriteRepository.ts`, `src/infrastructure/adapters/llm/prompts/mvpGroupedSelectionPrompt.ts` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `src/application/use-cases/ComposeLineUseCase.ts`, `src/application/use-cases/SearchUseCase.ts`, `src/infrastructure/adapters/cache/InMemoryCache.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `src/application/ports/index.ts`, `src/application/ports/LlmGroupedSelector.ts`, `src/application/ports/LlmReranker.ts`, `src/application/services/mvpPrefilter.ts`, `src/application/use-cases/ComposeLineUseCase.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/infrastructure/adapters/http/routes/searchRoutes.ts`, `src/main.ts` (**inferred**)
- Defines the Cache Stats type or service — Evidence: `src/application/ports/Cache.ts` (**inferred**)
- Defines the Cache Options type or service — Evidence: `src/application/ports/Cache.ts` (**inferred**)
- Defines the Cache type or service — Evidence: `src/application/ports/Cache.ts` (**inferred**)
- Defines the Grouped Selection Input type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Group Selection type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Grouped Selection Result type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Llm Config type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Defines the Llm Grouped Selector type or service — Evidence: `src/application/ports/LlmGroupedSelector.ts` (**inferred**)
- Reranks input — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Defines the Ranking Item type or service — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Reranks result — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Defines the Llm Reranker type or service — Evidence: `src/application/ports/LlmReranker.ts` (**inferred**)
- Defines the Line Semantics type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator Input type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator Output type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator Config type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyrics Annotator type or service — Evidence: `src/application/ports/LyricsAnnotator.ts` (**inferred**)
- Defines the Lyric Line DTO type or service — Evidence: `src/application/ports/LyricsRepo.ts` (**inferred**)

## Frameworks and technology stack
- PostgreSQL — Evidence: `docker-compose.yml`, `docs/CONFIGURATION.md`
- TypeScript — Evidence: `data/sample/book_word_freq.ts`, `data/sample/index.ts`, `scripts/bootstrap-chroma.ts`, `scripts/convert-simplified-to-traditional.ts`, `scripts/db-reset-seed.ts`, `scripts/ingest-chroma.ts`, `scripts/normalize-charlist.ts`, `scripts/normalize-for-chroma.ts`
- Python — Evidence: `chroma/ingest_chroma.py`, `chroma/ingest_lexicon.py`, `chroma/ingest_lyrics.py`, `crawler/application/__init__.py`, `crawler/application/use_cases.py`, `crawler/domain/__init__.py`, `crawler/domain/entities.py`, `crawler/domain/ports.py`

## Design and architecture patterns
- domain-driven design (**inferred**) — Evidence: `crawler/domain/__init__.py`, `crawler/domain/entities.py`, `crawler/domain/ports.py`
- layered architecture (**inferred**) — Evidence: `crawler/domain/__init__.py`, `crawler/domain/entities.py`, `crawler/domain/ports.py`, `crawler/application/__init__.py`, `crawler/application/use_cases.py`, `src/application/ports/Cache.ts`, `crawler/infrastructure/__init__.py`, `crawler/infrastructure/adapters/__init__.py`, `crawler/infrastructure/adapters/feitsui_crawler.py`
- ports and adapters (**inferred**) — Evidence: `src/application/ports/Cache.ts`, `src/application/ports/LlmGroupedSelector.ts`, `src/application/ports/LlmReranker.ts`, `crawler/infrastructure/adapters/__init__.py`, `crawler/infrastructure/adapters/feitsui_crawler.py`, `crawler/infrastructure/adapters/genai_annotator.py`
- hexagonal architecture (**inferred**) — Evidence: `crawler/domain/__init__.py`, `crawler/domain/entities.py`, `crawler/domain/ports.py`, `crawler/application/__init__.py`, `crawler/application/use_cases.py`, `src/application/ports/Cache.ts`, `crawler/infrastructure/__init__.py`, `crawler/infrastructure/adapters/__init__.py`, `crawler/infrastructure/adapters/feitsui_crawler.py`, `src/application/ports/Cache.ts`, `src/application/ports/LlmGroupedSelector.ts`, `src/application/ports/LlmReranker.ts`, `crawler/infrastructure/adapters/__init__.py`, `crawler/infrastructure/adapters/feitsui_crawler.py`, `crawler/infrastructure/adapters/genai_annotator.py`
- test-driven development evidence (**inferred**) — Evidence: `crawler/tests/__init__.py`, `crawler/tests/fixtures/feitsui/article.html`, `crawler/tests/fixtures/feitsui/artist.html`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
