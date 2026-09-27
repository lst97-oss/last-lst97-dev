# cantolyrics-web

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/cantolyrics-web.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; persists or queries application data; renders a react user interface; validates and types runtime environment configuration.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Persists or queries application data
- Technology: TypeScript, React, TanStack Router, TanStack Start, Vite, PostgreSQL, Tailwind CSS
- Software kinds: web_app
- Curated topics: cantonese, lyrics

## Repository metadata
- **Repository:** lst97/cantolyrics-web
- **Visibility:** private
- **URL:** https://github.com/lst97/cantolyrics-web
- **Default branch:** main
- **Created:** 2026-04-25T14:33:59Z
- **Last updated:** 2026-04-26T14:48:04Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 1
- **Topics:** No GitHub topics are set.
- **Software kinds:** `web_app`
- **Curated topics:** `cantonese`, `lyrics`

### GitHub language breakdown
- TypeScript (374,157 bytes)
- Shell (64,917 bytes)
- PowerShell (24,133 bytes)
- CSS (6,040 bytes)
- Dockerfile (730 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; persists or queries application data; renders a react user interface; validates and types runtime environment configuration.
Evidence: `src/env.ts`, `src/components/admin/debug-credit-form.tsx`, `src/components/audio/midi-uploader.tsx`, `src/components/lyrics/generator-v1.tsx`, `src/components/lyrics/generator-v2.tsx`, `src/components/refine/refine-lyrics.tsx`, `src/components/lyrics/create-page.tsx`, `src/components/lyrics/music-style-select.tsx`, `src/components/rewrite/rewrite-inputs.tsx`, `src/components/ui/select.tsx`, `src/components/admin/logs-table.tsx`, `src/components/audio/analysis-result.tsx`, `src/components/auth/auth-guard.tsx`, `src/components/auth/reset-password-form.tsx`, `src/components/admin/feedback-panel.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/env.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/components/admin/debug-credit-form.tsx`, `src/components/audio/midi-uploader.tsx`, `src/components/lyrics/generator-v1.tsx`, `src/components/lyrics/generator-v2.tsx`, `src/components/refine/refine-lyrics.tsx` (**inferred**)
- Persists or queries application data — Evidence: `src/components/lyrics/create-page.tsx`, `src/components/lyrics/generator-v1.tsx`, `src/components/lyrics/music-style-select.tsx`, `src/components/rewrite/rewrite-inputs.tsx`, `src/components/ui/select.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/components/admin/logs-table.tsx`, `src/components/audio/analysis-result.tsx`, `src/components/audio/midi-uploader.tsx`, `src/components/auth/auth-guard.tsx`, `src/components/auth/reset-password-form.tsx` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Provides the Debug Credit Form UI component — Evidence: `src/components/admin/debug-credit-form.tsx` (**inferred**)
- Provides the Feedback Panel UI component — Evidence: `src/components/admin/feedback-panel.tsx` (**inferred**)
- Provides the Logs Table UI component — Evidence: `src/components/admin/logs-table.tsx` (**inferred**)
- Provides the Prompt Rules UI component — Evidence: `src/components/admin/prompt-rules.tsx` (**inferred**)
- Provides the Stats Breakdown UI component — Evidence: `src/components/admin/stats-breakdown.tsx` (**inferred**)
- Provides the Stats Grid UI component — Evidence: `src/components/admin/stats-grid.tsx` (**inferred**)
- Provides the Analysis Result UI component — Evidence: `src/components/audio/analysis-result.tsx` (**inferred**)
- Provides the Midi Uploader UI component — Evidence: `src/components/audio/midi-uploader.tsx` (**inferred**)
- Provides the Auth Guard UI component — Evidence: `src/components/auth/auth-guard.tsx` (**inferred**)
- Provides the Reset Password Form UI component — Evidence: `src/components/auth/reset-password-form.tsx` (**inferred**)
- Provides the Credit Confirm Modal UI component — Evidence: `src/components/credits/credit-confirm-modal.tsx` (**inferred**)
- Provides the Purchase Modal UI component — Evidence: `src/components/credits/purchase-modal.tsx` (**inferred**)
- Provides the Trial Popup UI component — Evidence: `src/components/credits/trial-popup.tsx` (**inferred**)
- Provides the Feedback Form Dialog UI component — Evidence: `src/components/feedback/feedback-form-dialog.tsx` (**inferred**)
- Provides the Feedback Modal UI component — Evidence: `src/components/feedback/feedback-modal.tsx` (**inferred**)
- Provides the Feedback Textarea UI component — Evidence: `src/components/feedback/feedback-textarea.tsx` (**inferred**)
- Provides the Lyrics Preview Card UI component — Evidence: `src/components/feedback/lyrics-preview-card.tsx` (**inferred**)
- Provides the Star Rating UI component — Evidence: `src/components/feedback/star-rating.tsx` (**inferred**)
- Provides the Song History Item UI component — Evidence: `src/components/history/song-history-item.tsx` (**inferred**)

## Tracked files
- **408 tracked files** in total
- Source: 124; tests: 9; documentation: 214; configuration: 37; assets/other: 24

## Repository structure
- Inspected 95 source files from the cloned repository (bounded for safety).
- `.agents/` (91 tracked files)
- `.claude/` (18 tracked files)
- `.github/` (37 tracked files)
- `.opencode/` (17 tracked files)
- `.serena/` (2 tracked files)
- `.specify/` (38 tracked files)
- `.vscode/` (1 tracked files)
- `messages/` (2 tracked files)
- `openspec/` (33 tracked files)
- `project.inlang/` (1 tracked files)
- `public/` (5 tracked files)
- `specs/` (8 tracked files)
- `src/` (137 tracked files)
- `supabase/` (2 tracked files)
- `vite.config.ts`
- `src/components/admin/debug-credit-form.test.tsx`
- `src/components/admin/debug-credit-form.tsx`
- `src/components/admin/feedback-panel.tsx`
- `src/components/admin/logs-table.tsx`
- `src/components/admin/prompt-rules.tsx`
- `src/components/admin/stats-breakdown.tsx`
- `src/components/admin/stats-grid.tsx`
- `src/components/audio/analysis-result.tsx`
- `src/components/audio/midi-uploader.tsx`
- `src/components/auth/auth-guard.tsx`
- `src/components/auth/reset-password-form.tsx`
- `src/components/credits/credit-confirm-modal.tsx`
- `src/components/credits/credit-plans.tsx`
- `src/components/credits/purchase-modal.tsx`
- `src/components/credits/trial-popup.tsx`
- `src/components/feedback/feedback-form-dialog.tsx`
- `src/components/feedback/feedback-modal.tsx`
- `src/components/feedback/feedback-textarea.tsx`
- `src/components/feedback/lyrics-preview-card.tsx`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/env.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/components/admin/debug-credit-form.tsx`, `src/components/audio/midi-uploader.tsx`, `src/components/lyrics/generator-v1.tsx`, `src/components/lyrics/generator-v2.tsx`, `src/components/refine/refine-lyrics.tsx` (**inferred**)
- Persists or queries application data — Evidence: `src/components/lyrics/create-page.tsx`, `src/components/lyrics/generator-v1.tsx`, `src/components/lyrics/music-style-select.tsx`, `src/components/rewrite/rewrite-inputs.tsx`, `src/components/ui/select.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/components/admin/logs-table.tsx`, `src/components/audio/analysis-result.tsx`, `src/components/audio/midi-uploader.tsx`, `src/components/auth/auth-guard.tsx`, `src/components/auth/reset-password-form.tsx` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Provides the Debug Credit Form UI component — Evidence: `src/components/admin/debug-credit-form.tsx` (**inferred**)
- Provides the Feedback Panel UI component — Evidence: `src/components/admin/feedback-panel.tsx` (**inferred**)
- Provides the Logs Table UI component — Evidence: `src/components/admin/logs-table.tsx` (**inferred**)
- Provides the Prompt Rules UI component — Evidence: `src/components/admin/prompt-rules.tsx` (**inferred**)
- Provides the Stats Breakdown UI component — Evidence: `src/components/admin/stats-breakdown.tsx` (**inferred**)
- Provides the Stats Grid UI component — Evidence: `src/components/admin/stats-grid.tsx` (**inferred**)
- Provides the Analysis Result UI component — Evidence: `src/components/audio/analysis-result.tsx` (**inferred**)
- Provides the Midi Uploader UI component — Evidence: `src/components/audio/midi-uploader.tsx` (**inferred**)
- Provides the Auth Guard UI component — Evidence: `src/components/auth/auth-guard.tsx` (**inferred**)
- Provides the Reset Password Form UI component — Evidence: `src/components/auth/reset-password-form.tsx` (**inferred**)
- Provides the Credit Confirm Modal UI component — Evidence: `src/components/credits/credit-confirm-modal.tsx` (**inferred**)
- Provides the Purchase Modal UI component — Evidence: `src/components/credits/purchase-modal.tsx` (**inferred**)
- Provides the Trial Popup UI component — Evidence: `src/components/credits/trial-popup.tsx` (**inferred**)
- Provides the Feedback Form Dialog UI component — Evidence: `src/components/feedback/feedback-form-dialog.tsx` (**inferred**)
- Provides the Feedback Modal UI component — Evidence: `src/components/feedback/feedback-modal.tsx` (**inferred**)
- Provides the Feedback Textarea UI component — Evidence: `src/components/feedback/feedback-textarea.tsx` (**inferred**)
- Provides the Lyrics Preview Card UI component — Evidence: `src/components/feedback/lyrics-preview-card.tsx` (**inferred**)
- Provides the Star Rating UI component — Evidence: `src/components/feedback/star-rating.tsx` (**inferred**)
- Provides the Song History Item UI component — Evidence: `src/components/history/song-history-item.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- TanStack Router — Evidence: `package.json`
- TanStack Start — Evidence: `package.json`
- Vite — Evidence: `package.json`
- PostgreSQL — Evidence: `src/hooks/use-credits.ts`
- Tailwind CSS — Evidence: `package.json`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
