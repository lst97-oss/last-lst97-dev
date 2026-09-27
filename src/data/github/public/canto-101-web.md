# canto-101-web

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/canto-101-web.
- Purpose: Source implementation indicates these responsibilities: validates structured input or configuration; persists or queries application data; renders a react user interface; filters multi select field; filters multi select field props.
- Observed capabilities: Validates structured input or configuration; Persists or queries application data; Renders a React user interface
- Technology: TypeScript, React, TanStack Router, Vite, Tailwind CSS

## Repository metadata
- **Repository:** lst97/canto-101-web
- **Visibility:** public
- **URL:** https://github.com/lst97/canto-101-web
- **Default branch:** dev
- **Last updated:** 2026-06-13T18:12:55Z
- **Primary language:** TypeScript
- **License:** Apache License 2.0
- **Homepage:** https://www.canto101.com
- **Stars / forks:** 1 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- TypeScript (518,450 bytes)
- JavaScript (21,540 bytes)
- Shell (11,774 bytes)
- CSS (5,943 bytes)
- HTML (357 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: validates structured input or configuration; persists or queries application data; renders a react user interface; filters multi select field; filters multi select field props.
Evidence: `src/components/cantoLyr/lexicon/LexiconSearchBase.tsx`, `src/components/cantoLyr/lyrics-search/LyricSearchBase.tsx`, `src/components/cantoLyr/lyrics/LyricSearchBase.tsx`, `src/hooks/useAiLexiconSearch.ts`, `src/lib/api.ts`, `src/components/LanguageSwitcher.tsx`, `src/components/translations/TranslationEditorMain.tsx`, `src/components/ui/select.tsx`, `src/components/ui/shadcn-io/ripple/index.tsx`, `src/App.tsx`, `src/components/cantoLyr/CantoLyrWorkflowCard.tsx`, `src/components/cantoLyr/lexicon/LexiconAiSearch.tsx`, `src/components/cantoLyr/lexicon/LexiconPronunciationSearch.tsx`, `src/components/cantoLyr/lexicon/LexiconRhymeSearch.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Validates structured input or configuration — Evidence: `src/components/cantoLyr/lexicon/LexiconSearchBase.tsx`, `src/components/cantoLyr/lyrics-search/LyricSearchBase.tsx`, `src/components/cantoLyr/lyrics/LyricSearchBase.tsx`, `src/hooks/useAiLexiconSearch.ts`, `src/lib/api.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/cantoLyr/lyrics-search/LyricSearchBase.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/translations/TranslationEditorMain.tsx`, `src/components/ui/select.tsx`, `src/components/ui/shadcn-io/ripple/index.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/App.tsx`, `src/components/cantoLyr/CantoLyrWorkflowCard.tsx`, `src/components/cantoLyr/lexicon/LexiconAiSearch.tsx`, `src/components/cantoLyr/lexicon/LexiconPronunciationSearch.tsx`, `src/components/cantoLyr/lexicon/LexiconRhymeSearch.tsx` (**inferred**)
- Provides the App UI component — Evidence: `src/App.tsx` (**inferred**)
- Provides the Canto Lyr Workflow Card UI component — Evidence: `src/components/cantoLyr/CantoLyrWorkflowCard.tsx` (**inferred**)
- Provides the Lexicon Ai Search UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconAiSearch.tsx` (**inferred**)
- Provides the Lexicon Pronunciation Search UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconPronunciationSearch.tsx` (**inferred**)
- Provides the Lexicon Rhyme Search UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconRhymeSearch.tsx` (**inferred**)
- Provides the Lexicon Search Base UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconSearchBase.tsx` (**inferred**)
- Provides the Lyric Generation Form UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricGenerationForm.tsx` (**inferred**)
- Provides the Lyric Generation Results UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricGenerationResults.tsx` (**inferred**)
- Provides the Lyric Line Panel UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricLinePanel.tsx` (**inferred**)
- Provides the Lyric Lines Accordion UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricLinesAccordion.tsx` (**inferred**)
- Provides the Top Paragraph List UI component — Evidence: `src/components/cantoLyr/lyric-generation/TopParagraphList.tsx` (**inferred**)
- Provides the Ai Lyric Pronunciation Search UI component — Evidence: `src/components/cantoLyr/lyrics-search/AiLyricPronunciationSearch.tsx` (**inferred**)
- Provides the Ai Lyric Rhyme Search UI component — Evidence: `src/components/cantoLyr/lyrics-search/AiLyricRhymeSearch.tsx` (**inferred**)
- Filters multi select field — Evidence: `src/components/cantoLyr/lyrics-search/base/FilterMultiSelectField.tsx` (**inferred**)
- Filters multi select field props — Evidence: `src/components/cantoLyr/lyrics-search/base/FilterMultiSelectField.tsx` (**inferred**)
- Provides the Lyric Search Provider UI component — Evidence: `src/components/cantoLyr/lyrics-search/base/LyricSearchContext.tsx` (**inferred**)
- Defines the Lyric Search Kind type or service — Evidence: `src/components/cantoLyr/lyrics-search/base/lyricSearchContextCore.ts` (**inferred**)
- Defines the Lyric Search Context Value type or service — Evidence: `src/components/cantoLyr/lyrics-search/base/lyricSearchContextCore.ts` (**inferred**)
- Provides the Results Summary UI component — Evidence: `src/components/cantoLyr/lyrics-search/base/ResultsSummary.tsx` (**inferred**)
- Provides the Results Summary Props UI component — Evidence: `src/components/cantoLyr/lyrics-search/base/ResultsSummary.tsx` (**inferred**)
- Builds non ignorable index map — Evidence: `src/components/cantoLyr/lyrics-search/base/text-helpers.ts` (**inferred**)

## Tracked files
- **176 tracked files** in total
- Source: 136; tests: 3; documentation: 11; configuration: 14; assets/other: 12

## Repository structure
- Inspected 98 source files from the cloned repository (bounded for safety).
- `.github/` (3 tracked files)
- `.sonarlint/` (1 tracked files)
- `.specify/` (12 tracked files)
- `plugins/` (1 tracked files)
- `src/` (145 tracked files)
- `vite.config.ts`
- `src/App.tsx`
- `src/components/cantoLyr/CantoLyrWorkflowCard.tsx`
- `src/components/cantoLyr/lexicon/index.ts`
- `src/components/cantoLyr/lexicon/LexiconAiSearch.tsx`
- `src/components/cantoLyr/lexicon/LexiconPronunciationSearch.tsx`
- `src/components/cantoLyr/lexicon/LexiconRhymeSearch.tsx`
- `src/components/cantoLyr/lexicon/LexiconSearchBase.tsx`
- `src/components/cantoLyr/lyric-generation/index.ts`
- `src/components/cantoLyr/lyric-generation/LyricGenerationForm.tsx`
- `src/components/cantoLyr/lyric-generation/LyricGenerationResults.tsx`
- `src/components/cantoLyr/lyric-generation/LyricLinePanel.tsx`
- `src/components/cantoLyr/lyric-generation/LyricLinesAccordion.tsx`
- `src/components/cantoLyr/lyric-generation/TopParagraphList.tsx`
- `src/components/cantoLyr/lyrics-search/AiLyricPronunciationSearch.tsx`
- `src/components/cantoLyr/lyrics-search/AiLyricRhymeSearch.tsx`
- `src/components/cantoLyr/lyrics-search/base/FilterMultiSelectField.tsx`
- `src/components/cantoLyr/lyrics-search/base/LyricSearchContext.tsx`
- `src/components/cantoLyr/lyrics-search/base/lyricSearchContextCore.ts`
- `src/components/cantoLyr/lyrics-search/base/ResultsSummary.tsx`

## Implementation and test evidence
- Validates structured input or configuration — Evidence: `src/components/cantoLyr/lexicon/LexiconSearchBase.tsx`, `src/components/cantoLyr/lyrics-search/LyricSearchBase.tsx`, `src/components/cantoLyr/lyrics/LyricSearchBase.tsx`, `src/hooks/useAiLexiconSearch.ts`, `src/lib/api.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/cantoLyr/lyrics-search/LyricSearchBase.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/translations/TranslationEditorMain.tsx`, `src/components/ui/select.tsx`, `src/components/ui/shadcn-io/ripple/index.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/App.tsx`, `src/components/cantoLyr/CantoLyrWorkflowCard.tsx`, `src/components/cantoLyr/lexicon/LexiconAiSearch.tsx`, `src/components/cantoLyr/lexicon/LexiconPronunciationSearch.tsx`, `src/components/cantoLyr/lexicon/LexiconRhymeSearch.tsx` (**inferred**)
- Provides the App UI component — Evidence: `src/App.tsx` (**inferred**)
- Provides the Canto Lyr Workflow Card UI component — Evidence: `src/components/cantoLyr/CantoLyrWorkflowCard.tsx` (**inferred**)
- Provides the Lexicon Ai Search UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconAiSearch.tsx` (**inferred**)
- Provides the Lexicon Pronunciation Search UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconPronunciationSearch.tsx` (**inferred**)
- Provides the Lexicon Rhyme Search UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconRhymeSearch.tsx` (**inferred**)
- Provides the Lexicon Search Base UI component — Evidence: `src/components/cantoLyr/lexicon/LexiconSearchBase.tsx` (**inferred**)
- Provides the Lyric Generation Form UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricGenerationForm.tsx` (**inferred**)
- Provides the Lyric Generation Results UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricGenerationResults.tsx` (**inferred**)
- Provides the Lyric Line Panel UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricLinePanel.tsx` (**inferred**)
- Provides the Lyric Lines Accordion UI component — Evidence: `src/components/cantoLyr/lyric-generation/LyricLinesAccordion.tsx` (**inferred**)
- Provides the Top Paragraph List UI component — Evidence: `src/components/cantoLyr/lyric-generation/TopParagraphList.tsx` (**inferred**)
- Provides the Ai Lyric Pronunciation Search UI component — Evidence: `src/components/cantoLyr/lyrics-search/AiLyricPronunciationSearch.tsx` (**inferred**)
- Provides the Ai Lyric Rhyme Search UI component — Evidence: `src/components/cantoLyr/lyrics-search/AiLyricRhymeSearch.tsx` (**inferred**)
- Filters multi select field — Evidence: `src/components/cantoLyr/lyrics-search/base/FilterMultiSelectField.tsx` (**inferred**)
- Filters multi select field props — Evidence: `src/components/cantoLyr/lyrics-search/base/FilterMultiSelectField.tsx` (**inferred**)
- Provides the Lyric Search Provider UI component — Evidence: `src/components/cantoLyr/lyrics-search/base/LyricSearchContext.tsx` (**inferred**)
- Defines the Lyric Search Kind type or service — Evidence: `src/components/cantoLyr/lyrics-search/base/lyricSearchContextCore.ts` (**inferred**)
- Defines the Lyric Search Context Value type or service — Evidence: `src/components/cantoLyr/lyrics-search/base/lyricSearchContextCore.ts` (**inferred**)
- Provides the Results Summary UI component — Evidence: `src/components/cantoLyr/lyrics-search/base/ResultsSummary.tsx` (**inferred**)
- Provides the Results Summary Props UI component — Evidence: `src/components/cantoLyr/lyrics-search/base/ResultsSummary.tsx` (**inferred**)
- Builds non ignorable index map — Evidence: `src/components/cantoLyr/lyrics-search/base/text-helpers.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- TanStack Router — Evidence: `package.json`
- Vite — Evidence: `package.json`
- Tailwind CSS — Evidence: `package.json`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `src/components/test/TestNavigationLoader.tsx`, `src/pages/test/TestApiError.tsx`, `src/pages/test/TestNavigationLoaderPreview.tsx`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
