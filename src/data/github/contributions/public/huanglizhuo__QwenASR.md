# QwenASR

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: huanglizhuo/QwenASR.
- Purpose: Source implementation indicates these responsibilities: implements ai or language-model features; finds model; downloads model; finds device by name; starts capture.
- Observed capabilities: Implements AI or language-model features; Finds model; Downloads model
- Technology: Rust, Python, Kotlin, Swift, Dart

## Repository metadata
- **Repository:** huanglizhuo/QwenASR
- **Visibility:** public
- **URL:** https://github.com/huanglizhuo/QwenASR
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Source implementation indicates these responsibilities: implements ai or language-model features; finds model; downloads model; finds device by name; starts capture.
Evidence: `crates/qwen-asr-cli/src/download.rs`, `crates/qwen-asr/src/align.rs`, `crates/qwen-asr/src/config.rs`, `crates/qwen-asr/src/context.rs`, `crates/qwen-asr/src/int8_sidecar.rs`, `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Implements AI or language-model features — Evidence: `crates/qwen-asr-cli/src/download.rs`, `crates/qwen-asr/src/align.rs`, `crates/qwen-asr/src/config.rs`, `crates/qwen-asr/src/context.rs`, `crates/qwen-asr/src/int8_sidecar.rs` (**inferred**)
- Finds model — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Downloads model — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Handles download command — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Defines the Model Info type or service — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Finds device by name — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Starts capture — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Defines the Audio Device type or service — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Defines the Capture Handle type or service — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Aligns result — Evidence: `crates/qwen-asr/src/align.rs` (**inferred**)
- Parses wav buffer — Evidence: `crates/qwen-asr/src/audio.rs` (**inferred**)
- Loads wav — Evidence: `crates/qwen-asr/src/audio.rs` (**inferred**)
- Reads pcm stdin — Evidence: `crates/qwen-asr/src/audio.rs` (**inferred**)
- Defines the Qwen Asr Engine type or service — Evidence: `crates/qwen-asr/src/c_api.rs` (**inferred**)
- Defines the Qwen Asr Stream State type or service — Evidence: `crates/qwen-asr/src/c_api.rs` (**inferred**)
- Defines the Qwen Config type or service — Evidence: `crates/qwen-asr/src/config.rs` (**inferred**)
- Detects info — Evidence: `crates/qwen-asr/src/config.rs` (**inferred**)
- Defines the Qwen Model type or service — Evidence: `crates/qwen-asr/src/context.rs` (**inferred**)
- Defines the Qwen Ctx type or service — Evidence: `crates/qwen-asr/src/context.rs` (**inferred**)
- Defines the Prompt Lookup type or service — Evidence: `crates/qwen-asr/src/draft.rs` (**inferred**)
- Defines the Enc Layer type or service — Evidence: `crates/qwen-asr/src/encoder.rs` (**inferred**)
- Defines the Encoder Buffers type or service — Evidence: `crates/qwen-asr/src/encoder.rs` (**inferred**)
- Defines the Encoder type or service — Evidence: `crates/qwen-asr/src/encoder.rs` (**inferred**)
- Opens valid — Evidence: `crates/qwen-asr/src/int8_sidecar.rs` (**inferred**)

## Tracked files
- **400 tracked files** in total
- Source: 103; tests: 20; documentation: 39; configuration: 85; assets/other: 153

## Repository structure
- Inspected 19 source files from the cloned repository (bounded for safety).
- `.cargo/` (1 tracked files)
- `.github/` (4 tracked files)
- `bench/` (65 tracked files)
- `crates/` (46 tracked files)
- `docs/` (13 tracked files)
- `flutter/` (196 tracked files)
- `librispeech-wer-bench/` (3 tracked files)
- `qwen-asr-metal/` (59 tracked files)
- `skills/` (3 tracked files)
- `crates/qwen-asr-cli/src/download.rs`
- `crates/qwen-asr-cli/src/live_capture.rs`
- `crates/qwen-asr/build.rs`
- `crates/qwen-asr/src/align.rs`
- `crates/qwen-asr/src/audio.rs`
- `crates/qwen-asr/src/c_api.rs`
- `crates/qwen-asr/src/config.rs`
- `crates/qwen-asr/src/context.rs`
- `crates/qwen-asr/src/draft.rs`
- `crates/qwen-asr/src/encoder.rs`
- `crates/qwen-asr/src/int8_sidecar.rs`
- `crates/qwen-asr/src/jni_api.rs`
- `crates/qwen-asr/src/kernels/avx.rs`
- `crates/qwen-asr/src/kernels/generic.rs`
- `crates/qwen-asr/src/kernels/pool.rs`
- `crates/qwen-asr/src/lib.rs`
- `crates/qwen-asr/src/output.rs`
- `crates/qwen-asr/src/safetensors.rs`
- `crates/qwen-asr/src/subtitle.rs`
- `bench/long/build_long_samples.py`

## Implementation and test evidence
- Implements AI or language-model features — Evidence: `crates/qwen-asr-cli/src/download.rs`, `crates/qwen-asr/src/align.rs`, `crates/qwen-asr/src/config.rs`, `crates/qwen-asr/src/context.rs`, `crates/qwen-asr/src/int8_sidecar.rs` (**inferred**)
- Finds model — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Downloads model — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Handles download command — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Defines the Model Info type or service — Evidence: `crates/qwen-asr-cli/src/download.rs` (**inferred**)
- Finds device by name — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Starts capture — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Defines the Audio Device type or service — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Defines the Capture Handle type or service — Evidence: `crates/qwen-asr-cli/src/live_capture.rs` (**inferred**)
- Aligns result — Evidence: `crates/qwen-asr/src/align.rs` (**inferred**)
- Parses wav buffer — Evidence: `crates/qwen-asr/src/audio.rs` (**inferred**)
- Loads wav — Evidence: `crates/qwen-asr/src/audio.rs` (**inferred**)
- Reads pcm stdin — Evidence: `crates/qwen-asr/src/audio.rs` (**inferred**)
- Defines the Qwen Asr Engine type or service — Evidence: `crates/qwen-asr/src/c_api.rs` (**inferred**)
- Defines the Qwen Asr Stream State type or service — Evidence: `crates/qwen-asr/src/c_api.rs` (**inferred**)
- Defines the Qwen Config type or service — Evidence: `crates/qwen-asr/src/config.rs` (**inferred**)
- Detects info — Evidence: `crates/qwen-asr/src/config.rs` (**inferred**)
- Defines the Qwen Model type or service — Evidence: `crates/qwen-asr/src/context.rs` (**inferred**)
- Defines the Qwen Ctx type or service — Evidence: `crates/qwen-asr/src/context.rs` (**inferred**)
- Defines the Prompt Lookup type or service — Evidence: `crates/qwen-asr/src/draft.rs` (**inferred**)
- Defines the Enc Layer type or service — Evidence: `crates/qwen-asr/src/encoder.rs` (**inferred**)
- Defines the Encoder Buffers type or service — Evidence: `crates/qwen-asr/src/encoder.rs` (**inferred**)
- Defines the Encoder type or service — Evidence: `crates/qwen-asr/src/encoder.rs` (**inferred**)
- Opens valid — Evidence: `crates/qwen-asr/src/int8_sidecar.rs` (**inferred**)

## Frameworks and technology stack
- Rust — Evidence: `crates/qwen-asr-cli/Cargo.toml`, `crates/qwen-asr/Cargo.toml`, `flutter/qwen_asr/rust/Cargo.toml`, `qwen-asr-metal/Cargo.toml`, `qwen-asr-metal/server/Cargo.toml`
- Python — Evidence: `bench/long/build_long_samples.py`, `bench/long/score_long.py`, `bench/render_benchmark_report.py`, `bench/run_mlx_audio.py`, `bench/wer.py`, `bench/wer_bootstrap.py`, `librispeech-wer-bench/librispeech_wer.py`, `librispeech-wer-bench/run_wer_range.py`
- Kotlin — Evidence: `flutter/qwen_asr/android/src/main/kotlin/com/clothpath/qwen_asr/QwenAsrPlugin.kt`, `flutter/qwen_asr/android/src/test/kotlin/com/clothpath/qwen_asr/QwenAsrPluginTest.kt`, `flutter/qwen_asr/example/android/app/src/main/kotlin/com/clothpath/qwen_asr_example/MainActivity.kt`
- Swift — Evidence: `flutter/qwen_asr/example/ios/Runner/AppDelegate.swift`, `flutter/qwen_asr/example/ios/RunnerTests/RunnerTests.swift`, `flutter/qwen_asr/example/macos/Flutter/GeneratedPluginRegistrant.swift`, `flutter/qwen_asr/example/macos/Runner/AppDelegate.swift`, `flutter/qwen_asr/example/macos/Runner/MainFlutterWindow.swift`, `flutter/qwen_asr/example/macos/RunnerTests/RunnerTests.swift`, `flutter/qwen_asr/ios/Classes/QwenAsrPlugin.swift`, `flutter/qwen_asr/macos/Classes/QwenAsrPlugin.swift`
- Dart — Evidence: `flutter/qwen_asr/cargokit/build_tool/bin/build_tool.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/build_tool.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/src/android_environment.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/src/artifacts_provider.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/src/build_cmake.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/src/build_gradle.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/src/build_pod.dart`, `flutter/qwen_asr/cargokit/build_tool/lib/src/build_tool.dart`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `crates/qwen-asr/tests/audio.rs`, `crates/qwen-asr/tests/common/mod.rs`, `crates/qwen-asr/tests/gemm_pooling_bench.rs`, `flutter/qwen_asr/android/src/test/kotlin/com/clothpath/qwen_asr/QwenAsrPluginTest.kt`, `flutter/qwen_asr/example/test/vad_live_pipeline_test.dart`, `flutter/qwen_asr/test/qwen_asr_api_test.dart`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.

## Nelson's contribution evidence
- 1 commits, 1 pull requests, 0 issues, 0 reviews
### Pull requests
- Fix ForcedAligner model download repository and checkpoint files (MERGED) — https://github.com/huanglizhuo/QwenASR/pull/53
### Issues
No issue titles are available from the contribution API.
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
