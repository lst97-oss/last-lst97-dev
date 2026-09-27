# CantoCap

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/CantoCap.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; implements ai or language-model features; implements command-line behavior; runs command.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Implements AI or language-model features
- Technology: Python, Go, TypeScript, JavaScript
- Related topics: cantonese, captions, electorn, hongkong, openai-whisper, subtitles, vite, hk

## Repository metadata
- **Repository:** lst97/CantoCap
- **Visibility:** public
- **URL:** https://github.com/lst97/CantoCap
- **Default branch:** dev
- **Last updated:** 2026-06-22T20:53:03Z
- **Primary language:** TypeScript
- **License:** Apache License 2.0
- **Stars / forks:** 1 / 0
- **Topics:** `cantonese`, `captions`, `electorn`, `hongkong`, `openai-whisper`, `subtitles`, `vite`, `hk`, `hong-kong`

### GitHub language breakdown
- TypeScript (1,699,949 bytes)
- Python (1,392,413 bytes)
- CSS (34,662 bytes)
- JavaScript (18,461 bytes)
- Makefile (6,028 bytes)
- HTML (959 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; implements ai or language-model features; implements command-line behavior; runs command.
Evidence: `engine/src/infrastructure/services/whisperx_service.py`, `gui/electron.vite.config.js`, `engine/src/application/services/media_file_validator.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/domain/entities/media_file.py`, `engine/src/infrastructure/repositories/ffmpeg_audio_repository.py`, `engine/src/infrastructure/repositories/whisper_transcription_repository.py`, `engine/src/application/commands/generate_subtitles_command.py`, `engine/src/application/services/subtitle_validation_service.py`, `engine/src/domain/entities/transcription.py`, `engine/src/domain/repositories/transcription_repository.py`, `engine/run_tests.py`, `engine/setup_env.py` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `engine/src/infrastructure/services/whisperx_service.py`, `gui/electron.vite.config.js` (**inferred**)
- Validates structured input or configuration — Evidence: `engine/src/application/services/media_file_validator.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/domain/entities/media_file.py`, `engine/src/infrastructure/repositories/ffmpeg_audio_repository.py`, `engine/src/infrastructure/repositories/whisper_transcription_repository.py` (**inferred**)
- Implements AI or language-model features — Evidence: `engine/src/application/commands/generate_subtitles_command.py`, `engine/src/application/services/subtitle_validation_service.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/domain/entities/transcription.py`, `engine/src/domain/repositories/transcription_repository.py` (**inferred**)
- Implements command-line behavior — Evidence: `engine/run_tests.py`, `engine/setup_env.py` (**inferred**)
- Runs command — Evidence: `engine/run_tests.py` (**inferred**)
- Gets ffmpeg dir — Evidence: `engine/setup_env.py` (**inferred**)
- Creates virtual environment — Evidence: `engine/setup_env.py` (**inferred**)
- Gets venv python — Evidence: `engine/setup_env.py` (**inferred**)
- Gets venv pip — Evidence: `engine/setup_env.py` (**inferred**)
- Gets system info — Evidence: `engine/setup_env.py` (**inferred**)
- Downloads ffmpeg windows — Evidence: `engine/setup_env.py` (**inferred**)
- Downloads ffmpeg linux — Evidence: `engine/setup_env.py` (**inferred**)
- Gets input file path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets output file path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets default output path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets effective output path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets charset — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets language style — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets translation language — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Validates paths — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Generates subtitles command — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Validates basic requirements — Evidence: `engine/src/application/services/media_file_validator.py` (**inferred**)
- Validates file size — Evidence: `engine/src/application/services/media_file_validator.py` (**inferred**)
- Validates permissions — Evidence: `engine/src/application/services/media_file_validator.py` (**inferred**)

## Tracked files
- **339 tracked files** in total
- Source: 253; tests: 43; documentation: 14; configuration: 21; assets/other: 8

## Repository structure
- Inspected 74 source files from the cloned repository (bounded for safety).
- `.claude/` (1 tracked files)
- `.vscode/` (1 tracked files)
- `engine/` (142 tracked files)
- `gui/` (193 tracked files)
- `engine/run_tests.py`
- `engine/setup_env.py`
- `engine/src/__init__.py`
- `engine/src/__main__.py`
- `engine/src/application/__init__.py`
- `engine/src/application/commands/__init__.py`
- `engine/src/application/commands/generate_subtitles_command.py`
- `engine/src/application/services/__init__.py`
- `engine/src/application/services/media_file_validator.py`
- `engine/src/application/services/subtitle_validation_service.py`
- `engine/src/application/services/terminology_config_service.py`
- `engine/src/application/use_cases/__init__.py`
- `engine/src/domain/__init__.py`
- `engine/src/domain/entities/__init__.py`
- `engine/src/domain/entities/audio_stream.py`
- `engine/src/domain/entities/media_file.py`
- `engine/src/domain/entities/music.py`
- `engine/src/domain/entities/speaker.py`
- `engine/src/domain/entities/subtitle.py`
- `engine/src/domain/entities/transcription.py`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `engine/src/infrastructure/services/whisperx_service.py`, `gui/electron.vite.config.js` (**inferred**)
- Validates structured input or configuration — Evidence: `engine/src/application/services/media_file_validator.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/domain/entities/media_file.py`, `engine/src/infrastructure/repositories/ffmpeg_audio_repository.py`, `engine/src/infrastructure/repositories/whisper_transcription_repository.py` (**inferred**)
- Implements AI or language-model features — Evidence: `engine/src/application/commands/generate_subtitles_command.py`, `engine/src/application/services/subtitle_validation_service.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/domain/entities/transcription.py`, `engine/src/domain/repositories/transcription_repository.py` (**inferred**)
- Implements command-line behavior — Evidence: `engine/run_tests.py`, `engine/setup_env.py` (**inferred**)
- Runs command — Evidence: `engine/run_tests.py` (**inferred**)
- Gets ffmpeg dir — Evidence: `engine/setup_env.py` (**inferred**)
- Creates virtual environment — Evidence: `engine/setup_env.py` (**inferred**)
- Gets venv python — Evidence: `engine/setup_env.py` (**inferred**)
- Gets venv pip — Evidence: `engine/setup_env.py` (**inferred**)
- Gets system info — Evidence: `engine/setup_env.py` (**inferred**)
- Downloads ffmpeg windows — Evidence: `engine/setup_env.py` (**inferred**)
- Downloads ffmpeg linux — Evidence: `engine/setup_env.py` (**inferred**)
- Gets input file path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets output file path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets default output path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets effective output path — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets charset — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets language style — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Gets translation language — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Validates paths — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Generates subtitles command — Evidence: `engine/src/application/commands/generate_subtitles_command.py` (**inferred**)
- Validates basic requirements — Evidence: `engine/src/application/services/media_file_validator.py` (**inferred**)
- Validates file size — Evidence: `engine/src/application/services/media_file_validator.py` (**inferred**)
- Validates permissions — Evidence: `engine/src/application/services/media_file_validator.py` (**inferred**)

## Frameworks and technology stack
- Python — Evidence: `engine/pyproject.toml`
- Go — Evidence: `engine/pyproject.toml`
- TypeScript — Evidence: `gui/src/main/config/AppSettingsService.ts`, `gui/src/main/config/AppStateService.ts`, `gui/src/main/config/ExportConfigService.ts`, `gui/src/main/config/GroupConfigService.ts`, `gui/src/main/config/WorkflowStateService.ts`, `gui/src/main/config/WorkspaceConfigService.ts`, `gui/src/main/dependency-checker.ts`, `gui/src/main/index.ts`
- JavaScript — Evidence: `gui/.eslintrc.cjs`, `gui/electron.vite.config.js`, `gui/eslint.config.js`, `gui/jest.config.cjs`, `gui/postcss.config.js`, `gui/setup.js`

## Design and architecture patterns
- domain-driven design (**inferred**) — Evidence: `engine/src/domain/__init__.py`, `engine/src/domain/entities/__init__.py`, `engine/src/domain/entities/audio_stream.py`
- layered architecture (**inferred**) — Evidence: `engine/src/domain/__init__.py`, `engine/src/domain/entities/__init__.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/application/__init__.py`, `engine/src/application/commands/__init__.py`, `engine/src/application/commands/generate_subtitles_command.py`, `engine/src/infrastructure/__init__.py`, `engine/src/infrastructure/config/transcription_prompts.json`, `engine/src/infrastructure/error_handling.py`
- hexagonal architecture (**inferred**) — Evidence: `engine/src/domain/__init__.py`, `engine/src/domain/entities/__init__.py`, `engine/src/domain/entities/audio_stream.py`, `engine/src/application/__init__.py`, `engine/src/application/commands/__init__.py`, `engine/src/application/commands/generate_subtitles_command.py`, `engine/src/infrastructure/__init__.py`, `engine/src/infrastructure/config/transcription_prompts.json`, `engine/src/infrastructure/error_handling.py`
- test-driven development evidence (**inferred**) — Evidence: `engine/tests/__init__.py`, `engine/tests/conftest.py`, `engine/tests/e2e/__init__.py`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- README is unavailable; source-based findings do not depend on it.
