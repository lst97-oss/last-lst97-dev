# stats

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: exelban/stats.
- Purpose: Source implementation indicates these responsibilities: processes icon cache; processes view.
- Observed capabilities: Defines the Module Type type or service; Processes icon cache; Defines the NS Button With Padding type or service
- Technology: Python, Swift

## Repository metadata
- **Repository:** exelban/stats
- **Visibility:** public
- **URL:** https://github.com/exelban/stats
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Source implementation indicates these responsibilities: processes icon cache; processes view.
Evidence: `Kit/constants.swift`, `Kit/extensions.swift`, `Kit/module/popup.swift` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Defines the Module Type type or service — Evidence: `Kit/constants.swift` (**inferred**)
- Processes icon cache — Evidence: `Kit/extensions.swift` (**inferred**)
- Defines the NS Button With Padding type or service — Evidence: `Kit/extensions.swift` (**inferred**)
- Provides the Text View UI component — Evidence: `Kit/extensions.swift` (**inferred**)
- Provides the Flipped Stack View UI component — Evidence: `Kit/extensions.swift` (**inferred**)
- Provides the Keyboard Shartcut View UI component — Evidence: `Kit/extensions.swift` (**inferred**)
- Defines the Popup Cache type or service — Evidence: `Kit/module/popup.swift` (**inferred**)
- Defines the Popup Window type or service — Evidence: `Kit/module/popup.swift` (**inferred**)
- Defines the Portal Header type or service — Evidence: `Kit/module/portal.swift` (**inferred**)
- Defines the widget t type or service — Evidence: `Kit/module/widget.swift` (**inferred**)
- Provides the S Widget UI component — Evidence: `Kit/module/widget.swift` (**inferred**)
- Defines the Menu Bar type or service — Evidence: `Kit/module/widget.swift` (**inferred**)
- Provides the Menu Bar View UI component — Evidence: `Kit/module/widget.swift` (**inferred**)
- Defines the DB type or service — Evidence: `Kit/plugins/DB.swift` (**inferred**)
- Defines the Log Level type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Log Option type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Log Writer type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Next Log type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Reachability type or service — Evidence: `Kit/plugins/Reachability.swift` (**inferred**)
- Defines the Store type or service — Evidence: `Kit/plugins/Store.swift` (**inferred**)
- Defines the Platform type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)
- Defines the device Type type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)
- Defines the core Type type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)
- Defines the System Kit type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)

## Tracked files
- **301 tracked files** in total
- Source: 120; tests: 3; documentation: 3; configuration: 39; assets/other: 136

## Repository structure
- Inspected 47 source files from the cloned repository (bounded for safety).
- `.github/` (5 tracked files)
- `Kit/` (61 tracked files)
- `LaunchAtLogin/` (3 tracked files)
- `Modules/` (90 tracked files)
- `SMC/` (8 tracked files)
- `Stats/` (115 tracked files)
- `Stats.xcodeproj/` (6 tracked files)
- `Tests/` (3 tracked files)
- `Widgets/` (4 tracked files)
- `Kit/constants.swift`
- `Kit/extensions.swift`
- `Kit/module/module.swift`
- `Kit/module/notifications.swift`
- `Kit/module/popup.swift`
- `Kit/module/portal.swift`
- `Kit/module/reader.swift`
- `Kit/module/widget.swift`
- `Kit/module/window.swift`
- `Kit/plugins/DB.swift`
- `Kit/plugins/Logger.swift`
- `Kit/plugins/Reachability.swift`
- `Kit/plugins/Repeater.swift`
- `Kit/plugins/Store.swift`
- `Kit/plugins/SystemKit.swift`
- `Kit/plugins/Updater.swift`
- `Kit/process.swift`
- `Kit/scripts/changelog.py`
- `Kit/scripts/i18n.py`
- `Kit/scripts/SMJobBlessUtil.py`

## Implementation and test evidence
- Defines the Module Type type or service — Evidence: `Kit/constants.swift` (**inferred**)
- Processes icon cache — Evidence: `Kit/extensions.swift` (**inferred**)
- Defines the NS Button With Padding type or service — Evidence: `Kit/extensions.swift` (**inferred**)
- Provides the Text View UI component — Evidence: `Kit/extensions.swift` (**inferred**)
- Provides the Flipped Stack View UI component — Evidence: `Kit/extensions.swift` (**inferred**)
- Provides the Keyboard Shartcut View UI component — Evidence: `Kit/extensions.swift` (**inferred**)
- Defines the Popup Cache type or service — Evidence: `Kit/module/popup.swift` (**inferred**)
- Defines the Popup Window type or service — Evidence: `Kit/module/popup.swift` (**inferred**)
- Defines the Portal Header type or service — Evidence: `Kit/module/portal.swift` (**inferred**)
- Defines the widget t type or service — Evidence: `Kit/module/widget.swift` (**inferred**)
- Provides the S Widget UI component — Evidence: `Kit/module/widget.swift` (**inferred**)
- Defines the Menu Bar type or service — Evidence: `Kit/module/widget.swift` (**inferred**)
- Provides the Menu Bar View UI component — Evidence: `Kit/module/widget.swift` (**inferred**)
- Defines the DB type or service — Evidence: `Kit/plugins/DB.swift` (**inferred**)
- Defines the Log Level type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Log Option type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Log Writer type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Next Log type or service — Evidence: `Kit/plugins/Logger.swift` (**inferred**)
- Defines the Reachability type or service — Evidence: `Kit/plugins/Reachability.swift` (**inferred**)
- Defines the Store type or service — Evidence: `Kit/plugins/Store.swift` (**inferred**)
- Defines the Platform type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)
- Defines the device Type type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)
- Defines the core Type type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)
- Defines the System Kit type or service — Evidence: `Kit/plugins/SystemKit.swift` (**inferred**)

## Frameworks and technology stack
- Python — Evidence: `Kit/scripts/SMJobBlessUtil.py`, `Kit/scripts/changelog.py`, `Kit/scripts/i18n.py`
- Swift — Evidence: `Kit/Widgets/BarChart.swift`, `Kit/Widgets/Battery.swift`, `Kit/Widgets/Dot.swift`, `Kit/Widgets/Label.swift`, `Kit/Widgets/LineChart.swift`, `Kit/Widgets/Memory.swift`, `Kit/Widgets/Mini.swift`, `Kit/Widgets/NetworkChart.swift`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `Tests/Info.plist`, `Tests/Kit.swift`, `Tests/RAM.swift`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.

## Nelson's contribution evidence
- 0 commits, 0 pull requests, 1 issues, 0 reviews
### Pull requests
No pull-request titles are available from the contribution API.
### Issues
- Possible incorrect PMU sensor current (CLOSED) — https://github.com/exelban/stats/issues/652
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
